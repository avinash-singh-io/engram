/**
 * Agent adapters — the contract, rendered into every file an agent actually reads.
 *
 * **[ADR-0017](../../specs/decisions/0017-agent-contract-files-full.md) decided this
 * and the v2 rewrite lost it.** ADR-0011 converged every agent on `AGENTS.md`;
 * ADR-0017 amended it with the reason that matters:
 *
 * > Each agent loads only its **own** native instructions file — Claude Code reads
 * > `CLAUDE.md`; Codex and other agents read `AGENTS.md`. An agent that loads
 * > `CLAUDE.md` does **not** reliably go and read a *referenced* `AGENTS.md`. So a
 * > pointer means the agent never actually gets the contract.
 *
 * Phase 15 shipped pointers anyway, citing ADR-0011 without noticing that ADR-0017
 * amends it. A pointer looks tidy and fails silently: `CLAUDE.md` said "read
 * AGENTS.md", Claude Code often did not, and the contract stayed invisible to the
 * agent it was written for.
 *
 * So the contract is rendered **in full** into each agent's own file. The
 * duplication is deliberate and safe because there is exactly one source — the
 * generator in `agents-md.ts` — and every copy is rewritten by `reindex`. Nothing
 * is hand-maintained, so nothing can drift.
 *
 * **Adding an agent is still adding a descriptor.** No code, no template.
 */

import type { FileStore } from '../core/ports.js';
import { SKILL_FILE } from '../policy/skill-schema.js';

export interface AgentDescriptor {
  /** How the agent is referred to. */
  name: string;
  /**
   * The file this agent reads, relative to the vault root — omitted when the
   * agent reads the canonical `AGENTS.md` natively and needs no copy of its own
   * (codex-shaped). An absent `contractFile` means `writeContracts` renders
   * nothing for this agent; the shared file already carries the contract.
   */
  contractFile?: string;
  /** Why this agent does or does not need its own copy of the contract. */
  why: string;
  /**
   * Where this agent reads **project-scoped** skills, when engram has verified it.
   *
   * Optional on purpose. ADR-0044 refused to write to `.agents/skills/` because it
   * could not be verified as read, and that principle applies to every target: an
   * agent gets a skills directory here only once someone has watched a skill load
   * from it. Absent means engram renders no skills for that agent — which is honest,
   * and strictly better than writing files into a directory nobody reads.
   */
  skills?: SkillTarget;
  /**
   * Where this agent reads **user-invoked commands**, when engram has verified it.
   *
   * Skills are the agent-invoked surface everywhere; some hosts also have a
   * user-invoked one (`/name`). Same ADR-0044 rule as skills: a directory gets
   * listed here only once someone has watched a command load from it.
   */
  commands?: CommandTarget;
}

/**
 * A directory an agent reads **commands** from, and what engram writes there.
 *
 * Commands are always managed-prefixed (`engram-<operation>.md`) because engram
 * has no user-authored command source today — unlike skills, there is no
 * `engram/skills/` equivalent to render from, so every file here is generated
 * from the operation registry alone.
 */
export interface CommandTarget {
  /** Vault-relative directory. Project-scoped — never a home directory (ADR-0044). */
  dir: string;
  /**
   * How this was verified, and when — same evidence-beside-claim rule as
   * `SkillTarget.verified`.
   */
  verified: string;
  /** Host constraints the human needs to know. Rendered into the contract. */
  caveats: string[];
}

/**
 * A directory an agent reads skills from, and what the host does about names.
 *
 * The interesting field is `plugin`. Claude Code loads any folder under its skills
 * directory carrying a `.claude-plugin/plugin.json` as a plugin, and namespaces
 * everything inside it as `/<plugin>:<skill>` — so engram gets separation from the
 * user's own skills for free, without inventing a prefix. Hosts with no plugin
 * concept fall back to an `engram-` prefix on engram's own skills, which keeps the
 * same *meaning* everywhere: if it carries engram's mark, engram wrote it.
 */
