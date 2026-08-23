/**
 * TIER 2 — Agency. Skill discovery, validation and exposure.
 *
 * **Engram never runs a skill.** A skill is instructions the *agent* follows
 * (v2-overview §6). What engram owes it is discovery, honest validation, and
 * exposure — and nothing else, because the moment engram interprets a skill, the
 * guarantee that a skill "can only sequence the seven operations" stops being
 * structural and becomes something engram has to enforce at runtime.
 */

import type { FileStore } from '../core/ports.js';
import { parseFrontmatter, yamlScalar } from '../format/registry.js';
import { tighten, type GuardrailConfig } from './guardrails.js';
import { operationSkills, OPERATION_TOOLS } from './operations.js';
import {
  isOperation,
  META,
  SKILL_FILE,
  OPERATIONS,
  type Operation,
  type Skill,
  type SkillError,
} from './skill-schema.js';

/**
 * Where **your** skills live — visible, so you can write them in Obsidian.
 *
 * Engram's own two skills are not here and never will be: they ship inside engram
 * and are invocable but not editable, which is the correct treatment for something
 * the tool provides. This directory is for the ones you author.
 */
export const SKILLS_DIR = '/engram/skills';

/** Pre-v0.12 location. Still read, so an existing vault keeps working. */
export const LEGACY_SKILLS_DIR = '/.engram/skills';

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/**
 * A list written either as YAML or as a `metadata` string.
 *
 * `metadata` is a string→string map by the standard, so `engram-uses` arrives as
 * `capture format link` rather than a list. Accepting both keeps one reader for the
 * new layout and the legacy one instead of two that can drift apart.
 */
const words = (v: unknown): string[] => {
  if (Array.isArray(v)) return list(v);
  const raw = str(v);
  return raw === null ? [] : raw.split(/[\s,]+/).filter((w) => w !== '');
};

/** The `metadata` block, or an empty map when there is none. */
const metaOf = (fm: Record<string, unknown>): Record<string, unknown> =>
  typeof fm.metadata === 'object' && fm.metadata !== null && !Array.isArray(fm.metadata)
    ? (fm.metadata as Record<string, unknown>)
    : {};

/**
 * Read the provenance marker from a rendered skill.
 *
 * The whole overwrite rule turns on this: a file carrying the marker is engram's to
 * regenerate, and a file without one is never touched. Returns the version that
 * wrote it, so a stale render can say so rather than merely being replaced.
 */
export function managedBy(raw: string): string | null {
  const parsed = parseFrontmatter(raw);
  if (parsed.frontmatter === null) return null;
  return str(metaOf(parsed.frontmatter)[META.managed]);
}

/**
 * Parse one skill file.
 *
 * A malformed skill is **rejected loudly, never skipped**. A skill that quietly
 * fails to load is worse than one that fails visibly: the agent proceeds believing
 * it has a capability it does not, which is the failure mode a silent `continue`
 * would produce.
 */
