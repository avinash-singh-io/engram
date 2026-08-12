/**
 * TIER 1 — invariant. Version-free. No I/O.
 *
 * Engram's own model (ADR-0032). Nothing here exists because OKF has a field;
 * every member is required by ADR-0019's primitives. If a future OKF cannot
 * express something held here, that is a codec-level lossy warning — never a
 * change to this file.
 *
 * The complete primitive set is two things and one stamp:
 *
 *   NODE — an addressable thing. May have a body. **May be empty.**
 *   EDGE — a directed, typed relation between two nodes.
 *   STAMP — who asserted it, when, and until when.
 *
 * Everything else reduces to these (ADR-0019): a `type` is an edge, a tag is an
 * edge to an abstract node, a folder is a `part-of` edge, an index is a
 * projection of edges.
 */

/** An ISO-8601 instant. The core never reads a clock — see `core/ports.ts`. */
export type Instant = string;

/**
 * Who asserted this, when, and until when — obligatory on both primitives.
 *
 * `until: null` means open-ended, which is the common case. A bounded assertion
 * is what makes "is this still true?" answerable at all, and answering it is the
 * thing plain text search structurally cannot do.
 */
export interface AssertionStamp {
  /** The asserter — a human, or an agent identifier. */
  by: string;
  at: Instant;
  /** Open-ended when null. */
  until: Instant | null;
}

/** An addressable thing. */
export interface Node {
  /** Identity — stable across moves (ADR-0021). */
  id: string;
  /** Address — where it currently lives. Links resolve by this. */
  path: string;
  /** Content, or null when nothing has been written yet. */
  body: string | null;
  /** Prior addresses, written to this node's own frontmatter on move. */
  aliases: string[];
  stamp: AssertionStamp;
  /**
   * True when nothing has been written.
   *
   * An empty node is **valid, not an error** (ADR-0019) — a link to an unwritten
   * note is a name you can point at. This is what lets capture never reject and
   * lets a forward reference be structure rather than a dangling failure.
   */
  isEmpty: boolean;
}

/** A directed, typed relation between two nodes. */
export interface Edge {
  /** Source node id. */
  from: string;
  /** Target node id. May name a node that does not exist yet. */
  to: string;
  /** The relation type. Validity semantics live in `core/relations.ts`. */
  kind: string;
  stamp: AssertionStamp;
}

export interface NodeInit {
  id: string;
  path: string;
  stamp: AssertionStamp;
  body?: string | null;
  aliases?: string[];
}

export interface EdgeInit {
  from: string;
  to: string;
  kind: string;
  stamp: AssertionStamp;
}

/** A body of only whitespace is no body at all. */
function bodyIsEmpty(body: string | null | undefined): boolean {
  return body === null || body === undefined || body.trim() === '';
}

export function makeNode(init: NodeInit): Node {
  const body = init.body ?? null;
  return {
    id: init.id,
    path: init.path,
    body,
    aliases: init.aliases ?? [],
    stamp: init.stamp,
    isEmpty: bodyIsEmpty(body),
  };
}

export function makeEdge(init: EdgeInit): Edge {
  return { from: init.from, to: init.to, kind: init.kind, stamp: init.stamp };
}

/**
 * Whether an assertion has lapsed as of `now`.
 *
 * The boundary is **inclusive** — an assertion valid "until 2026-12-31" is still
 * valid at that instant. Exclusive would silently invalidate a claim on the last
 * day it was meant to hold.
 */
export function isExpired(stamp: AssertionStamp, now: Instant): boolean {
  if (stamp.until === null) return false;
  return now > stamp.until;
}
