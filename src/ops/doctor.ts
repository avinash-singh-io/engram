/**
 * `doctor` — health, integrity, and the detective half of the guardrail story.
 *
 * **Read-only in Phase 9.** ADR-0028 makes not-rewriting-links engram's default
 * posture; `--fix` is its single exception and gets its own deliberate pass.
 *
 * §7 of the architecture is the reason this command matters: engram mediates only
 * two of the four write paths, because Obsidian and any agent with a shell write
 * files directly. A rule enforceable only at the write gate is therefore advisory.
 * Every closed relation was required in Phase 8 to carry a **detective form** —
 * this is where those get run.
 */

import { inspect, type Finding } from '../core/graph.js';
import type { Edge, Node } from '../core/model.js';
import { isDerived } from '../core/paths.js';
import type { Detector, FileStore } from '../core/ports.js';
import { getRelation, relationKinds } from '../core/relations.js';
import { detectAll, guardrailNames, type GuardrailConfig } from '../policy/guardrails.js';
import { CONFIG_PATH } from '../policy/config.js';
import { linkSettingWarnings, OBSIDIAN_APP_JSON, readLinkSettings } from './obsidian-settings.js';
import { needsUpgrade, planUpgrade, versionSkew } from './upgrade.js';
import { auditSkills } from '../surface/render-skills.js';
import { discoverSkills, SKILLS_DIR } from '../policy/skills.js';
import { AGENTS, isCommandPath, skillTargets, commandTargets } from '../surface/adapters.js';
import { walk, type WalkFinding } from './walk.js';
import { extractMarkdownLinks } from '../format/links.js';
import { parseFrontmatter, readNode } from '../format/registry.js';
import { subsetNames } from '../format/subset.js';

export interface DoctorReport {
  /** Nothing here fails the command — ADR-0021 is explicit these are not errors. */
  warnings: string[];
  /** Only these make `doctor` exit non-zero. */
  failures: string[];
  /** The detective form of every registered relation, run and reported by name. */
  detectives: { relation: string; check: string; hits: string[] }[];
  /**
   * The detective half of every enabled guardrail.
   *
   * This is the half that catches writes the gate never saw — Obsidian edits and
   * agent shell writes (v2-overview §1). Without it, every guardrail would be
   * advisory rather than enforced.
   */
  guardrails: { rule: string; prevents: string; hits: string[] }[];
  counts: { nodes: number; edges: number };
  /**
   * One row per registered agent — what engram renders for it and whether the
   * paths were verified. Phase 19's premise was a surface that silently did not
   * exist for one host; this section is what makes such a gap visible instead of
   * something a person finds out by opening a session.
   */
  surfaces: {
    agent: string;
    contract: string;
    skills: number;
    commands: number;
    verified: string;
  }[];
}

/** Rules in force when a vault declares none. */
export const DEFAULT_GUARDRAILS: GuardrailConfig = { enabled: guardrailNames() };

const say = (f: Finding | WalkFinding): string => `[${f.code}] ${f.message}`;