export function parseSkill(
  raw: string,
  origin: 'built-in' | 'vault',
): { skill: Skill } | { error: SkillError } {
  const parsed = parseFrontmatter(raw);
  const fm = parsed.frontmatter;

  // Skills **reject**, they do not recover (ADR-0047 §4). A half-loaded skill is a
  // capability the agent believes it has and does not — worse than an absent one,
  // because the agent proceeds. Unchanged in intent from Phase 15; stated explicitly
  // now that per-key recovery exists everywhere else.
  if (parsed.keyErrors.length > 0) {
    const first = parsed.keyErrors[0]!;
    return {
      error: {
        name: str(fm?.name) ?? '(unnamed)',
        reason: `line ${first.line} (${first.key}): ${first.reason}`,
      },
    };
  }

  if (!parsed.hasFrontmatter || fm === null) {
    return {
      error: {
        name: '(unnamed)',
        reason:
          parsed.yamlError === undefined
            ? 'no frontmatter: a skill must declare at least name, description and uses'
            : `frontmatter did not parse: ${parsed.yamlError}`,
      },
    };
  }

  const name = str(fm.name);
  if (name === null || name.trim() === '') {
    return { error: { name: '(unnamed)', reason: 'missing `name`' } };
  }

  const description = str(fm.description);
  if (description === null) {
    return { error: { name, reason: 'missing `description`' } };
  }

  // `metadata` first, top-level second. The legacy layout is still read so a vault
  // written by an earlier engram keeps working — the same courtesy the guardrail
  // and skills *locations* already extend to pre-v0.12 vaults.
  const meta = metaOf(fm);
  const declared = meta[META.uses] === undefined ? list(fm.uses) : words(meta[META.uses]);
  if (declared.length === 0) {
    return {
      error: { name, reason: 'missing `uses`: a skill must declare which operations it sequences' },
    };
  }

  // The check that makes §6's guarantee real. A skill naming something engram
  // cannot do is rejected, with the offending name, rather than loaded and
  // discovered at the point an agent tries to follow it.
  const unknown = declared.filter((op) => !isOperation(op));
  if (unknown.length > 0) {
    return {
      error: {
        name,
        reason: `declares unknown operation(s): ${unknown.join(', ')}. engram has exactly: ${OPERATIONS.join(', ')}`,
      },
    };
  }

  const emits = readEmits(fm, meta);

  const guardrails = readGuardrails(fm, meta);

  return {
    skill: {
      name,
      description,
      uses: declared as Operation[],
      emits,
      guardrails,
      body: parsed.body,
      origin,
    },
  };
}

/**
 * Coerce numeric guardrail fields.
 *
 * The YAML subset in `format/registry.ts` deliberately does **not** coerce numbers:
 * `okf_version: 0.2` has to stay a string or `detectVersion` stops recognising it,
 * and widening the parser to fix a skill field would break the format layer. So the
 * coercion happens here, at the consumer, where the expected type is known.
 */
function coerceConfig(raw: Record<string, unknown>): Partial<GuardrailConfig> {
  const n = Number(raw.rateLimit);
  return {
    ...(raw as Partial<GuardrailConfig>),
    ...(raw.rateLimit !== undefined && Number.isFinite(n) ? { rateLimit: n } : {}),
  };
}

/**
 * What a skill says it produces, from either layout.
 *
 * `metadata` is flat by the standard, so the nested `emits: { type, relations }`
 * becomes two keys. Nothing about the meaning changes.
 */
function readEmits(
  fm: Record<string, unknown>,
  meta: Record<string, unknown>,
): Skill['emits'] | undefined {
  const type = str(meta[META.emitsType]);
  const relations = words(meta[META.emitsRelations]);
  if (type !== null || relations.length > 0) {
    return { type: type ?? undefined, relations };
  }
  if (typeof fm.emits !== 'object' || fm.emits === null) return undefined;
  const legacy = fm.emits as Record<string, unknown>;
  return { type: str(legacy.type) ?? undefined, relations: list(legacy.relations) };
}

/**
 * The guardrails a skill runs under, from either layout.
 *
 * **The array check MUST come first** in the legacy branch: `Array.isArray` is also
 * `typeof 'object'`, so testing for an object first swallows the shorthand list form
 * that v2-overview §6's own example uses — and a skill declaring
 * `guardrails: [require-sources]` would then run with **no guardrails at all**.
 * Silent loosening by parse order is the worst possible failure here, and it is
 * worth restating that this ordering is load-bearing rather than stylistic.
 *
 * Whichever layout it came from, the result only ever reaches `tighten()`, so a
 * skill can still hand itself less freedom and never more.
 */
