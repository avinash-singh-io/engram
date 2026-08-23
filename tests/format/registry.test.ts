import { describe, expect, it } from 'vitest';
import { makeEdge, makeNode, type AssertionStamp } from '../../src/core/model.js';
import {
  CURRENT_VERSION,
  DEFAULT_VERSION,
  detectVersion,
  knownVersions,
  readNode,
  registerCodec,
  writeNode,
  type Codec,
} from '../../src/format/registry.js';

const stamp = (over: Partial<AssertionStamp> = {}): AssertionStamp => ({
  by: 'avinash',
  at: '2026-08-12T09:00:00.000Z',
  until: null,
  ...over,
});

describe('version detection', () => {
  it('dispatches on the declared okf_version', () => {
    expect(detectVersion({ okf_version: '0.2' })).toBe('0.2');
    expect(detectVersion({ okf_version: '0.1' })).toBe('0.1');
  });

  it('falls back for an undeclared version rather than failing', () => {
    expect(detectVersion({})).toBe(DEFAULT_VERSION);
    expect(detectVersion(null)).toBe(DEFAULT_VERSION);
  });

  it('falls back for a version no codec speaks', () => {
    // A vault written by a future engram must still be readable, degraded.
    expect(detectVersion({ okf_version: '9.9' })).toBe(DEFAULT_VERSION);
  });
});

describe('readNode is total (ADR-0026)', () => {
  it('reads a v0.2 file into the model', () => {
    const raw = [
      '---',
      'okf_version: 0.2',
      'id: hybrid-retrieval',
      'timestamp: 2026-06-14T09:22:00Z',
      'author: avinash',
      'supersedes: [graph-rag-only]',
      '---',
      '# Decision',
    ].join('\n');
    const { node, edges, warnings } = readNode(raw, '/decisions/hybrid.md');
    expect(node.id).toBe('hybrid-retrieval');
    expect(node.isEmpty).toBe(false);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      from: 'hybrid-retrieval',
      to: 'graph-rag-only',
      kind: 'supersedes',
    });
    expect(warnings).toEqual([]);
  });

  it('reads a file with no frontmatter at all — an empty node, not an error', () => {
    const { node } = readNode('just some prose', '/raw/scratch.md');
    expect(node.path).toBe('/raw/scratch.md');
    expect(node.body).toBe('just some prose');
  });

  it('reads a file with unparseable frontmatter and warns instead of throwing', () => {
    const raw = '---\ntype: [unclosed\n---\nbody';
    const { node, warnings } = readNode(raw, '/x.md');
    expect(node).toBeDefined();
    expect(warnings.join(' ')).toMatch(/did not parse/);
  });

  it('reads a completely empty file', () => {
    const { node } = readNode('', '/empty.md');
    expect(node.isEmpty).toBe(true);
  });

  it('warns and falls back to path-as-identity when the id is missing (ADR-0021)', () => {
    const raw = '---\nokf_version: 0.2\ntimestamp: 2026-01-01T00:00:00Z\n---\nbody';
    const { node, warnings } = readNode(raw, '/no-slug.md');
    expect(node.id).toBe('/no-slug.md');
    expect(warnings.join(' ')).toMatch(/path-as-identity/);
  });
});

describe('write, and the lossy-warning path (ADR-0032)', () => {
  const node = makeNode({
    id: 'x',
    path: '/x.md',
    stamp: stamp({ until: '2027-01-01T00:00:00.000Z' }),
    body: '# Body',
    aliases: ['/old/x.md'],
  });
  const edges = [makeEdge({ from: 'x', to: 'y', kind: 'supersedes', stamp: stamp() })];

  it('writes v0.2 losslessly', () => {
    const { content, warnings } = writeNode(node, edges, '0.2');
    expect(content).toContain('okf_version: 0.2');
    expect(content).toContain('stale_after: 2027-01-01T00:00:00.000Z');
    expect(content).toContain('supersedes: [y]');
    expect(warnings).toEqual([]);
  });

  it('warns rather than fails when the target version cannot express the model', () => {
    // v0.1 predates typed relations, aliases and time bounds. Downgrading is a
    // codec-level loss that must be *stated*, not silently swallowed.
    const { warnings } = writeNode(node, edges, '0.1');
    expect(warnings.join(' ')).toMatch(/typed relation/);
    expect(warnings.join(' ')).toMatch(/aliases/);
    expect(warnings.join(' ')).toMatch(/end date/);
  });

  it('throws only for a version no codec speaks', () => {
    expect(() => writeNode(node, edges, '9.9')).toThrow(/no codec/);
  });
});

