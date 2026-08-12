import { describe, expect, it } from 'vitest';
import { makeEdge, makeNode } from '../../src/core/model.js';
import { validate } from '../../src/gate.js';
import { link } from '../../src/ops/link.js';
import { fixedClock, memoryFileStore } from '../../src/substrate/index.js';

const AT = '2026-08-12T09:00:00.000Z';
const stamp = { by: 'avinash', at: AT, until: null };

const V02 = [
  '---',
  'okf_version: 0.2',
  'id: hybrid-retrieval',
  `timestamp: ${AT}`,
  '---',
  '# Decision',
].join('\n');

const deps = (seed: Record<string, string> = {}) => ({
  files: memoryFileStore(seed),
  clock: fixedClock(AT),
  by: 'avinash',
});

describe('link asserts a typed relation through the gate', () => {
  it('applies a closed relation and persists it in frontmatter', async () => {
    const d = deps({ '/decisions/hybrid.md': V02 });
    const result = await link('/decisions/hybrid.md', 'graph-rag-only', 'supersedes', d);
    expect(result.outcome).toBe('applied');
    const written = (await d.files.read('/decisions/hybrid.md'))!;
    expect(written).toContain('supersedes: [graph-rag-only]');
    expect(written).toContain('# Decision');
  });

  it('preserves relations that were already there', async () => {
    const d = deps({ '/decisions/hybrid.md': V02 });
    await link('/decisions/hybrid.md', 'a', 'supersedes', d);
    await link('/decisions/hybrid.md', 'b', 'sources', d);
    const written = (await d.files.read('/decisions/hybrid.md'))!;
    expect(written).toContain('supersedes: [a]');
    expect(written).toContain('sources: [b]');
  });

  it('may point at a node that does not exist yet', async () => {
    // ADR-0019: authoring an edge must not require its target to be written.
    const d = deps({ '/decisions/hybrid.md': V02 });
    const result = await link('/decisions/hybrid.md', 'never-written', 'sources', d);
    expect(result.outcome).toBe('applied');
  });

  it('warns, but does not refuse, for a relation with no code behind it', async () => {
    // ADR-0022: free vocabulary is the point. It just carries no validity power.
    const d = deps({ '/decisions/hybrid.md': V02 });
    const result = await link('/decisions/hybrid.md', 'x', 'vibes-with', d);
    expect(result.outcome).toBe('applied');
    if (result.outcome === 'applied') {
      expect(result.warnings.join(' ')).toMatch(/not a closed relation/);
    }
  });

  it('works on a file that does not exist yet, rather than failing', async () => {
    const d = deps();
    const result = await link('/new.md', 'target', 'sources', d);
    expect(result.outcome).toBe('applied');
    expect(await d.files.read('/new.md')).toContain('sources: [target]');
  });
});

describe('the gate — a change is a proposed diff, not a file write', () => {
  const node = makeNode({ id: 'x', path: '/x.md', stamp });
  const change = (over = {}) => ({ path: '/x.md', node, edges: [], content: 'c', ...over });

  it('applies a well-formed change', () => {
    expect(validate(change()).outcome).toBe('apply');
  });

  it('rejects a change with no path, naming the rule that fired', () => {
    const v = validate(change({ path: '  ' }));
    expect(v.outcome).toBe('reject');
    if (v.outcome === 'reject') expect(v.rule).toBe('path-required');
  });

  it('rejects a node with no identity', () => {
    const v = validate(change({ node: makeNode({ id: ' ', path: '/x.md', stamp }) }));
    expect(v.outcome).toBe('reject');
    if (v.outcome === 'reject') expect(v.rule).toBe('id-required');
  });

  it('rejects a self-relation and says which one', () => {
    const v = validate(
      change({ edges: [makeEdge({ from: 'x', to: 'x', kind: 'supersedes', stamp })] }),
    );
    expect(v.outcome).toBe('reject');
    if (v.outcome === 'reject') {
      expect(v.rule).toBe('no-self-relation');
      expect(v.reason).toMatch(/cannot supersedes itself/);
    }
  });

  it('a rejected change leaves the file untouched', async () => {
    // The point of validating a diff rather than a write: nothing was applied.
    const d = deps({
      '/self.md': ['---', 'okf_version: 0.2', 'id: self', `timestamp: ${AT}`, '---', 'body'].join(
        '\n',
      ),
    });
    const before = await d.files.read('/self.md');
    const result = await link('/self.md', 'self', 'supersedes', d);
    expect(result.outcome).toBe('rejected');
    expect(await d.files.read('/self.md')).toBe(before);
  });
});