function readGuardrails(
  fm: Record<string, unknown>,
  meta: Record<string, unknown>,
): Partial<GuardrailConfig> | undefined {
  const declaresMeta = [META.guardrails, META.proposeOnly, META.pathScope, META.rateLimit].some(
    (k) => meta[k] !== undefined,
  );
  if (declaresMeta) {
    const enabled = words(meta[META.guardrails]);
    const proposeOnly = words(meta[META.proposeOnly]);
    const pathScope = words(meta[META.pathScope]);
    const rate = Number(str(meta[META.rateLimit]));
    return {
      ...(enabled.length > 0 ? { enabled } : {}),
      ...(proposeOnly.length > 0 ? { proposeOnly } : {}),
      ...(pathScope.length > 0 ? { pathScope } : {}),
      ...(meta[META.rateLimit] !== undefined && Number.isFinite(rate) ? { rateLimit: rate } : {}),
    };
  }

  if (Array.isArray(fm.guardrails)) return { enabled: list(fm.guardrails) };
  if (typeof fm.guardrails === 'object' && fm.guardrails !== null) {
    return coerceConfig(fm.guardrails as Record<string, unknown>);
  }
  return undefined;
}

/**
 * The banner every rendered skill opens with.
 *
 * "Do not edit" on its own just gets worked around; it has to say what to do
 * instead. There is no lock here and there should not be — engram's premise is plain
 * files you own, and a tool that says that and then chmods your files is lying about
 * one of the two. The protection is that this file is **derived state** under
 * ADR-0029: edit it and `reindex` takes the edit back.
 */
export function renderedBanner(source: string): string {
  return [
    `<!-- GENERATED by \`engram reindex\` from ${source}. -->`,
    `<!-- Edits here are lost on the next reindex. Edit ${source} instead, or delete`,
    `     the \`${META.managed}\` line above and engram will stop managing this file. -->`,
  ].join('\n');
}

export interface RenderOptions {
  /**
   * The name written to frontmatter. **Must match the parent directory** — the
   * standard requires it, so a prefixed invocation needs a prefixed directory too.
   */
  name?: string;
  /** Stamp the provenance marker with this version. Omit for a source skill. */
  managed?: string;
  /** Where the source lives, for the banner. Omit to write no banner. */
  source?: string;
  /** Tool restriction hint. Experimental in the hosts, so a hint and not a guarantee. */
  allowedTools?: string;
}

/**
 * Write a skill in the standard's shape.
 *
 * **The single generator.** Every rendered file goes through here, which is what
 * makes the copies safe: no caller can emit a variant, so no copy can be more real
 * than another (the ADR-0017 argument, applied to skills).
 */
export function serializeSkill(skill: Skill, options: RenderOptions = {}): string {
  const name = options.name ?? skill.name;
  const meta: [string, string][] = [[META.uses, skill.uses.join(' ')]];

  const g = skill.guardrails;
  if (g?.enabled !== undefined && g.enabled.length > 0) {
    meta.push([META.guardrails, g.enabled.join(' ')]);
  }
  if (g?.proposeOnly !== undefined && g.proposeOnly.length > 0) {
    meta.push([META.proposeOnly, g.proposeOnly.join(' ')]);
  }
  if (g?.pathScope !== undefined && g.pathScope.length > 0) {
    meta.push([META.pathScope, g.pathScope.join(' ')]);
  }
  if (g?.rateLimit !== undefined) meta.push([META.rateLimit, String(g.rateLimit)]);
  if (skill.emits?.type !== undefined) meta.push([META.emitsType, skill.emits.type]);
  if (skill.emits?.relations !== undefined && skill.emits.relations.length > 0) {
    meta.push([META.emitsRelations, skill.emits.relations.join(' ')]);
  }
  // Last, so it reads as a stamp rather than a setting.
  if (options.managed !== undefined) meta.push([META.managed, options.managed]);

  const lines = [
    '---',
    `name: ${yamlScalar(name)}`,
    `description: ${yamlScalar(skill.description)}`,
  ];
  if (options.allowedTools !== undefined) {
    lines.push(`allowed-tools: ${yamlScalar(options.allowedTools)}`);
  }
  lines.push('metadata:');
  for (const [k, v] of meta) lines.push(`  ${k}: ${yamlScalar(v)}`);
  lines.push('---', '');
  if (options.source !== undefined) lines.push(renderedBanner(options.source), '');
  lines.push(skill.body.trim(), '');
  return lines.join('\n');
}