export interface SkillTarget {
  /** Vault-relative directory. Project-scoped — never a home directory (ADR-0044). */
  dir: string;
  /**
   * Plugin name engram's own skills are grouped under, or `null` when this host has
   * no plugin concept and engram must prefix instead.
   */
  plugin: string | null;
  /**
   * How this was verified, and when.
   *
   * A descriptor is a promise that files written here are read. Recording the
   * evidence beside the claim is what stops the next person adding a plausible path
   * from a blog post — which is exactly what ADR-0044 refused to do.
   */
  verified: string;
  /** Host constraints the human needs to know. Rendered into the contract. */
  caveats: string[];
}

/** The plugin name engram's own skills are grouped under where a host supports one. */
export const ENGRAM_PLUGIN = 'engram';

/** Only `plugin.json` goes in here. Skills live at the plugin root, not inside it. */
export const PLUGIN_MANIFEST_DIR = '.claude-plugin';
export const PLUGIN_MANIFEST = 'plugin.json';

/** Skills as `<name>/SKILL.md` at the plugin root. `commands/` is the legacy form. */
export const PLUGIN_SKILLS_DIR = 'skills';

/**
 * Agents that read a filename other than `AGENTS.md`.
 *
 * Codex and anything following the AGENTS.md convention are deliberately absent:
 * they already read the canonical file, and a second copy for them would be a file
 * that exists only to be maintained.
 */
export const AGENTS: AgentDescriptor[] = [
  {
    name: 'claude',
    contractFile: '/CLAUDE.md',
    why: 'Claude Code reads CLAUDE.md, and nothing else, at session start',
    skills: {
      dir: '/.claude/skills',
      plugin: ENGRAM_PLUGIN,
      verified:
        'Claude Code 2.1.235, 2026-08-23: `claude plugin validate` passed on this ' +
        'exact structure, and a session loaded it as `engram:probe` alongside an ' +
        'unprefixed project skill. See phase-17 evidence/t0-1-plugin-mechanism.md',
      caveats: [
        'Project-scoped skills load only after you accept the workspace trust ' +
          'dialog once. Engram uses project scope deliberately: the personal ' +
          'directory has no such prompt but is machine-wide, and would leak this ' +
          "vault's skills into every unrelated project you open.",
        'They load only from the directory Claude Code starts in — this does not ' +
          'walk up. Start your session at the vault root.',
      ],
    },
  },
  {
    name: 'antigravity',
    contractFile: '/.antigravity/AGENTS.md',
    why: 'Antigravity reads instructions from its own directory',
    skills: {
      dir: '/.antigravity/skills',
      plugin: null,
      verified:
        'Antigravity documentation, 2026-08-23: project skills live in ' +
        '`.antigravity/skills/` at the repository root and load automatically. ' +
        'No plugin concept, so engram prefixes its own.',
      caveats: [],
    },
  },
  {
    name: 'gemini',
    contractFile: '/GEMINI.md',
    why: 'the Gemini CLI reads GEMINI.md',
    skills: {
      dir: '/.gemini/skills',
      plugin: null,
      verified:
        'Gemini CLI documentation, 2026-08-23: the workspace tier is ' +
        '`.gemini/skills/`, shared through version control. No plugin concept, ' +
        "so engram prefixes its own.",
      caveats: [
        'Gemini CLI also reads `.agents/skills/`, which takes precedence over ' +
          '`.gemini/skills/`. Engram writes only the agent-specific path, so a ' +
          "skill you put in `.agents/skills/` wins over engram's copy.",
      ],
    },
  },
  {
    name: 'opencode',
    why: 'OpenCode reads the project-root AGENTS.md natively — no separate copy',
    skills: {
      dir: '/.opencode/skills',
      plugin: null,
      verified:
        'OpenCode 1.18.21, 2026-08-24 — pending full manual session (phase-19 ' +
        'G4): headless discovery confirmed in evidence/t0-discovery-probe.md, ' +
        'where `.opencode/skills/probe/SKILL.md` was listed and loadable.',
      caveats: [
        'Skills are agent-invoked here — the native skill tool, no slash form. ' +
          'For explicit invocation engram also renders commands to ' +
          '`.opencode/commands/` (`/engram-capture`, …).',
        'Setting OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1 disables the Claude- ' +
          "compatible fallback paths — which is exactly why engram renders this " +
          'native copy instead of relying on `.claude/skills/`.',
        'Skills load from the directory opencode starts in (walked up to the git ' +
          'worktree root). Start your session at the vault root.',
      ],
    },
    commands: {
      dir: '/.opencode/commands',
      verified:
        'OpenCode 1.18.21 documentation, 2026-08-24; file mechanics grounded in ' +
        'evidence/t0-discovery-probe.md — TUI execution itself is confirmed by ' +
        'hand at phase-19 G4 (headless run cannot execute commands).',
      caveats: [],
    },
  },
];

