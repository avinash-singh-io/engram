import { describe, expect, it } from 'vitest';
import { makeNode } from '../../src/core/model.js';
import { guardrailNames } from '../../src/policy/guardrails.js';
import { format, slugify } from '../../src/ops/format.js';
import { readNode } from '../../src/format/registry.js';
import { fixedClock, memoryFileStore } from '../../src/substrate/index.js';

const AT = '2026-08-12T09:00:00.000Z';
const deps = (seed: Record<string, string> = {}) => ({
  files: memoryFileStore(seed),
  clock: fixedClock(AT),
});

describe('slugify is deterministic and lossy on purpose', () => {
  it.each([
    ['Hybrid Retrieval', 'hybrid-retrieval'],
    ['  Leading and trailing  ', 'leading-and-trailing'],
    ['Café Décisions', 'cafe-decisions'],
    ['C++ / Rust: a comparison', 'c-rust-a-comparison'],
    ['multiple---dashes', 'multiple-dashes'],
    ['ALL CAPS', 'all-caps'],
    ['2026 decisions', '2026-decisions'],
  ])('%s -> %s', (title, expected) => {
    expect(slugify(title)).toBe(expected);
  });

  it('is stable across calls', () => {
    expect(slugify('Retrieval Goes Hybrid')).toBe(slugify('Retrieval Goes Hybrid'));
  });

  it('caps length so a slug stays a name, not an encoding of the title', () => {
    expect(slugify('word '.repeat(60)).length).toBeLessThanOrEqual(80);
  });

  it('yields empty for input with nothing sluggable', () => {
    expect(slugify('!!! ???')).toBe('');
  });
});

describe('format is deterministic', () => {
  it('same input produces the same node and path', async () => {
    const a = await format('# Retrieval Goes Hybrid\n\nBody.', { by: 'agent' }, deps());
    const b = await format('# Retrieval Goes Hybrid\n\nBody.', { by: 'agent' }, deps());
    expect(a).toEqual(b);
  });

  it('derives the title from the first non-empty line when none is given', async () => {
    const r = await format('# Retrieval Goes Hybrid\n\nBody.', { by: 'a' }, deps());
    expect(r.outcome).toBe('applied');
    if (r.outcome === 'applied') expect(r.node.id).toBe('retrieval-goes-hybrid');
  });

  it('an explicit id wins over a derived one', async () => {
    const r = await format('# Some Title', { by: 'a', id: 'chosen-slug' }, deps());
    if (r.outcome === 'applied') expect(r.node.id).toBe('chosen-slug');
  });

  it('derives the path from the container', async () => {
    const r = await format('# Raft', { by: 'a', container: 'Distributed Systems' }, deps());
    if (r.outcome === 'applied') expect(r.node.path).toBe('/distributed-systems/raft.md');
  });

  it('an explicit path wins over a derived one', async () => {
    const r = await format('# Raft', { by: 'a', container: 'ds', path: '/custom/x.md' }, deps());
    if (r.outcome === 'applied') expect(r.node.path).toBe('/custom/x.md');
  });
});

describe('format never writes without passing the gate', () => {
  it('rejects when no identity can be derived, naming the rule', async () => {
    const d = deps();
    const r = await format('!!! ???', { by: 'a' }, d);
    expect(r.outcome).toBe('rejected');
    if (r.outcome === 'rejected') expect(r.rule).toBe('id-required');
    expect(await d.files.list()).toEqual([]);
  });

  it('rejects a self-relation and writes nothing', async () => {
    const d = deps();
    const r = await format('# X', { by: 'a', id: 'x', supersedes: ['x'] }, d);
    expect(r.outcome).toBe('rejected');
    if (r.outcome === 'rejected') expect(r.rule).toBe('no-self-relation');
    expect(await d.files.list()).toEqual([]);
  });

  it('an empty-content note is still formattable when a title is given', async () => {
    // ADR-0019: an empty node is valid. format must not require a body.
    const r = await format('', { by: 'a', title: 'Not Written Yet' }, deps());
    expect(r.outcome).toBe('applied');
    if (r.outcome === 'applied') expect(r.node.isEmpty).toBe(true);
  });
});

