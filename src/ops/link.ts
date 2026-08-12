/**
 * `link(from, to, kind)` — assert a typed relation.
 *
 * Unlike capture, this **passes the gate**: it is a claim about the vault's
 * structure, and a wrong edge degrades retrieval for everything downstream
 * (ADR-0027's "a graph that lies confidently is worse than no graph").
 */

import { makeEdge, type Edge } from '../core/model.js';
import type { Clock, FileStore } from '../core/ports.js';
import { isClosedRelation } from '../core/relations.js';
import { readNode, writeNode } from '../format/registry.js';
import { validate, type Change } from '../gate.js';

export interface LinkDeps {
  files: FileStore;
  clock: Clock;
  /** Who is asserting this. */
  by: string;
}

export type LinkResult =
  | { outcome: 'applied'; edge: Edge; warnings: string[] }
  /** Deferred to a human (ADR-0042). The target is untouched; `change` is the proposal. */
  | { outcome: 'queued'; change: Change; reason: string; rule: string }
  | { outcome: 'rejected'; reason: string; rule: string };

export async function link(
  fromPath: string,
  to: string,
  kind: string,
  deps: LinkDeps,
): Promise<LinkResult> {
  const raw = (await deps.files.read(fromPath)) ?? '';
  const { node, edges, warnings } = readNode(raw, fromPath);

  const stamp = { by: deps.by, at: deps.clock.now(), until: null };
  const edge = makeEdge({ from: node.id, to, kind, stamp });

  const all = [...edges, edge];
  const { content, warnings: writeWarnings } = writeNode(node, all);
  const change: Change = { path: fromPath, node, edges: all, content };

  const verdict = validate(change);
  // Fail closed, as in `format`. `link` wires no guardrails today, so `queue` is
  // unreachable here — but the branch that assumes that is exactly the branch
  // that writes the file, so it is not left to the assumption.
  if (verdict.outcome !== 'apply') {
    return verdict.outcome === 'queue'
      ? { outcome: 'queued', change: verdict.change, reason: verdict.reason, rule: verdict.rule }
      : { outcome: 'rejected', reason: verdict.reason, rule: verdict.rule };
  }

  await deps.files.write(fromPath, content);

  const notes = [...warnings, ...writeWarnings];
  if (!isClosedRelation(kind)) {
    // Not an error — free vocabulary is the point (ADR-0022). But an untyped
    // edge draws no validity power, and the caller should know that.
    notes.push(`"${kind}" is not a closed relation; it carries no validity semantics`);
  }
  return { outcome: 'applied', edge, warnings: notes };
}
