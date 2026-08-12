/**
 * TIER 1 — the closed-relation registry (ADR-0032).
 *
 * A registry, not a switch. ADR-0022 is the governing rule: **no code, no closed
 * type.** A relation earns a place here by bringing two things with it —
 * validity semantics (what it means for the graph) and a detective form (how
 * `doctor` finds violations after the fact, since engram mediates only some
 * writes). Adding `contradicts` in Phase 13 means registering it, not editing
 * `gate.ts`.
 */

import type { Edge } from './model.js';

export interface RelationKind {
  /** The frontmatter key and edge `kind`. */
  name: string;
  /** Does asserting this invalidate the target? `supersedes` does; `sources` does not. */
  invalidatesTarget: boolean;
  /** Human-readable statement of what the edge asserts. */
  meaning: string;
  /**
   * The detective form — what `doctor` scans for.
   *
   * ADR-0024: design every rule so it has one. A rule enforceable only at the
   * gate is advisory, because Obsidian and any agent with a shell write directly.
   */
  detective: string;
}

const KINDS = new Map<string, RelationKind>();

export function registerRelation(kind: RelationKind): void {
  KINDS.set(kind.name, kind);
}

export function relationKinds(): string[] {
  return [...KINDS.keys()].sort();
}

export function getRelation(name: string): RelationKind | undefined {
  return KINDS.get(name);
}

export function isClosedRelation(name: string): boolean {
  return KINDS.has(name);
}

registerRelation({
  name: 'supersedes',
  invalidatesTarget: true,
  meaning: 'this node replaces the target; the target is no longer current',
  detective: 'find supersedes targets that are still presented as current',
});

registerRelation({
  name: 'part-of',
  // Containment says nothing about currency. A node inside a superseded parent is
  // not itself superseded -- conflating the two would let reorganising a tree
  // silently invalidate its contents.
  invalidatesTarget: false,
  meaning: 'this node is contained by the target; the structure tree is these edges',
  detective: 'find part-of targets that are not themselves nodes (a container that does not exist)',
});

registerRelation({
  name: 'sources',
  invalidatesTarget: false,
  meaning: 'this node draws on the target as evidence',
  detective: 'find synthesis nodes carrying no sources edge',
});

/** Edges whose kind is not registered. Free association, not an error. */
export function untypedEdges(edges: Edge[]): Edge[] {
  return edges.filter((e) => !isClosedRelation(e.kind));
}