describe('the agent supplies the structure; engram records it', () => {
  it('turns a container into a part-of edge', async () => {
    const r = await format('# Raft', { by: 'a', container: 'consensus' }, deps());
    if (r.outcome === 'applied') {
      expect(r.edges).toContainEqual(
        expect.objectContaining({ from: 'raft', to: 'consensus', kind: 'part-of' }),
      );
    }
  });

  it('records supersedes and sources as the agent gave them', async () => {
    const r = await format(
      '# June Decision',
      { by: 'a', supersedes: ['march-decision'], sources: ['paper-x', 'paper-y'] },
      deps(),
    );
    if (r.outcome === 'applied') {
      expect(r.edges.filter((e) => e.kind === 'supersedes').map((e) => e.to)).toEqual([
        'march-decision',
      ]);
      expect(r.edges.filter((e) => e.kind === 'sources').map((e) => e.to)).toEqual([
        'paper-x',
        'paper-y',
      ]);
    }
  });

  it('persists the relations to frontmatter, readable back as edges', async () => {
    const d = deps();
    await format('# June', { by: 'a', supersedes: ['march'] }, d);
    const raw = (await d.files.read('/june.md'))!;
    expect(raw).toContain('supersedes: [march]');
    expect(readNode(raw, '/june.md').edges[0]!.to).toBe('march');
  });

  it('may point at a node that does not exist yet', async () => {
    const r = await format('# X', { by: 'a', sources: ['never-written'] }, deps());
    expect(r.outcome).toBe('applied');
  });
});

describe('agent-authored assertions are marked (ADR-0027 mitigation 2)', () => {
  it('notes when the assertion is agent-generated', async () => {
    const r = await format('# X', { by: 'claude-opus-5', generated: true }, deps());
    if (r.outcome === 'applied') {
      expect(r.warnings.join(' ')).toMatch(/agent-authored/);
      expect(r.node.stamp.by).toBe('claude-opus-5');
    }
  });

  it('does not mark a human assertion', async () => {
    const r = await format('# X', { by: 'avinash' }, deps());
    if (r.outcome === 'applied') expect(r.warnings.join(' ')).not.toMatch(/agent-authored/);
  });
});

describe('preventive guardrails run at the gate, not only in doctor', () => {
  const guardrails = { enabled: guardrailNames() };

  it('refuses an uncited synthesis and writes nothing', async () => {
    const d = { ...deps(), guardrails };
    const r = await format('# Synthesis of everything', { by: 'a', id: 'synthesis-x' }, d);
    expect(r.outcome).toBe('rejected');
    if (r.outcome === 'rejected') expect(r.rule).toBe('require-sources');
    expect(await d.files.list()).toEqual([]);
  });

  it('allows the same node once it cites a source', async () => {
    const d = { ...deps(), guardrails };
    const r = await format(
      '# Synthesis of everything',
      { by: 'a', id: 'synthesis-x', sources: ['paper'] },
      d,
    );
    expect(r.outcome).toBe('applied');
  });

  it('refuses a write outside the permitted path scope', async () => {
    const d = { ...deps(), guardrails: { ...guardrails, pathScope: ['/concepts/'] } };
    const r = await format('# X', { by: 'a', container: 'elsewhere' }, d);
    expect(r.outcome).toBe('rejected');
    if (r.outcome === 'rejected') expect(r.rule).toBe('path-scope');
  });

  it('refuses superseding a human assertion unattended', async () => {
    const human = makeNode({
      id: 'human-note',
      path: '/human-note.md',
      stamp: { by: 'avinash', at: AT, until: null },
    });
    const d = { ...deps(), guardrails, existing: [human] };
    const r = await format('# X', { by: 'agent', supersedes: ['human-note'] }, d);
    expect(r.outcome).toBe('rejected');
    if (r.outcome === 'rejected') expect(r.rule).toBe('no-supersede-verified');
  });

  it('refuses once the run rate limit is reached', async () => {
    const d = { ...deps(), guardrails: { ...guardrails, rateLimit: 5 }, writtenThisRun: 5 };
    const r = await format('# X', { by: 'a' }, d);
    expect(r.outcome).toBe('rejected');
    if (r.outcome === 'rejected') expect(r.rule).toBe('rate-limit');
  });

  it('applies normally when no guardrails are configured', async () => {
    const r = await format('# Synthesis of everything', { by: 'a', id: 'synthesis-x' }, deps());
    expect(r.outcome).toBe('applied');
  });
});
