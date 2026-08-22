import { describe, expect, it } from 'vitest';
import { OPERATIONS } from '../../src/policy/skill-schema.js';
import { format } from '../../src/ops/format.js';
import {
  ABSENT,
  approve,
  basisOf,
  digest,
  listProposals,
  propose,
  QUEUE_DIR,
  rejectProposal,
  showProposal,
} from '../../src/ops/queue.js';
import { guardrailNames, type GuardrailConfig } from '../../src/policy/guardrails.js';
import { makeNode, type AssertionStamp } from '../../src/core/model.js';
import { fixedClock, memoryFileStore } from '../../src/substrate/index.js';
import type { Change } from '../../src/gate.js';

const AT = '2026-08-13T09:00:00.000Z';
const stamp = (by = 'agent'): AssertionStamp => ({ by, at: AT, until: null });

const deferring: GuardrailConfig = {
  enabled: guardrailNames(),
  proposeOnly: ['/decisions/'],
};

const deps = (seed: Record<string, string> = {}) => ({
  files: memoryFileStore(seed),
  clock: fixedClock(AT),
  by: 'tester',
});

const change = (over: Partial<Change> = {}): Change => ({
  path: '/decisions/d1.md',
  node: makeNode({ id: 'd1', path: '/decisions/d1.md', stamp: stamp(), body: '# D1' }),
  edges: [],
  content: '---\nokf_version: 0.2\nid: d1\ntimestamp: 2026-08-13T09:00:00.000Z\n---\n# D1\n',
  ...over,
});

const fired = { rule: 'propose-only', reason: '/decisions/d1.md is propose-only — held' };

/** Queue a real change the way `format` does, so tests exercise the wired path. */
const queueOne = async (d: ReturnType<typeof deps>, id = 'd1') => {
  const r = await format(
    `# ${id}`,
    { by: 'agent', id, path: `/decisions/${id}.md` },
    { files: d.files, clock: d.clock, guardrails: deferring },
  );
  if (r.outcome !== 'queued') throw new Error(`expected queued, got ${r.outcome}`);
  return r.proposal;
};

describe('the queue is state, not an eighth operation', () => {
  it('adds no operation — a skill cannot sequence approval', () => {
    expect([...OPERATIONS]).toEqual(['init', 'capture', 'format', 'link', 'reindex', 'doctor']);
    expect(OPERATIONS).toHaveLength(6);
  });
});

describe('propose', () => {
  it('writes a proposal and leaves the target alone', async () => {
    const d = deps();
    const p = await propose(change(), fired, d);

    expect(await d.files.read('/decisions/d1.md')).toBeNull();
    expect(await d.files.exists(`${QUEUE_DIR}/${p.id}.md`)).toBe(true);
  });

  /**
   * §12: everything survives engram being uninstalled — `cat`, `rg`, git and
   * Obsidian keep working. A queue in a database would be the one exception, and
   * it would be the exception exactly where someone most needs to see what an
   * agent wanted to do.
   */
  it('is plain readable markdown, with the proposal legible in it', async () => {
    const d = deps();
    const p = await propose(change(), fired, d);
    const raw = (await d.files.read(`${QUEUE_DIR}/${p.id}.md`)) ?? '';

    expect(raw).toMatch(/^---\n/);
    expect(raw).toContain('target: /decisions/d1.md');
    expect(raw).toContain('rule: propose-only');
    expect(raw).toContain('status: pending');
    expect(raw).toContain('# D1');
  });

  it('round-trips the proposed content byte for byte', async () => {
    const d = deps();
    const c = change();
    const p = await propose(c, fired, d);

    expect((await showProposal(d.files, p.id))?.content).toBe(c.content);
  });

  it('records the basis of an existing target', async () => {
    const d = deps({ '/decisions/d1.md': 'the current content' });
    const p = await propose(change(), fired, d);

    expect(p.basis).toBe(await digest('the current content'));
  });

  it('records ABSENT when the target does not exist yet', async () => {
    const p = await propose(change(), fired, deps());
    expect(p.basis).toBe(ABSENT);
  });

  it('gives distinct ids to distinct proposals', async () => {
    const d = deps();
    const a = await propose(change(), fired, d);
    const b = await propose(change({ content: 'different' }), fired, d);
    expect(a.id).not.toBe(b.id);
  });
});

describe('list and show', () => {
  it('lists pending proposals and hides resolved ones', async () => {
    const d = deps();
    const a = await queueOne(d, 'd1');
    const b = await queueOne(d, 'd2');

    await rejectProposal(a.id, 'not this one', d);

    expect((await listProposals(d.files)).map((p) => p.id)).toEqual([b.id]);
  });

  it('returns resolved proposals when asked — the queue is also the record', async () => {
    const d = deps();
    const p = await queueOne(d);
    await rejectProposal(p.id, 'no', d);

    expect(await listProposals(d.files)).toHaveLength(0);
    expect(await listProposals(d.files, { all: true })).toHaveLength(1);
  });

  it('reads nothing outside the queue directory', async () => {
    const d = deps({ '/concepts/a.md': '# not a proposal' });
    expect(await listProposals(d.files)).toEqual([]);
  });

  it('show returns null for an unknown id rather than throwing', async () => {
    expect(await showProposal(memoryFileStore(), 'nope')).toBeNull();
  });
});

