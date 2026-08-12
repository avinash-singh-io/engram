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
