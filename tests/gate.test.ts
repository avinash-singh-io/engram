import { describe, expect, it } from 'vitest';
import { makeEdge, makeNode, type AssertionStamp } from '../src/core/model.js';
import { validate } from '../src/gate.js';
import { format } from '../src/ops/format.js';
import { fixedClock, memoryFileStore } from '../src/substrate/index.js';
import {
  checkAll,
  guardrailNames,
  registerGuardrail,
  type GuardrailConfig,
} from '../src/policy/guardrails.js';

const AT = '2026-08-13T09:00:00.000Z';
const stamp = (by = 'agent'): AssertionStamp => ({ by, at: AT, until: null });
const node = (id: string, path = `/${id}.md`, by = 'agent') =>
  makeNode({ id, path, stamp: stamp(by), body: '# body' });

const change = (over: Record<string, unknown> = {}) => ({
  path: '/concepts/x.md',
  node: node('x', '/concepts/x.md'),
  edges: [],
  content: '# body',
  ...over,
});
const ctx = (over = {}) => ({ existing: [], edges: [], writtenThisRun: 0, ...over });
const guard = (config: GuardrailConfig) => ({ config, ctx: ctx() });

/**
 * v2-overview §5 has always given the gate three outcomes — APPLY, QUEUE, REJECT.
 * Phase 8 shipped two and said so; Phase 10 shipped `propose-only` as a *refusal*
 * whose message claims the change "needs human review before it applies". A gate
 * whose only answers are yes and no cannot be a review mechanism.
 */
describe('QUEUE — the third outcome', () => {
  it('a write into a propose-only path queues rather than rejects', () => {
    const r = validate(
      change({ path: '/decisions/x.md' }),
      guard({ enabled: ['propose-only'], proposeOnly: ['/decisions/'] }),
    );
    expect(r.outcome).toBe('queue');
  });

  it('carries the change intact, so the queue can hold the whole proposal', () => {
    const c = change({ path: '/decisions/x.md', content: '# the proposed body' });
    const r = validate(c, guard({ enabled: ['propose-only'], proposeOnly: ['/decisions/'] }));
    expect(r.outcome === 'queue' && r.change.content).toBe('# the proposed body');
  });

  it('names the rule that deferred it, so approve knows what to satisfy', () => {
    const r = validate(
      change({ path: '/decisions/x.md' }),
      guard({ enabled: ['propose-only'], proposeOnly: ['/decisions/'] }),
    );
    expect(r.outcome === 'queue' && r.rule).toBe('propose-only');
    expect(r.outcome === 'queue' && r.reason).toMatch(/human review/i);
  });

  it('a normal path still applies', () => {
    const r = validate(
      change(),
      guard({ enabled: guardrailNames(), proposeOnly: ['/decisions/'] }),
    );
    expect(r.outcome).toBe('apply');
  });

  it('a genuine violation still rejects', () => {
    const r = validate(
      change({
        node: node('synthesis-x', '/concepts/synthesis-x.md'),
        path: '/concepts/synthesis-x.md',
      }),
      guard({ enabled: ['require-sources'] }),
    );
    expect(r.outcome).toBe('reject');
    expect(r.outcome === 'reject' && r.rule).toBe('require-sources');
  });

  it('structural rejections are unaffected — they precede any guardrail', () => {
    expect(validate(change({ path: '  ' })).outcome).toBe('reject');
    expect(validate(change({ node: node(' ', '/x.md') })).outcome).toBe('reject');
  });
});

/**
 * The ordering rule. A change can trip a deferring rule *and* a refusing one; the
 * refusal has to win. Queueing something a hard rule forbids invites a human to
 * approve a change the gate will refuse anyway on replay — review theatre.
 */
describe('reject wins over queue', () => {
  const both = (enabled: string[]) =>
    validate(
      change({ path: '/decisions/x.md' }),
      guard({ enabled, proposeOnly: ['/decisions/'], pathScope: ['/concepts/'] }),
    );

  it('rejects when a refusing rule also fires, whatever the order', () => {
    expect(both(['propose-only', 'path-scope']).outcome).toBe('reject');
    expect(both(['path-scope', 'propose-only']).outcome).toBe('reject');
  });

  it('reports the refusing rule, not the deferring one', () => {
    const r = both(['propose-only', 'path-scope']);
    expect(r.outcome === 'reject' && r.rule).toBe('path-scope');
  });
});

