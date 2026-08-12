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
import { parseFrontmatter } from '../format/registry.js';
import { tighten, type GuardrailConfig } from './guardrails.js';
import {
  isOperation,
  OPERATIONS,
  type Operation,
  type Skill,
  type SkillError,
} from './skill-schema.js';

export const SKILLS_DIR = '/.engram/skills';

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

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

  const declared = list(fm.uses);
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

  const emits =
    typeof fm.emits === 'object' && fm.emits !== null
      ? {
          type: str((fm.emits as Record<string, unknown>).type) ?? undefined,
          relations: list((fm.emits as Record<string, unknown>).relations),
        }
      : undefined;

  // The array check MUST come first: `Array.isArray` is also `typeof 'object'`, so
  // testing for an object first swallows the shorthand list form that
  // v2-overview §6's own example uses — and a skill declaring
  // `guardrails: [require-sources]` would then run with no guardrails at all.
  // Silent loosening by parse order is the worst possible failure here.
  const guardrails = Array.isArray(fm.guardrails)
    ? { enabled: list(fm.guardrails) }
    : typeof fm.guardrails === 'object' && fm.guardrails !== null
      ? coerceConfig(fm.guardrails as Record<string, unknown>)
      : undefined;

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

  for (const path of (await files.list()).sort()) {
    if (!path.startsWith(`${SKILLS_DIR}/`) || !path.endsWith('.md')) continue;
    const raw = await files.read(path);
    if (raw === null) continue;
    const result = parseSkill(raw, 'vault');
    if ('error' in result)
      errors.push({ ...result.error, reason: `${path}: ${result.error.reason}` });
    else byName.set(result.skill.name, result.skill);
  }

  return { skills: [...byName.values()].sort((a, b) => a.name.localeCompare(b.name)), errors };
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
export const BUILT_IN_SKILLS: Record<string, string> = {
  'connect-the-dots': [
    '---',
    'name: connect-the-dots',
    'description: Read several pointers, find the shared thread, emit one synthesis node.',
    'uses: [capture, format, link]',
    'emits: { type: Synthesis, relations: [sources] }',
    'guardrails: [require-sources]',
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
    'description: Summarise what changed in the vault this week, citing the nodes.',
    'uses: [reindex, doctor, format]',
    'emits: { type: Digest, relations: [sources] }',
    'guardrails: [require-sources, rate-limit]',
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
