/**
 * TIER 1 — identity and validity. Pure, in-memory.
 *
 * Traversal *retrieval* is Phase 11; this ships the primitives it will stand on.
 */

import { isExpired, type Edge, type Instant, type Node } from './model.js';
import { getRelation } from './relations.js';

export interface Finding {
  /** `warning` only — ADR-0021 is explicit that none of these are errors. */
  level: 'warning';
  code: 'slug-collision' | 'path-as-identity' | 'dangling-edge';
  message: string;
}

/**
 * Resolve a node by id, then by any alias.
 *
 * **Address is path; identity is the slug** (ADR-0021). Links resolve by path —
 * that is the fast path and it stays. The slug is the repair path: when a link
 * breaks or a supersession needs a referent, it identifies what the thing
 * actually is. Street address versus person's name.
 */
export function resolve(nodes: Node[], ref: string): Node | undefined {
  return (
    nodes.find((n) => n.id === ref) ??
    nodes.find((n) => n.path === ref) ??
    nodes.find((n) => n.aliases.includes(ref))
  );
}

/**
 * Structural findings over a set of nodes and edges.
 *
 * Every finding is a **warning**. Two devices editing offline may generate the
 * same slug for different notes; a human editing in Obsidian may delete the
 * field entirely. Coexisting is recoverable, and a rejected write is not.
 */
export function inspect(nodes: Node[], edges: Edge[]): Finding[] {
  const findings: Finding[] = [];

  const byId = new Map<string, Node[]>();
  for (const n of nodes) {
    byId.set(n.id, [...(byId.get(n.id) ?? []), n]);
  }
  for (const [id, group] of byId) {
    if (group.length > 1) {
      findings.push({
        level: 'warning',
        code: 'slug-collision',
        message: `slug "${id}" is claimed by ${group.length} nodes: ${group.map((n) => n.path).join(', ')}`,
      });
    }
  }

  for (const n of nodes) {
    // A node whose id is its own path never had a slug — path-as-identity is the
    // documented fallback, and it costs move-resilience for that file only.
    if (n.id === n.path) {
      findings.push({
        level: 'warning',
        code: 'path-as-identity',
        message: `${n.path} has no slug; falling back to path-as-identity (moves will break links)`,
      });
    }
  }

  const known = new Set(nodes.map((n) => n.id));
  for (const e of edges) {
    if (!known.has(e.to)) {
      // Not an error: ADR-0019 says a node may be empty, so an edge to something
      // unwritten is a forward reference, not a broken one.
      findings.push({
        level: 'warning',
        code: 'dangling-edge',
        message: `${e.kind} edge from "${e.from}" points at "${e.to}", which has no node yet`,
      });
    }
  }

  return findings;
}

/**
 * Whether a node is still current as of `now`.
 *
 * Two ways to stop being current: the assertion lapsed, or something superseded
 * it. **This is the thing text search structurally cannot do** — grep returns
 * the March decision and the June decision with equal confidence.
 */
export function isValid(node: Node, edges: Edge[], now: Instant): boolean {
  if (isExpired(node.stamp, now)) return false;
  return !edges.some((e) => e.to === node.id && getRelation(e.kind)?.invalidatesTarget === true);
}

/** Nodes still current as of `now`, in input order. */
export function validOnly(nodes: Node[], edges: Edge[], now: Instant): Node[] {
  return nodes.filter((n) => isValid(n, edges, now));
}
