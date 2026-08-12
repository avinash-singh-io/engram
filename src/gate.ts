/**
 * THE WRITE GATE — every mediated write converges here (v2-overview §5).
 *
 * Phase 8 ships **validation only**. Guardrails, the approval queue and the
 * rejection-with-the-rule-that-fired live in Phase 10.
 *
 * The framing that matters is already here: **a change is a proposed diff, not a
 * file write.** That is what makes QUEUE possible later, lets a rejection name
 * the exact rule, and makes dry-run free rather than a special mode.
 *
 * §1 of the architecture is explicit that this gate mediates only two of the
 * four write paths — Obsidian and any agent with a shell write files directly.
 * Controls here are therefore preventive-only; their detective forms live with
 * the relation registry and, later, `doctor`.
 */

import type { Edge, Node } from './core/model.js';

export interface Change {
  path: string;
  node: Node;
  edges: Edge[];
  /** Serialized content the change would write. */
  content: string;
}

export type GateResult =
  | { outcome: 'apply'; change: Change; warnings: string[] }
  | { outcome: 'reject'; reason: string; rule: string };

/** Validation the core can state without touching a filesystem. */
export function validate(change: Change): GateResult {
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
  return { outcome: 'apply', change, warnings: [] };
}