/** Every agent engram renders skills for. Derived, so a descriptor is the only edit. */
export function skillTargets(agents: AgentDescriptor[] = AGENTS): (AgentDescriptor & {
  skills: SkillTarget;
})[] {
  return agents.filter(
    (a): a is AgentDescriptor & { skills: SkillTarget } => a.skills !== undefined,
  );
}

/** Every agent engram renders commands for. Derived, same rule as `skillTargets`. */
export function commandTargets(agents: AgentDescriptor[] = AGENTS): (AgentDescriptor & {
  commands: CommandTarget;
})[] {
  return agents.filter(
    (a): a is AgentDescriptor & { commands: CommandTarget } => a.commands !== undefined,
  );
}

/**
 * Where one rendered command lives.
 *
 * Always managed-prefixed — commands have no user-authored source today, so
 * there is no unprefixed case and no `managed` flag to get wrong. The prefix
 * also keeps `/engram-capture` from ever colliding with a built-in or with the
 * user's own command names (opencode lets custom commands override built-ins).
 */
export function commandPath(target: CommandTarget, name: string): string {
  return `${target.dir}/engram-${name}.md`;
}

/**
 * The name a skill is invoked by in one host.
 *
 * Three cases, and the rule underneath them is one sentence: **if it carries
 * engram's mark, engram wrote it.** Only the separator changes — `:` where the host
 * namespaces for us, `-` where it does not.
 */
export function invocationName(target: SkillTarget, name: string, managed: boolean): string {
  if (!managed) return `/${name}`;
  return target.plugin === null ? `/engram-${name}` : `/${target.plugin}:${name}`;
}

/** Where a skill's `SKILL.md` is written in one host. Mirrors `invocationName`. */
export function skillPath(target: SkillTarget, name: string, managed: boolean): string {
  if (!managed) return `${target.dir}/${name}/${SKILL_FILE}`;
  return target.plugin === null
    ? `${target.dir}/engram-${name}/${SKILL_FILE}`
    : `${target.dir}/${target.plugin}/${PLUGIN_SKILLS_DIR}/${name}/${SKILL_FILE}`;
}

/**
 * Is this path inside any agent's skills directory?
 *
 * **Derived from the registry, never restated** — the same reason `isContractFile`
 * exists. A rendered `SKILL.md` that the walker reads back becomes a knowledge node,
 * which broke `reindex` idempotence when `GEMINI.md` did it and again when
 * `STRUCTURE.md` did. Adding an agent must not be able to re-arm that trap.
 */
export function isSkillPath(path: string, agents: AgentDescriptor[] = AGENTS): boolean {
  return skillTargets(agents).some((a) => path.startsWith(`${a.skills.dir}/`));
}

/**
 * Is this path inside any agent's commands directory?
 *
 * Same registry derivation as `isSkillPath`, same reason: a rendered command file
 * read back by the walker would be BUG-008's shape a fourth time over.
 */
