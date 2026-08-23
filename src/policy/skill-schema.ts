/**
 * TIER 2 — Agency. The shape of a skill.
 *
 * A skill is **instructions, never code** (v2-overview §6). It can only *sequence*
 * the seven operations and can never add an eighth, which is what bounds the blast
 * radius of a careless or downloaded one: whatever it tells an agent to do, every
 * step still passes the write gate under the guardrails in force.
 *
 * Engram therefore builds no interpreter. It discovers skills, validates their
 * declarations honestly, and exposes them. The agent does the rest.
 */

import type { GuardrailConfig } from './guardrails.js';

/** Operations a skill may sequence. Anything else is not a thing engram can do. */
export const OPERATIONS = ['init', 'capture', 'format', 'link', 'reindex', 'doctor'] as const;
export type Operation = (typeof OPERATIONS)[number];

/**
 * Where engram's own fields live in a `SKILL.md`.
 *
 * The [Agent Skills standard](https://agentskills.io/specification) defines exactly
 * two required frontmatter fields, `name` and `description`, and provides `metadata`
 * — a string→string map — for everything a particular tool needs. Engram's `uses`,
 * `guardrails` and `emits` were top-level, which made every engram skill invalid
 * anywhere else. Only their *location* moves; the validation is unchanged.
 *
 * Defined here rather than at each reader, because a key restated in a second module
 * is the shape that produced BUG-008 twice.
 */
/** The file a skill is defined in, by the standard. One definition, imported. */
export const SKILL_FILE = 'SKILL.md';

export const META = {
  uses: 'engram-uses',
  /** The `enabled` list. The other three tightenings get their own flat keys. */
  guardrails: 'engram-guardrails',
  proposeOnly: 'engram-propose-only',
  pathScope: 'engram-path-scope',
  rateLimit: 'engram-rate-limit',
  emitsType: 'engram-emits-type',
  emitsRelations: 'engram-emits-relations',
  /**
   * The provenance marker (ADR-0044 §4). Engram regenerates a rendered skill that
   * carries it, and **never touches one that does not** — so a skill someone else
   * wrote into the same directory is safe, and taking over an engram skill is just
   * deleting this line.
   *
   * Its value is the engram version that wrote the file, so a stale render says so.
   */
  managed: 'engram-managed',
} as const;

export interface Skill {
  name: string;
  description: string;
  /** Which operations it may sequence. Validated against OPERATIONS. */
  uses: Operation[];
  /** What it produces, declared up front. */
  emits?: { type?: string; relations?: string[] };
  /** Guardrails it runs under. **MAY TIGHTEN — never loosen.** */
  guardrails?: Partial<GuardrailConfig>;
  /** The instructions themselves — everything after the frontmatter. */
  body: string;
  /** Where it came from. Vault-local wins over a built-in of the same name. */
  origin: 'built-in' | 'vault';
}

export interface SkillError {
  name: string;
  reason: string;
}

export function isOperation(value: string): value is Operation {
  return (OPERATIONS as readonly string[]).includes(value);
}
