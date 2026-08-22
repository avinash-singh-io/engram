import { describe, expect, it } from 'vitest';
import {
  type AssertionStamp,
  type Edge,
  type Node,
  isExpired,
  makeEdge,
  makeNode,
} from '../../src/core/model.js';

/**
 * TIER 1 — the model is ENGRAM'S, not OKF's (ADR-0032).
 *
 * Every member here is required by ADR-0019's primitives. Nothing exists because
 * a spec has a field. These tests are the guard on that: if a future OKF cannot
 * express something asserted below, that is a codec-level lossy warning, never a
 * change to this file.
 */

const AT = '2026-08-12T09:00:00.000Z';
const stamp = (over: Partial<AssertionStamp> = {}): AssertionStamp => ({
  by: 'avinash',
  at: AT,
  until: null,
  ...over,
});

describe('Node — an addressable thing', () => {
  it('carries an id, a path and an assertion stamp', () => {
    const n: Node = makeNode({
      id: 'hybrid-retrieval',
      path: '/decisions/hybrid.md',
      stamp: stamp(),
    });
    expect(n.id).toBe('hybrid-retrieval');
    expect(n.path).toBe('/decisions/hybrid.md');
    expect(n.stamp.by).toBe('avinash');
  });

  /**
   * ADR-0019: "May be empty (a name you can point at — a link to an unwritten
   * note is a valid node, not an error)." This is the single most load-bearing
   * assertion in the model: it is what lets capture never reject, and what lets
   * a link to something unwritten be structure rather than a dangling error.
   */
  it('may be empty — a link to an unwritten note is a valid node', () => {
    const n = makeNode({ id: 'not-written-yet', path: '/concepts/ghost.md', stamp: stamp() });
    expect(n.body).toBeNull();
    expect(n.isEmpty).toBe(true);
  });

  it('is not empty once it has a body', () => {
    const n = makeNode({
      id: 'x',
      path: '/x.md',
      stamp: stamp(),
      body: '# Real content',
    });
    expect(n.isEmpty).toBe(false);
    expect(n.body).toBe('# Real content');
  });

  it('treats a whitespace-only body as empty', () => {
    expect(makeNode({ id: 'x', path: '/x.md', stamp: stamp(), body: '   \n\t ' }).isEmpty).toBe(
      true,
    );
  });

  it('keeps aliases — the move trail lives on the node itself (ADR-0021)', () => {
    const n = makeNode({
      id: 'x',
      path: '/new/x.md',
      stamp: stamp(),
      aliases: ['/raw/2026-06-14-x.md'],
    });
    expect(n.aliases).toEqual(['/raw/2026-06-14-x.md']);
  });

  it('defaults aliases to an empty list rather than undefined', () => {
    expect(makeNode({ id: 'x', path: '/x.md', stamp: stamp() }).aliases).toEqual([]);
  });
});

describe('Edge — a directed, typed relation', () => {
  it('carries from, to, a kind and a stamp', () => {
    const e: Edge = makeEdge({
      from: 'hybrid-retrieval',
      to: 'graph-rag-only',
      kind: 'supersedes',
      stamp: stamp(),
    });
    expect(e.from).toBe('hybrid-retrieval');
    expect(e.to).toBe('graph-rag-only');
    expect(e.kind).toBe('supersedes');
  });

  it('is directed — reversing it is a different edge', () => {
    const a = makeEdge({ from: 'x', to: 'y', kind: 'supersedes', stamp: stamp() });
    const b = makeEdge({ from: 'y', to: 'x', kind: 'supersedes', stamp: stamp() });
    expect(a.from).not.toBe(b.from);
    expect(a.to).not.toBe(b.to);
  });

  it('may point at a node that does not exist yet', () => {
    // The counterpart of "a node may be empty": authoring an edge must not
    // require its target to have been written.
    const e = makeEdge({ from: 'x', to: 'never-written', kind: 'sources', stamp: stamp() });
    expect(e.to).toBe('never-written');
  });
});

describe('AssertionStamp — who, when, until when', () => {
  it('is obligatory on both primitives (ADR-0019)', () => {
    expect(makeNode({ id: 'x', path: '/x.md', stamp: stamp() }).stamp).toBeDefined();
    expect(makeEdge({ from: 'a', to: 'b', kind: 'sources', stamp: stamp() }).stamp).toBeDefined();
  });

  it('an open-ended assertion has until: null and never expires', () => {
    expect(isExpired(stamp({ until: null }), '2099-01-01T00:00:00.000Z')).toBe(false);
  });

  it('expires strictly after `until`', () => {
    const s = stamp({ until: '2026-12-31T00:00:00.000Z' });
    expect(isExpired(s, '2026-12-30T00:00:00.000Z')).toBe(false);
    expect(isExpired(s, '2027-01-01T00:00:00.000Z')).toBe(true);
  });

  it('is not expired exactly at `until` — the boundary is inclusive', () => {
    const s = stamp({ until: '2026-12-31T00:00:00.000Z' });
    expect(isExpired(s, '2026-12-31T00:00:00.000Z')).toBe(false);
  });
});

describe('the model is version-free (ADR-0032)', () => {
  it('carries no okf_version — that belongs to the codec, not the model', () => {
    const n = makeNode({ id: 'x', path: '/x.md', stamp: stamp() }) as unknown as Record<
      string,
      unknown
    >;
    expect(n.okf_version).toBeUndefined();
    expect(n.okfVersion).toBeUndefined();
  });
});