export interface DiscoveryResult {
  skills: Skill[];
  errors: SkillError[];
}

/**
 * Discover built-ins plus `.engram/skills/*.md`.
 *
 * **Vault-local wins on a name collision**, so a vault can override a built-in
 * without forking engram — and so a skill travels with a `git clone` rather than
 * living in an install someone else does not have.
 */
export async function discoverSkills(
  files: FileStore,
  builtIns: Record<string, string> = BUILT_IN_SKILLS,
): Promise<DiscoveryResult> {
  const byName = new Map<string, Skill>();
  const errors: SkillError[] = [];

  for (const raw of Object.values(builtIns)) {
    const result = parseSkill(raw, 'built-in');
    if ('error' in result) errors.push(result.error);
    else byName.set(result.skill.name, result.skill);
  }

  // Later wins, so the order is the precedence: legacy location, then flat, then the
  // standard's directory form. A vault mid-migration therefore prefers the shape it
  // is migrating *to* rather than whichever sorts later by accident.
  const paths = (await files.list()).sort();
  for (const path of [...paths.filter(isFlatSkill), ...paths.filter(isDirectorySkill)]) {
    const raw = await files.read(path);
    if (raw === null) continue;
    const result = parseSkill(raw, 'vault');
    if ('error' in result)
      errors.push({ ...result.error, reason: `${path}: ${result.error.reason}` });
    else byName.set(result.skill.name, result.skill);
  }

  return { skills: [...byName.values()].sort((a, b) => a.name.localeCompare(b.name)), errors };
}

/** In a skills directory, at the top level. */
const inSkillsDir = (path: string): boolean =>
  path.startsWith(`${SKILLS_DIR}/`) || path.startsWith(`${LEGACY_SKILLS_DIR}/`);

/**
 * `<name>.md` — the single-file layout engram invented.
 *
 * Still read, because a vault written by an earlier engram must keep working. The
 * legacy `.engram/skills/` location is included here for the same reason: two
 * migrations at once (format and location) is one too many to force on someone who
 * only wanted to upgrade.
 */
export function isFlatSkill(path: string): boolean {
  if (!inSkillsDir(path) || !path.endsWith('.md') || path.endsWith(`/${SKILL_FILE}`)) return false;
  const rest = path.slice(
    path.startsWith(SKILLS_DIR) ? SKILLS_DIR.length + 1 : LEGACY_SKILLS_DIR.length + 1,
  );
  return !rest.includes('/');
}

/** `<name>/SKILL.md` — the standard's layout, and what engram writes. */
export function isDirectorySkill(path: string): boolean {
  return inSkillsDir(path) && path.endsWith(`/${SKILL_FILE}`);
}

/**
 * The guardrail configuration in force while a skill runs.
 *
 * Always through `tighten()`, which is why Phase 10 built it before skills existed:
 * a skill may narrow what it is permitted to do and can never widen it, whatever
 * its frontmatter asks for.
 */
export function configFor(base: GuardrailConfig, skill: Skill): GuardrailConfig {
  return skill.guardrails === undefined ? base : tighten(base, skill.guardrails);
}

/** Built-in skills, shipped with engram. Vault-local copies override by name. */
/**
 * Built-in skills, shipped with engram. Vault-local copies override by name.
 *
 * Written in the standard's shape — `name`, `description`, everything else under
 * `metadata` — because engram cannot credibly ask that of a user's skills while its
 * own use a format it invented. They are parsed by `parseSkill` like any other, so
 * a mistake here fails the same way a mistake in yours does.
 *
 * `description` says **what it does and when to use it**: that string is what an
 * agent matches against when deciding whether to load the skill, so a description
 * that only names the skill makes it unreachable except by explicit invocation.
 */