describe('approve', () => {
  it('applies the proposal to the target', async () => {
    const d = deps();
    const p = await queueOne(d);

    const r = await approve(p.id, deferring, d);
    expect(r.outcome).toBe('applied');
    expect(await d.files.read('/decisions/d1.md')).toBe(p.content);
  });

  it('keeps the entry as a record rather than deleting it', async () => {
    const d = deps();
    const p = await queueOne(d);
    await approve(p.id, deferring, d);

    const after = await showProposal(d.files, p.id);
    expect(after?.status).toBe('approved');
    expect(after?.resolvedBy).toBe('tester');
    expect(await listProposals(d.files)).toEqual([]);
  });

  /**
   * ADR-0042. The proposal carries the whole file it would write, so a target that
   * moved on would be clobbered — the corruption ADR-0028 exists to prevent,
   * reintroduced by the review mechanism itself. Engram refuses; it does not merge.
   */
  it('refuses a stale proposal and writes nothing', async () => {
    const d = deps();
    const p = await queueOne(d);

    await d.files.write('/decisions/d1.md', '# someone got there first');

    const r = await approve(p.id, deferring, d);
    expect(r.outcome).toBe('stale');
    expect(await d.files.read('/decisions/d1.md')).toBe('# someone got there first');
  });

  it('names the drift, so the human can see what changed under it', async () => {
    const d = deps();
    const p = await queueOne(d);
    await d.files.write('/decisions/d1.md', 'moved on');

    const r = await approve(p.id, deferring, d);
    expect(r.outcome === 'stale' && r.expected).toBe(ABSENT);
    expect(r.outcome === 'stale' && r.found).toBe(await digest('moved on'));
  });

  it('leaves a stale proposal pending, so it can be re-reviewed', async () => {
    const d = deps();
    const p = await queueOne(d);
    await d.files.write('/decisions/d1.md', 'moved on');
    await approve(p.id, deferring, d);

    expect((await showProposal(d.files, p.id))?.status).toBe('pending');
  });

  /**
   * Approval satisfies the rule that deferred the change — not every rule. A human
   * approved a deferral, not an exemption.
   */
  it('replays through the gate, so another rule can still refuse', async () => {
    const d = deps();
    // Queued while only `propose-only` was in force; approved after the vault
    // turned `require-sources` on. A config can change between the two, and the
    // second rule has to hold at the moment the write actually happens.
    const r = await format(
      '# A synthesis with no sources',
      { by: 'agent', id: 'synthesis-x', path: '/decisions/synthesis-x.md' },
      {
        files: d.files,
        clock: d.clock,
        guardrails: { enabled: ['propose-only'], proposeOnly: ['/decisions/'] },
      },
    );
    if (r.outcome !== 'queued') throw new Error(`expected queued, got ${r.outcome}`);

    const verdict = await approve(r.proposal.id, deferring, d);
    expect(verdict.outcome).toBe('rejected');
    expect(verdict.outcome === 'rejected' && verdict.rule).toBe('require-sources');
    expect(await d.files.read('/decisions/synthesis-x.md')).toBeNull();
  });

  it('does not re-defer on the rule that queued it — that would never terminate', async () => {
    const d = deps();
    const p = await queueOne(d);
    expect((await approve(p.id, deferring, d)).outcome).toBe('applied');
  });

  it('reports a missing id rather than throwing', async () => {
    expect((await approve('nope', deferring, deps())).outcome).toBe('missing');
  });

  it('refuses to approve something already resolved', async () => {
    const d = deps();
    const p = await queueOne(d);
    await approve(p.id, deferring, d);
    expect((await approve(p.id, deferring, d)).outcome).toBe('resolved');
  });
});

describe('reject', () => {
  it('discards with a note and never touches the target', async () => {
    const d = deps();
    const p = await queueOne(d);

    const r = await rejectProposal(p.id, 'wrong container', d);
    expect(r.outcome).toBe('rejected');
    expect(await d.files.read('/decisions/d1.md')).toBeNull();

    const after = await showProposal(d.files, p.id);
    expect(after?.status).toBe('rejected');
    expect(after?.note).toBe('wrong container');
  });

  it('accepts no note', async () => {
    const d = deps();
    const p = await queueOne(d);
    await rejectProposal(p.id, '', d);
    expect((await showProposal(d.files, p.id))?.note).toBeUndefined();
  });

  it('reports a missing id rather than throwing', async () => {
    expect((await rejectProposal('nope', 'x', deps())).outcome).toBe('missing');
  });
});

describe('basisOf', () => {
  it('is ABSENT for a path with no file', async () => {
    expect(await basisOf(memoryFileStore(), '/nope.md')).toBe(ABSENT);
  });

  it('changes when the content changes', async () => {
    const files = memoryFileStore({ '/a.md': 'one' });
    const before = await basisOf(files, '/a.md');
    await files.write('/a.md', 'two');
    expect(await basisOf(files, '/a.md')).not.toBe(before);
  });
});
