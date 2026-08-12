import { describe, expect, it } from 'vitest';
import { inspect, isValid, resolve, validOnly } from '../../src/core/graph.js';
import { makeEdge, makeNode, type AssertionStamp } from '../../src/core/model.js';
import {
  getRelation,
  isClosedRelation,
  registerRelation,
  relationKinds,
  untypedEdges,
} from '../../src/core/relations.js';

const NOW = '2026-08-12T09:00:00.000Z';
const stamp = (over: Partial<AssertionStamp> = {}): AssertionStamp => ({
  by: 'avinash',
  at: '2026-01-01T00:00:00.000Z',
  until: null,
  ...over,
});
const node = (id: string, path = `/${id}.md`, over = {}) =>
  makeNode({ id, path, stamp: stamp(), ...over });

describe('identity — address is path, identity is the slug (ADR-0021)', () => {
  const nodes = [
    node('hybrid-retrieval', '/decisions/hybrid.md'),
    makeNode({
      id: 'moved',
      path: '/concepts/moved.md',
      stamp: stamp(),
      aliases: ['/inbox/2026-06-14-draft.md'],
    }),
  ];

  it('resolves by slug', () => {
    expect(resolve(nodes, 'hybrid-retrieval')?.path).toBe('/decisions/hybrid.md');
  });

  it('resolves by path — the fast path stays', () => {
    expect(resolve(nodes, '/decisions/hybrid.md')?.id).toBe('hybrid-retrieval');
  });

  it('resolves by a prior address — the repair path (aliases)', () => {
    expect(resolve(nodes, '/inbox/2026-06-14-draft.md')?.id).toBe('moved');
  });

  it('returns undefined for something unknown rather than throwing', () => {
    expect(resolve(nodes, 'no-such-thing')).toBeUndefined();
  });
});

describe('every structural finding is a WARNING, never an error (ADR-0021)', () => {
  it('flags a slug collision and keeps both nodes', () => {
    const nodes = [node('dup', '/a/dup.md'), node('dup', '/b/dup.md')];
    const found = inspect(nodes, []);
    expect(found).toHaveLength(1);
    expect(found[0]!.code).toBe('slug-collision');
    expect(found[0]!.level).toBe('warning');
    // Both survive: two devices offline may legitimately produce this.
    expect(nodes).toHaveLength(2);
  });

  it('flags path-as-identity when a node has no slug', () => {
    const orphan = makeNode({ id: '/no-slug.md', path: '/no-slug.md', stamp: stamp() });
    const found = inspect([orphan], []);
    expect(found.map((f) => f.code)).toContain('path-as-identity');
    expect(found.every((f) => f.level === 'warning')).toBe(true);
  });

  it('flags an edge to an unwritten node — a forward reference, not a break', () => {
    const found = inspect(
      [node('a')],
      [makeEdge({ from: 'a', to: 'never-written', kind: 'sources', stamp: stamp() })],
    );
    expect(found.map((f) => f.code)).toContain('dangling-edge');
  });

  it('finds nothing wrong with a clean set', () => {
    expect(
      inspect(
        [node('a'), node('b')],
        [makeEdge({ from: 'a', to: 'b', kind: 'sources', stamp: stamp() })],
      ),
    ).toEqual([]);
  });
});

describe('validity — the thing grep cannot do', () => {
  it('a superseded node is no longer valid', () => {
    const march = node('march-decision');
    const june = node('june-decision');
    const edges = [
      makeEdge({ from: 'june-decision', to: 'march-decision', kind: 'supersedes', stamp: stamp() }),
    ];
    expect(isValid(june, edges, NOW)).toBe(true);
    expect(isValid(march, edges, NOW)).toBe(false);
  });

  it('being cited as a source does NOT invalidate — only supersession does', () => {
    const cited = node('cited');
    const edges = [makeEdge({ from: 'x', to: 'cited', kind: 'sources', stamp: stamp() })];
    expect(isValid(cited, edges, NOW)).toBe(true);
  });

  it('an expired assertion is no longer valid', () => {
    const lapsed = makeNode({
      id: 'lapsed',
      path: '/lapsed.md',
      stamp: stamp({ until: '2026-01-31T00:00:00.000Z' }),
    });
    expect(isValid(lapsed, [], NOW)).toBe(false);
  });

  it('validOnly returns the survivors in input order', () => {
    const a = node('a');
    const b = node('b');
    const edges = [makeEdge({ from: 'a', to: 'b', kind: 'supersedes', stamp: stamp() })];
    expect(validOnly([a, b], edges, NOW).map((n) => n.id)).toEqual(['a']);
  });

  it('an unregistered relation kind never invalidates', () => {
    // No code, no closed type (ADR-0022). An unknown edge is free association.
    const target = node('target');
    const edges = [makeEdge({ from: 'x', to: 'target', kind: 'vibes-with', stamp: stamp() })];
    expect(isValid(target, edges, NOW)).toBe(true);
  });
});

describe('the relation registry — no code, no closed type (ADR-0022)', () => {
  it('ships exactly the two types that have code behind them', () => {
    expect(relationKinds()).toEqual(['sources', 'supersedes']);
  });

  it('every closed type carries validity semantics AND a detective form', () => {
    for (const name of relationKinds()) {
      const kind = getRelation(name)!;
      expect(typeof kind.invalidatesTarget).toBe('boolean');
      expect(kind.meaning.length).toBeGreaterThan(0);
      // ADR-0024: a rule with no detective form is advisory, not enforced.
      expect(kind.detective.length).toBeGreaterThan(0);
    }
  });

  it('separates typed from untyped edges', () => {
    const edges = [
      makeEdge({ from: 'a', to: 'b', kind: 'supersedes', stamp: stamp() }),
      makeEdge({ from: 'a', to: 'c', kind: 'relates-to', stamp: stamp() }),
    ];
    expect(untypedEdges(edges).map((e) => e.kind)).toEqual(['relates-to']);
  });

  it('adding a relation type requires no edit to the gate or the graph', () => {
    expect(isClosedRelation('contradicts')).toBe(false);
    registerRelation({
      name: 'contradicts',
      invalidatesTarget: false,
      meaning: 'this node asserts something incompatible with the target',
      detective: 'find node pairs asserting incompatible claims with no supersedes between them',
    });
    // Registration alone makes it closed, and isValid picks up its semantics.
    expect(isClosedRelation('contradicts')).toBe(true);
    const target = node('t');
    const edges = [makeEdge({ from: 'x', to: 't', kind: 'contradicts', stamp: stamp() })];
    expect(isValid(target, edges, NOW)).toBe(true);
  });
});