export const BUILT_IN_SKILLS: Record<string, string> = {
  // One per operation, generated from the registry and serialized through the same
  // writer as everything else — so they are validated on load exactly like yours.
  ...Object.fromEntries(
    operationSkills().map((s) => [s.name, serializeSkill(s, { allowedTools: OPERATION_TOOLS })]),
  ),

  'create-skill': [
    '---',
    'name: create-skill',
    'description: Write a new engram skill into this vault, so it becomes invocable as' +
      ' a slash command in every agent. Use when the user wants to capture a repeatable' +
      ' way of working as a reusable skill.',
    'metadata:',
    '  engram-uses: reindex',
    '---',
    '',
    '# When to use',
    '',
    'The user describes a way of working they repeat, and wants it saved rather than',
    're-explained. Also when they ask directly for a new skill.',
    '',
    '# Where it goes',
    '',
    '```',
    'engram/skills/<name>/SKILL.md',
    '```',
    '',
    '**That directory is theirs.** Never write a skill anywhere else — everything under',
    "an agent's own directory (`.claude/skills/`, `.gemini/skills/`, `.antigravity/`)",
    'is generated from this one and is overwritten on the next `engram reindex`.',
    '',
    '# Steps',
    '',
    '1. Agree the `name` with the user. Lowercase, hyphenated, and it MUST match the',
    '   directory it lives in — that is the standard, not an engram preference.',
    '2. Write `engram/skills/<name>/SKILL.md`. Only `name` and `description` are',
    '   required. Put engram-specific fields under `metadata`:',
    '',
    '   ```yaml',
    '   ---',
    '   name: literature-review',
    '   description: Read several sources on one question and emit one synthesis citing',
    '     them all. Use when the user wants the shape of an argument, not a summary.',
    '   metadata:',
    '     engram-uses: capture format link',
    '     engram-guardrails: require-sources',
    '   ---',
    '   ```',
    '',
    '3. Spend real effort on `description`. It is what an agent matches against when',
    '   deciding whether to load the skill at all, so it must name the **occasion**,',
    '   not just restate the title.',
    '4. `engram-uses` may name only operations engram actually has. Naming anything',
    '   else means the skill is **rejected at load** — with the offending name.',
    '5. `engram-guardrails` may only tighten: rules union, path scopes intersect, rate',
    '   limits take the minimum. A skill can hand itself less freedom, never more.',
    '6. Run `engram reindex`. That renders the skill into every agent directory.',
    '7. Tell the user it is now `/<name>` — with no prefix, because they wrote it.',
    "   Engram's own skills carry `engram:` or `engram-`; a name without that mark is",
    '   theirs.',
    '',
    '# Do not',
    '',
    '- Do not write code. A skill is instructions an agent follows; engram never runs',
    '  one. That is what stops a downloaded skill doing anything the user could not',
    '  already do.',
    '- Do not edit a generated copy to change a skill. Edit the source and reindex.',
  ].join('\n'),

  'connect-the-dots': [
    '---',
    'name: connect-the-dots',
    'description: Read several sources, find the shared thread, and emit one synthesis' +
      ' node citing them all. Use when several articles, papers or repos should add up' +
      ' to a single claim.',
    'metadata:',
    '  engram-uses: capture format link',
    '  engram-emits-type: Synthesis',
    '  engram-emits-relations: sources',
    '  engram-guardrails: require-sources',
    '---',
    '',
    '# When to use',
    '',
    'The user drops several articles, videos or repos and asks what they add up to.',
    '',
    '# Steps',
    '',
    '1. Read each pointer. If a pointer has no body, summarise it into `sources/` first.',
    '2. Separate claims that recur, claims that conflict, and claims unique to one source.',
    '3. Emit ONE node with `sources:` listing every input that contributed.',
    '4. Never assert a claim no source supports. If you infer, say so in the body.',
  ].join('\n'),

  'weekly-digest': [
    '---',
    'name: weekly-digest',
    'description: Summarise what changed in the vault this week, citing the nodes it' +
      ' mentions. Use for a weekly review, or when returning after time away.',
    'metadata:',
    '  engram-uses: reindex doctor format',
    '  engram-emits-type: Digest',
    '  engram-emits-relations: sources',
    '  engram-guardrails: require-sources rate-limit',
    '---',
    '',
    '# When to use',
    '',
    'A weekly review, or returning after time away.',
    '',
    '# Steps',
    '',
    '1. `reindex`, then read `views/recent.md` for what is new.',
    '2. Read `views/orphans.md` — content nothing points at is usually unfinished thinking.',
    '3. Run `doctor` and mention anything it flags, without fixing it.',
    '4. Emit one digest node citing every node it mentions. Cite, do not restate.',
  ].join('\n'),
};

