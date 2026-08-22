/**
 * THE WRITE GATE — every mediated write converges here (v2-overview §5).
 *
 * All three outcomes are here as of Phase 14. Phase 8 shipped validation, Phase 10
 * the guardrails and the rejection-with-the-rule-that-fired, and Phase 14 QUEUE —
 * which is what **a change is a proposed diff, not a file write** was for. A
 * deferred change is simply one that has been described and not yet applied.
 *
 * The gate routes; it never decides *which* outcome a rule means. That is the
 * rule's declared `disposition` (ADR-0042), so a second deferring rule needs no
 * change here.
 *
 * §1 of the architecture is explicit that this gate mediates only two of the
 * four write paths — Obsidian and any agent with a shell write files directly.
 * Controls here are therefore preventive-only; their detective forms live with
 * the relation registry and, later, `doctor`.
 */

import type { Edge, Node } from './core/model.js';
import { checkAll, type GuardrailConfig, type GuardrailContext } from './policy/guardrails.js';

export interface Change {
  path: string;
  node: Node;
  edges: Edge[];
  /** Serialized content the change would write. */
  content: string;
}

export type GateResult =
  | { outcome: 'apply'; change: Change; warnings: string[] }
  | { outcome: 'queue'; change: Change; reason: string; rule: string }
  | { outcome: 'reject'; reason: string; rule: string };

/**
 * Validation the core can state without touching a filesystem.
 *
 * When a guardrail configuration is supplied, the preventive halves run here too —
 * this is the single choke point (v2-overview §5), and a guardrail checked anywhere
 * else would be a second place for policy to be missed.
 */
export function validate(
  change: Change,
  guardrails?: { config: GuardrailConfig; ctx: GuardrailContext },
): GateResult {
  if (change.path.trim() === '') {
    return { outcome: 'reject', reason: 'a change must name a path', rule: 'path-required' };
  }
  if (change.node.id.trim() === '') {
    return { outcome: 'reject', reason: 'a node must have an identity', rule: 'id-required' };
  }
  const selfEdge = change.edges.find((e) => e.from === e.to);
  if (selfEdge !== undefined) {
    return {
      outcome: 'reject',
      reason: `a node cannot ${selfEdge.kind} itself ("${selfEdge.from}")`,
      rule: 'no-self-relation',
    };
  }
  if (guardrails !== undefined) {
    const hit = checkAll(change, guardrails.ctx, guardrails.config);
    if (hit !== null) {
      // The rule says what happens; the gate only routes it. Naming a rule here
      // would work until a second one wanted to defer, and would then fail by
      // rejecting — silently, and in exactly the paths that matter most.
      return hit.disposition === 'queue'
        ? { outcome: 'queue', change, reason: hit.reason, rule: hit.rule }
        : { outcome: 'reject', reason: hit.reason, rule: hit.rule };
    }
  }

  return { outcome: 'apply', change, warnings: [] };
}