/**
 * The mechanism must be general. Special-casing `propose-only` **by name** in the
 * gate would work today and break silently the first time a second rule wanted to
 * defer — it would reject instead, and nothing would say so. So the disposition is
 * declared by the rule, and a second one proves it.
 */
describe('the deferral is carried by disposition, never by rule name', () => {
  it('a newly registered rule declaring queue also queues', () => {
    registerGuardrail({
      name: 'test-defers',
      prevents: 'nothing — this rule exists to prove the gate does not name rules',
      disposition: 'queue',
      check: (c) => (c.path.startsWith('/held/') ? 'held for review by a second rule' : null),
      detect: () => [],
    });

    const r = validate(change({ path: '/held/x.md' }), guard({ enabled: ['test-defers'] }));
    expect(r.outcome).toBe('queue');
    expect(r.outcome === 'queue' && r.rule).toBe('test-defers');
  });

  it('the gate source does not mention propose-only', async () => {
    // Cheap and blunt, and it is the assertion that actually holds the line: a
    // name check reintroduced during a refactor passes every behavioural test above.
    const src = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../src/gate.ts', import.meta.url), 'utf8'),
    );
    expect(src).not.toMatch(/'propose-only'|"propose-only"/);
  });

  it('a rule that declares nothing rejects, as every existing rule does', () => {
    const r = checkAll(change({ node: node('synthesis-x'), path: '/x.md' }), ctx(), {
      enabled: ['require-sources'],
    });
    expect(r?.disposition).toBe('reject');
  });
});

describe('checkAll reports the disposition alongside the rule', () => {
  it('returns queue for a deferring rule', () => {
    const r = checkAll(change({ path: '/decisions/x.md' }), ctx(), {
      enabled: ['propose-only'],
      proposeOnly: ['/decisions/'],
    });
    expect(r).toMatchObject({ rule: 'propose-only', disposition: 'queue' });
  });

  it('returns null when nothing fires', () => {
    expect(checkAll(change(), ctx(), { enabled: guardrailNames() })).toBeNull();
  });

  it('still short-circuits on the first refusal', () => {
    const r = checkAll(
      change({
        node: node('synthesis-x', '/nope/synthesis-x.md'),
        path: '/nope/synthesis-x.md',
        edges: [makeEdge({ from: 'a', to: 'b', kind: 'sources', stamp: stamp() })],
      }),
      ctx(),
      { enabled: ['path-scope', 'require-sources'], pathScope: ['/concepts/'] },
    );
    expect(r?.rule).toBe('path-scope');
  });
});

/**
 * The regression this phase nearly shipped.
 *
 * Adding a third outcome to `GateResult` broke nothing that TypeScript could see:
 * `format` narrowed with `if (verdict.outcome === 'reject')` and fell through to
 * `files.write` for everything else. A guardrail that had been *refusing* writes
 * in the vault's most sensitive paths began silently *applying* them, and all 464
 * tests passed. So the assertion is about the filesystem, not the return value.
 */
describe('a deferred change does not reach the filesystem', () => {
  const deferring = {
    enabled: ['propose-only'],
    proposeOnly: ['/decisions/'],
  };

  it('format queues without writing the target', async () => {
    const files = memoryFileStore();
    const r = await format(
      '# A decision',
      { by: 'agent', id: 'x', path: '/decisions/x.md' },
      { files, clock: fixedClock(AT), guardrails: deferring },
    );

    expect(r.outcome).toBe('queued');
    expect(await files.read('/decisions/x.md')).toBeNull();
    // The only thing written is the proposal itself.
    expect(await files.list()).toEqual([
      `/.engram/queue/${r.outcome === 'queued' ? r.proposal.id : ''}.md`,
    ]);
  });

  it('and still writes when nothing defers', async () => {
    const files = memoryFileStore();
    const r = await format(
      '# A concept',
      { by: 'agent', id: 'y', path: '/concepts/y.md' },
      { files, clock: fixedClock(AT), guardrails: deferring },
    );

    expect(r.outcome).toBe('applied');
    expect(await files.read('/concepts/y.md')).toContain('id: y');
  });

  it('carries the proposal, so the queue has something to hold', async () => {
    const r = await format(
      '# A decision',
      { by: 'agent', id: 'x', path: '/decisions/x.md' },
      { files: memoryFileStore(), clock: fixedClock(AT), guardrails: deferring },
    );
    expect(r.outcome === 'queued' && r.proposal.content).toContain('id: x');
    expect(r.outcome === 'queued' && r.rule).toBe('propose-only');
  });
});