export function isCommandPath(path: string, agents: AgentDescriptor[] = AGENTS): boolean {
  return commandTargets(agents).some((a) => path.startsWith(`${a.commands.dir}/`));
}

/**
 * The fences around engram's region of a file it does not own.
 *
 * A vault's `CLAUDE.md` may already carry instructions engram knows nothing about,
 * and overwriting it would destroy more than it explains. But leaving it alone
 * entirely means the agent never gets the contract — the exact failure ADR-0017
 * names. A delimited region is the only option that satisfies both: **engram owns
 * what is between the markers and nothing else.**
 *
 * This is the pattern this project's own tooling already uses on this repo's
 * `CLAUDE.md`, so it is borrowed rather than invented.
 */
export const BEGIN = '<!-- BEGIN ENGRAM CONTRACT — generated by `engram reindex`. Do not edit. -->';
export const END = '<!-- END ENGRAM CONTRACT -->';

/**
 * Splice engram's region into a file, preserving everything outside it.
 *
 * Three cases: the markers are present and the region between them is replaced; the
 * file exists without markers and the block is **appended** below what is already
 * there; the file does not exist and the block is the whole file.
 */
export function spliceContract(existing: string | null, contract: string): string {
  const block = `${BEGIN}\n\n${contract.trimEnd()}\n\n${END}\n`;

  if (existing === null || existing.trim() === '') return block;

  const start = existing.indexOf(BEGIN);
  const end = existing.indexOf(END);

  if (start !== -1 && end !== -1 && end > start) {
    const before = existing.slice(0, start);
    const after = existing.slice(end + END.length);
    // The user's text on both sides survives byte for byte.
    return `${before}${block.trimEnd()}${after.startsWith('\n') ? after : `\n${after}`}\n`.replace(
      /\n+$/,
      '\n',
    );
  }

  // Their file, their content first. Appending rather than prepending means a
  // human opening CLAUDE.md still sees what they wrote at the top.
  return `${existing.trimEnd()}\n\n${block}`;
}

/**
 * Is this path a generated contract file?
 *
 * **Derived from the registry, never restated.** `core/paths.ts` cannot know
 * this — it may import only `core/` — and its basename-matching `RESERVED_FILES`
 * happened to cover `AGENTS.md` and `CLAUDE.md` while silently missing
 * `GEMINI.md`. The consequence was not cosmetic: `reindex` picked its own output
 * up as a knowledge node on the *next* run, so run 1 and run 2 disagreed and
 * ADR-0029's idempotence guarantee quietly failed.
 *
 * Adding an agent must not be able to re-arm that trap, so this asks the
 * registry rather than a parallel list.
 */
export function isContractFile(path: string, agents: AgentDescriptor[] = AGENTS): boolean {
  return agents.some((a) => a.contractFile === path);
}

export interface AdapterResult {
  /** Files engram wrote in full — it owns all of them. */
  written: string[];
  /** Files where the user's own content was preserved around engram's region. */
  merged: string[];
}

/**
 * Render the contract into every agent's file.
 *
 * Called from `reindex`, not `init`: ADR-0017's consequence is that regenerating
 * keeps every copy in sync from the single source, and a file written once at `init`
 * would go stale the moment a guardrail changed.
 */
export async function writeContracts(
  files: FileStore,
  contract: string,
  agents: AgentDescriptor[] = AGENTS,
): Promise<AdapterResult> {
  const written: string[] = [];
  const merged: string[] = [];

  // Agents without a contractFile read the canonical AGENTS.md natively — the
  // contract is already there, and a second copy would be a file that exists
  // only to be maintained.
  for (const agent of agents.filter((a) => a.contractFile !== undefined)) {
    const target = agent.contractFile!;
    const existing = await files.read(target);
    const hadOwnContent =
      existing !== null && existing.trim() !== '' && !existing.trimStart().startsWith(BEGIN);

    await files.write(target, spliceContract(existing, contract));
    (hadOwnContent ? merged : written).push(target);
  }

  return { written: written.sort(), merged: merged.sort() };
}