describe('v0.1 → model → v0.2 migration is one transform, not a rewrite', () => {
  it('round-trips a v0.1 file up to v0.2', () => {
    const v1 = [
      '---',
      'okf_version: 0.1',
      'id: old-note',
      'timestamp: 2025-01-01T00:00:00Z',
      '---',
      '# Old',
    ].join('\n');
    const { node, edges } = readNode(v1, '/old.md');
    const { content, warnings } = writeNode(node, edges, '0.2');
    expect(warnings).toEqual([]);
    expect(content).toContain('okf_version: 0.2');
    expect(content).toContain('id: old-note');
    expect(readNode(content, '/old.md').node.body).toBe('# Old');
  });
});

describe('open/closed — adding a version is adding a file (ADR-0032)', () => {
  it('registering a new codec changes no existing code path', () => {
    const before = knownVersions();
    const stub: Codec = {
      version: '0.3-test',
      read: (parsed, path) => ({
        node: makeNode({ id: 'stub', path, stamp: stamp(), body: parsed.body }),
        edges: [],
        warnings: [],
        styles: {},
      }),
      write: () => ({ content: 'stub', warnings: [] }),
    };
    registerCodec(stub);

    expect(knownVersions()).toEqual([...before, '0.3-test'].sort());
    // Dispatch picks it up without a single edit to registry.ts or either codec.
    expect(detectVersion({ okf_version: '0.3-test' })).toBe('0.3-test');
    expect(
      writeNode(makeNode({ id: 'x', path: '/x.md', stamp: stamp() }), [], '0.3-test').content,
    ).toBe('stub');
    // Existing versions are untouched by the addition.
    expect(detectVersion({ okf_version: '0.2' })).toBe('0.2');
    expect(CURRENT_VERSION).toBe('0.2');
  });
});

describe('every serialized file ends with exactly one newline', () => {
  const node = makeNode({ id: 'x', path: '/x.md', stamp: stamp(), body: '# Body' });

  it.each(['0.1', '0.2'])('okf %s', (version) => {
    const { content } = writeNode(node, [], version);
    expect(content.endsWith('\n')).toBe(true);
    expect(content.endsWith('\n\n')).toBe(false);
  });

  it('does not add a second newline to a body that already ends with one', () => {
    const withNl = makeNode({ id: 'x', path: '/x.md', stamp: stamp(), body: '# Body\n' });
    expect(writeNode(withNl, [], '0.2').content.endsWith('\n\n')).toBe(false);
  });

  it('an empty node still ends with a newline', () => {
    const empty = makeNode({ id: 'x', path: '/x.md', stamp: stamp() });
    expect(writeNode(empty, [], '0.2').content.endsWith('\n')).toBe(true);
  });
});

describe('the trailing newline is a file convention, not body content', () => {
  it('read(write(node)) preserves the body exactly', () => {
    const node = makeNode({ id: 'x', path: '/x.md', stamp: stamp(), body: '# Body\n\nTwo paras.' });
    const { content } = writeNode(node, [], '0.2');
    expect(readNode(content, '/x.md').node.body).toBe(node.body);
  });

  it('does not grow a newline per round-trip cycle', () => {
    let content = writeNode(
      makeNode({ id: 'x', path: '/x.md', stamp: stamp(), body: '# Body' }),
      [],
      '0.2',
    ).content;
    for (let i = 0; i < 5; i++) {
      const { node, edges } = readNode(content, '/x.md');
      content = writeNode(node, edges, '0.2').content;
    }
    expect(readNode(content, '/x.md').node.body).toBe('# Body');
  });
});