export async function doctor(
  files: FileStore,
  detect: Detector,
  guardrailConfig: GuardrailConfig = DEFAULT_GUARDRAILS,
): Promise<DoctorReport> {
  const warnings: string[] = [];
  const failures: string[] = [];
  const surfaces: DoctorReport['surfaces'] = [];

  const walked = await walk(files);
  for (const f of walked.findings) warnings.push(say(f));

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  for (const path of walked.paths) {
    const raw = await files.read(path);
    if (raw === null) continue;
    const result = readNode(raw, path);
    nodes.push(result.node);
    edges.push(...result.edges);
    for (const w of result.warnings) warnings.push(`[read] ${path}: ${w}`);

    // The remedy, not just the symptom. BUG-011's original message said the
    // frontmatter "did not parse" and stopped there — it named no key, said nothing
    // about what engram *does* read, and did not mention that identity had just been
    // traded for a path. A health check that reports a problem without a next action
    // is only half a check.
    const parsed = parseFrontmatter(raw);
    for (const e of parsed.keyErrors) {
      warnings.push(
        `[frontmatter] ${path} line ${e.line}: ${e.reason}. ` +
          `engram reads ${subsetNames().length} YAML constructs including block and flow ` +
          `sequences — see STRUCTURE.md, or rewrite this key in a form it lists.`,
      );
    }

    // Identity lost **because of** a parse failure, which is a different problem from
    // a note that never had an `id` — and a much worse one. ADR-0021: the slug is the
    // identity and the path is only an address, so a note reduced to path-as-identity
    // breaks every relation pointing at it the moment it moves.
    const lostId = parsed.yamlError !== undefined || parsed.keyErrors.some((e) => e.key === 'id');
    if (result.node.id === path && lostId) {
      // A **warning**, not a failure. ADR-0021 is explicit that a missing slug is
      // "a warning and a fallback, never an error", and a doctor that exits 1 because
      // one file in a vault has an odd property is a doctor people stop running.
      //
      // It is worded to carry its own severity instead. Raising it to a failure would
      // be a real argument — this is data integrity, not tidiness — but it amends
      // ADR-0021 and belongs in an ADR rather than in a health check.
      warnings.push(
        `[identity-lost] ${path} has no readable \`id\`, so it is identified by its path. ` +
          `This is not cosmetic: moving or renaming it will break every relation ` +
          `pointing at it (ADR-0021). Fix the frontmatter above, then re-run.`,
      );
    }
  }

  for (const f of inspect(nodes, edges)) warnings.push(say(f));

  // ENH-002, deferred from BUG-001. Frontmatter relations get a detective each; links
  // in the **body** had none, so a link to a note that was renamed or never existed
  // read as a clean bill of health. Obsidian owns link rewriting (ADR-0028), so this
  // reports and never repairs — but reporting nothing was not the same as staying out
  // of the way.
  const present = new Set(await files.list());
  for (const path of walked.paths) {
    const raw = await files.read(path);
    if (raw === null) continue;
    for (const link of extractMarkdownLinks(raw)) {
      if (link.target === '' || /^[a-z][a-z0-9+.-]*:/i.test(link.target)) continue;
      if (link.target.startsWith('#')) continue;
      const target = link.target.split('#')[0]!;
      if (target === '') continue;
      const abs = target.startsWith('/')
        ? target
        : `${path.slice(0, path.lastIndexOf('/'))}/${target}`.replace(/\/\.\//g, '/');
      const candidates = [abs, `${abs}.md`, target.startsWith('/') ? target : `/${target}`];
      if (!candidates.some((c) => present.has(c) || present.has(`${c}.md`))) {
        warnings.push(
          `[link-unresolved] ${path}: [${link.text}](${link.target}) resolves to nothing. ` +
            `Obsidian owns link rewriting (ADR-0028), so engram reports this rather than ` +
            `repairing it — rename the target back, or fix the link.`,
        );
      }
    }
  }

  // A reserved path holding content no generator would write. The walker excludes
  // reserved paths from authored content, so without this check a hand-written
  // index.md would be invisible until reindex silently overwrote it.
  for (const path of await files.list()) {
    if (!isDerived(path)) continue;
    const raw = await files.read(path);
    if (raw !== null && raw.trim() !== '' && !raw.includes('GENERATED by engram reindex')) {
      warnings.push(
        `[derived-not-generated] ${path} is a derived path but was not written by engram. ` +
          `On conflict the rule is regenerate, never merge (ADR-0029) — run \`engram reindex\`.`,
      );
    }
  }

  // Skills reach an agent only through the copies in its own directory, so a source
  // skill that was never rendered is a skill nobody can invoke — the failure FEAT-009
  // reported, in a form engram can actually detect.
  //
  // Skipped entirely for a directory engram has never initialised, on the same
  // reasoning `planUpgrade` uses: warnings are only worth reading if every one of
  // them is actionable, and "your skills are not rendered" is noise in a folder that
  // is not a vault.
  const initialised = await files.exists(CONFIG_PATH);
  if (initialised) {
    const discovered = await discoverSkills(files);
    for (const e of discovered.errors) warnings.push(`[skill] ${e.name}: ${e.reason}`);

    const audit = await auditSkills(files, discovered.skills);
    // Skills and commands share the audit but not their remedies: a skill's edit
    // belongs in `engram/skills/`, a command has no user-editable source at all.
    // One line per condition *per kind*, still never per file.
    const byKind = (paths: string[]) => ({
      skills: paths.filter((p) => !isCommandPath(p)),
      commands: paths.filter((p) => isCommandPath(p)),
    });
    {
      const k = byKind(audit.unrendered);
      if (k.skills.length > 0) {
        warnings.push(
          `[skill-unrendered] ${k.skills.length} rendered skill file(s) are missing from ` +
            `agent directories, so those skills cannot be invoked. Run \`engram reindex\`. ` +
            `First: ${k.skills[0]}`,
        );
      }
      if (k.commands.length > 0) {
        warnings.push(
          `[command-unrendered] ${k.commands.length} rendered command file(s) are missing ` +
            `from agent directories, so /engram-* cannot be run there. Run ` +
            `\`engram reindex\`. First: ${k.commands[0]}`,
        );
      }
    }
    {
      const k = byKind(audit.edited);
      // The one warning that has to name the source file. "Do not edit" without an
      // alternative just gets worked around, and this is the moment someone finds out
      // their change is about to disappear.
      if (k.skills.length > 0) {
        warnings.push(
          `[skill-edited] ${k.skills.length} rendered skill file(s) have been changed ` +
            `by hand and will be overwritten by the next \`engram reindex\`. Rendered ` +
            `skills are derived state (ADR-0029) — to keep a change, put it in ` +
            `${SKILLS_DIR}/<name>/SKILL.md instead: ${k.skills.join(', ')}`,
        );
      }
      if (k.commands.length > 0) {
        warnings.push(
          `[command-edited] ${k.commands.length} rendered command file(s) have been changed ` +
            `by hand and will be overwritten by the next \`engram reindex\`. Commands are ` +
            `generated from the operation registry and have no user-editable source — ` +
            `regenerate rather than edit (ADR-0029): ${k.commands.join(', ')}`,
        );
      }
    }
    if (audit.foreign.length > 0) {
      warnings.push(
        `[not-ours] ${audit.foreign.length} file(s) where engram would render have no ` +
          `provenance marker, so engram will never overwrite them — and is therefore ` +
          `not rendering its own of that name. If you meant to take them over, this is ` +
          `working as intended: ${audit.foreign.join(', ')}`,
      );
    }
    {
      const k = byKind(audit.stale);
      for (const [kind, paths] of [
        ['skill', k.skills],
        ['command', k.commands],
      ] as const) {
        if (paths.length === 0) continue;
        // Every path is listed rather than counted, because each one needs removing
        // individually. Engram will not do it: the FileStore port has four methods and
        // removal is deliberately not one — the same stance as `upgrade`, which copies
        // and then names what it left behind. A leftover only ever returned in a result
        // object and never printed is the same as not having detected it.
        warnings.push(
          `[${kind}-stale] ${paths.length} file(s) written by engram no longer correspond ` +
            `to any ${kind} — usually one you have since overridden, which keeps working ` +
            `until removed. Engram will not delete them for you: ${paths.join(', ')}`,
        );
      }
    }

    // An agent whose verified targets hold zero renders has no surface at all —
    // FEAT-009's failure in its plainest form. Named per agent, with the fix.
    const allPaths = new Set(await files.list());
    const agentsWithTargets = [...skillTargets(), ...commandTargets()];
    for (const agent of new Map(agentsWithTargets.map((a) => [a.name, a])).values()) {
      const dirs = [agent.skills?.dir, agent.commands?.dir].filter((d) => d !== undefined);
      const any = dirs.some((d) => [...allPaths].some((p) => p.startsWith(`${d!}/`)));
      if (!any) {
        warnings.push(
          `[surface-unrendered] nothing is rendered for \`${agent.name}\` (${dirs.join(', ')}), ` +
            `so it has no skills or commands there. Run \`engram reindex\`.`,
        );
      }
    }

    // The visibility section itself: one row per registered agent, whether or not
    // anything is wrong — the gap Phase 19 closed was invisible precisely because
    // absence produces no warning anywhere else.
    surfaces.push(
      ...AGENTS.map((agent) => {
        const countUnder = (dir?: string, suffix?: string) =>
          dir === undefined
            ? 0
            : [...allPaths].filter((p) => p.startsWith(`${dir}/`) && (suffix === undefined || p.endsWith(suffix)))
                .length;
        return {
          agent: agent.name,
          contract:
            agent.contractFile === undefined
              ? 'AGENTS.md (native)'
              : `${agent.contractFile} (rendered copy)`,
          skills: countUnder(agent.skills?.dir, '/SKILL.md'),
          commands: countUnder(agent.commands?.dir, '.md'),
          verified:
            agent.skills?.verified ?? agent.commands?.verified ?? 'no targets',
        };
      }),
    );
  }

  // A vault older than the engram reading it. Note files are safe by construction —
  // each carries its own okf_version — but engram's own files are not versioned,
  // which is the gap this surfaces rather than leaves as a mystery.
  const plan = await planUpgrade(files);
  const skew = versionSkew(plan);
  if (skew !== null) warnings.push(skew);
  else if (needsUpgrade(plan)) {
    warnings.push('[version] `engram upgrade` has changes available for this vault.');
  }

  // Detection over configuration (ADR-0025). Obsidian owns link rewriting; engram
  // only reports a mismatch (ADR-0028).
  //
  // Until Phase 14 this emitted one fixed line telling the human to go check a
  // setting, and never opened `app.json` — so it said the same thing to a
  // correctly configured vault and a misconfigured one, which is the same as
  // saying nothing. ADR-0028 asked for the settings to be *read*.
  if (await detect.has('obsidian')) {
    const settings = await readLinkSettings(files);
    if (settings === null) {
      warnings.push(
        `[obsidian] Obsidian detected but ${OBSIDIAN_APP_JSON} is unreadable, so this device's ` +
          `link settings could not be checked. Links must be markdown + absolute (ADR-0003).`,
      );
    } else {
      warnings.push(...linkSettingWarnings(settings));
    }
  }

  const detectives = relationKinds().map((relation) => {
    const kind = getRelation(relation)!;
    const known = new Set(nodes.map((n) => n.id));
    const hits = edges
      .filter((e) => e.kind === relation && !known.has(e.to))
      .map((e) => `${e.from} --${relation}--> ${e.to} (target has no node)`);
    return { relation, check: kind.detective, hits };
  });

  const guardrails = detectAll(nodes, edges, guardrailConfig);
  for (const g of guardrails) {
    for (const hit of g.hits) warnings.push(`[guardrail:${g.rule}] ${hit}`);
  }

  return {
    warnings,
    failures,
    detectives,
    guardrails,
    counts: { nodes: nodes.length, edges: edges.length },
    surfaces,
  };
}

/** Format a report for a terminal. Exit code is `failures.length === 0 ? 0 : 1`. */
export function formatReport(r: DoctorReport): string {
  const lines = [`engram doctor`, ``, `nodes: ${r.counts.nodes}   edges: ${r.counts.edges}`, ``];

  if (r.failures.length > 0) {
    lines.push(`FAILURES (${r.failures.length})`, ...r.failures.map((f) => `  ✖ ${f}`), ``);
  }
  if (r.warnings.length > 0) {
    lines.push(
      `warnings (${r.warnings.length}) — none of these are errors`,
      ...r.warnings.map((w) => `  • ${w}`),
      ``,
    );
  }

  lines.push(`relation detectives (${r.detectives.length} registered)`);
  for (const d of r.detectives) {
    lines.push(`  ${d.relation}: ${d.check}`);
    for (const h of d.hits) lines.push(`    • ${h}`);
    if (d.hits.length === 0) lines.push(`    clean`);
  }

  lines.push(``, `guardrail detectives (${r.guardrails.length} in force)`);
  lines.push(`  these catch writes the gate never saw — Obsidian and shell edits`);
  for (const g of r.guardrails) {
    lines.push(`  ${g.rule}: prevents ${g.prevents}`);
    for (const h of g.hits) lines.push(`    • ${h}`);
    if (g.hits.length === 0) lines.push(`    clean`);
  }

  lines.push(``, `agent surfaces (${r.surfaces.length} registered)`);
  lines.push(`  what engram renders where, and whether the paths were verified`);
  for (const s of r.surfaces) {
    // The verification claim is quoted in full: truncating "OpenCode 1.18.21,
    // 2026-08-24 — pending…" at a sentence boundary lands after "OpenCode 1",
    // and a report that mangles its own evidence teaches people to ignore it.
    lines.push(
      `  ${s.agent}: contract ${s.contract}; skills ${s.skills}; commands ${s.commands}`,
    );
    lines.push(`    verified: ${s.verified}`);
  }

  if (r.failures.length === 0 && r.warnings.length === 0) lines.push(``, `no problems found`);
  return `${lines.join('\n')}\n`;
}