/**
 * The starting point `engram skill new` writes.
 *
 * In the standard's shape, because a scaffold teaches the format more effectively
 * than any documentation does — whatever this file looks like is what the next
 * hand-written skill will look like.
 */
export function scaffoldSkill(name: string): string {
  return [
    '---',
    `name: ${name}`,
    'description: One line on what this does AND when to reach for it. An agent matches' +
      ' against this string to decide whether to load the skill, so name the occasion.',
    'metadata:',
    '  engram-uses: capture format',
    '  engram-guardrails: require-sources',
    '---',
    '',
    '# When to use',
    '',
    'Describe the situation that should make someone pick this skill.',
    '',
    '# Steps',
    '',
    '1. Engram runs none of this — you do. It only checks the operations exist.',
    '2. `engram-uses` may name only real operations; `engram-guardrails` may tighten,',
    '   never loosen.',
    '3. Every write still passes the gate, so this cannot exceed what you already may do.',
    '',
  ].join('\n');
}

/**
 * A worked example, written into a new vault so skills are discoverable at all.
 *
 * Before this the directory did not exist until someone happened to run
 * `engram skill new`, so most people would never learn skills existed. It is
 * deliberately a *complete, working* skill rather than a stub with placeholders:
 * the fastest way to understand the format is to read one that means something.
 */
export function exampleSkill(): string {
  return [
    '---',
    'name: example-literature-review',
    'description: Read several sources on one question and emit one synthesis citing' +
      ' them all. Use when you want the shape of an argument rather than a summary' +
      ' of each source.',
    'metadata:',
    '  engram-uses: capture format link',
    '  engram-emits-type: Synthesis',
    '  engram-emits-relations: sources',
    '  engram-guardrails: require-sources',
    '---',
    '',
    '# This file is an example — edit it, rename it, or delete it',
    '',
    'A skill is **instructions an agent follows**. Engram never runs one; it checks',
    'the frontmatter and hands the rest to whichever agent you are working with.',
    'That is what bounds the damage a careless or downloaded skill can do — it can',
    'only sequence operations that already exist.',
    '',
    'Only `name` and `description` are required — that is the',
    '[Agent Skills standard](https://agentskills.io/specification), so this file works',
    'in any agent that implements it. Everything engram-specific lives under',
    '`metadata`, and two of those keys are checked mechanically:',
    '',
    '- `engram-uses` may name only real operations. Name one engram does not have and',
    '  this skill is **rejected at load**, with the offending name.',
    '- `engram-guardrails` may only **tighten** — rules union, path scopes intersect,',
    '  rate limits take the minimum. A skill can hand itself less freedom, never more.',
    '',
    'Everything below is prose engram never interprets. Write it for the agent.',
    '',
    '# When to use',
    '',
    'Several sources on one question, and you want the shape of the argument rather',
    'than a summary of each.',
    '',
    '# Steps',
    '',
    '1. Summarise each source into its own node first, so each can be cited.',
    '2. Separate what recurs, what conflicts, and what only one source claims.',
    '3. Emit ONE node with `sources:` listing every input that contributed.',
    '4. Never assert a claim no source supports. If you infer, say so in the body.',
    '',
  ].join('\n');
}
