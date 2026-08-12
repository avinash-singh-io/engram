import { describe, expect, it } from 'vitest';
import { makeEdge, makeNode, type AssertionStamp } from '../../src/core/model.js';
import {
  checkAll,
  detectAll,
  getGuardrail,
  guardrailNames,
  tighten,
  type GuardrailConfig,
} from '../../src/policy/guardrails.js';

const AT = '2026-08-12T09:00:00.000Z';
const stamp = (by = 'agent'): AssertionStamp => ({ by, at: AT, until: null });
const node = (id: string, path = `/${id}.md`, by = 'agent') =>
  makeNode({ id, path, stamp: stamp(by), body: '# body' });
const edge = (from: string, to: string, kind: string) =>
  makeEdge({ from, to, kind, stamp: stamp() });

const change = (over: Record<string, unknown> = {}) => ({
  path: '/concepts/x.md',
  node: node('x', '/concepts/x.md'),
  edges: [],
  content: '# body',
  ...over,
});
const ctx = (over = {}) => ({ existing: [], edges: [], writtenThisRun: 0, ...over });
const all = (over: Partial<GuardrailConfig> = {}): GuardrailConfig => ({
  enabled: guardrailNames(),
  ...over,
});

/**
 * v2-overview §7: engram mediates two of the four write paths, because Obsidian
 * and any agent with a shell write directly. A rule enforceable only at the gate
 * is advisory, so this is asserted rather than reviewed.
 */
describe('every guardrail ships in two halves', () => {
  it('registers six rules', () => {
    expect(guardrailNames()).toEqual([
      'no-delete',
      'no-supersede-verified',
      'path-scope',
      'propose-only',
      'rate-limit',
      'require-sources',
    ]);
  });

  it.each(guardrailNames())('%s has a preventive AND a detective half', (name) => {
    const rule = getGuardrail(name)!;
    expect(typeof rule.check).toBe('function');
    expect(typeof rule.detect).toBe('function');
    expect(rule.prevents.length).toBeGreaterThan(0);
  });
});

describe('preventive halves refuse what they should, naming the rule', () => {
  it('no-delete refuses emptying an existing node', () => {
    const v = checkAll(change({ content: '   ' }), ctx(), all());
    expect(v?.rule).toBe('no-delete');
    expect(v?.reason).toMatch(/deprecate or supersede/);
  });

  it('require-sources refuses an uncited synthesis', () => {
    const v = checkAll(change({ node: node('synthesis-x', '/synthesis-x.md') }), ctx(), all());
    expect(v?.rule).toBe('require-sources');
  });

  it('require-sources allows a cited synthesis', () => {
    const v = checkAll(
      change({
        node: node('synthesis-x', '/synthesis-x.md'),
        edges: [edge('synthesis-x', 'paper', 'sources')],
      }),
      ctx(),
      all(),
    );
    expect(v).toBeNull();
  });

  it('no-supersede-verified refuses superseding a human assertion', () => {
    const human = node('human-note', '/human-note.md', 'avinash');
    const v = checkAll(
      change({ edges: [edge('x', 'human-note', 'supersedes')] }),
      ctx({ existing: [human] }),
      all(),
    );
    expect(v?.rule).toBe('no-supersede-verified');
    expect(v?.reason).toMatch(/human assertion/);
  });

  it('propose-only refuses an autonomous write in a scoped path', () => {
    const v = checkAll(
      change({ path: '/decisions/big.md' }),
      ctx(),
      all({ proposeOnly: ['/decisions/'] }),
    );
    expect(v?.rule).toBe('propose-only');
  });

  it('path-scope refuses a write outside the permitted set', () => {
    const v = checkAll(
      change({ path: '/etc/passwd.md' }),
      ctx(),
      all({ pathScope: ['/concepts/'] }),
    );
    expect(v?.rule).toBe('path-scope');
  });

  it('path-scope allows a write inside it', () => {
    expect(
      checkAll(change({ path: '/concepts/x.md' }), ctx(), all({ pathScope: ['/concepts/'] })),
    ).toBeNull();
  });

  it('rate-limit refuses once the run cap is reached', () => {
    const v = checkAll(change(), ctx({ writtenThisRun: 20 }), all({ rateLimit: 20 }));
    expect(v?.rule).toBe('rate-limit');
  });

  it('a rule not enabled does not run', () => {
    expect(checkAll(change({ content: '  ' }), ctx(), { enabled: [] })).toBeNull();
  });
});

describe('detective halves catch writes the gate never saw', () => {
  it('finds an uncited synthesis written directly in Obsidian', () => {
    const hits = detectAll([node('synthesis-x')], [], all());
    expect(hits.find((h) => h.rule === 'require-sources')!.hits.join(' ')).toMatch(/no sources/);
  });

  it('finds an agent superseding a human assertion', () => {
    const hits = detectAll(
      [node('human-note', '/h.md', 'avinash'), node('agent-note')],
      [edge('agent-note', 'human-note', 'supersedes')],
      all(),
    );
    expect(hits.find((h) => h.rule === 'no-supersede-verified')!.hits).toHaveLength(1);
  });

  it('finds an agent write outside the permitted scope', () => {
    const hits = detectAll([node('x', '/elsewhere/x.md')], [], all({ pathScope: ['/concepts/'] }));
    expect(hits.find((h) => h.rule === 'path-scope')!.hits).toHaveLength(1);
  });

  it('finds a day where the agent exceeded the rate limit', () => {
    const many = Array.from({ length: 25 }, (_, i) => node(`n${i}`));
    const hits = detectAll(many, [], all({ rateLimit: 20 }));
    expect(hits.find((h) => h.rule === 'rate-limit')!.hits.join(' ')).toMatch(/25 agent-authored/);
  });

  it('finds a supersedes edge pointing at something that no longer exists', () => {
    const hits = detectAll([node('a')], [edge('a', 'deleted-thing', 'supersedes')], all());
    expect(hits.find((h) => h.rule === 'no-delete')!.hits.join(' ')).toMatch(/was it deleted/);
  });

  it('reports clean on a well-formed vault', () => {
    const hits = detectAll([node('a'), node('b')], [edge('a', 'b', 'sources')], {
      enabled: guardrailNames(),
    });
    expect(hits.every((h) => h.hits.length === 0)).toBe(true);
  });
});

/**
 * The constraint that bounds the blast radius of a downloaded skill in Phase 15.
 * It exists before skills do, deliberately — a constraint added after the thing
 * it constrains is not a constraint.
 */
describe('a guardrail configuration may tighten but never loosen', () => {
  const base: GuardrailConfig = {
    enabled: ['path-scope'],
    pathScope: ['/concepts/', '/decisions/'],
    rateLimit: 20,
  };

  it('adding a rule tightens', () => {
    expect(tighten(base, { enabled: ['rate-limit'] }).enabled.sort()).toEqual([
      'path-scope',
      'rate-limit',
    ]);
  });

  it('cannot REMOVE a rule', () => {
    expect(tighten(base, { enabled: [] }).enabled).toContain('path-scope');
  });

  it('narrowing the path scope tightens', () => {
    expect(tighten(base, { pathScope: ['/concepts/'] }).pathScope).toEqual(['/concepts/']);
  });

  it('cannot WIDEN the path scope — an unlisted path is not granted', () => {
    const result = tighten(base, { pathScope: ['/concepts/', '/decisions/', '/anywhere/'] });
    expect(result.pathScope).not.toContain('/anywhere/');
  });

  it('lowering the rate limit tightens', () => {
    expect(tighten(base, { rateLimit: 5 }).rateLimit).toBe(5);
  });

  it('cannot RAISE the rate limit', () => {
    expect(tighten(base, { rateLimit: 1000 }).rateLimit).toBe(20);
  });

  it('adding propose-only paths tightens', () => {
    expect(tighten(base, { proposeOnly: ['/decisions/'] }).proposeOnly).toContain('/decisions/');
  });

  it('a request that loosens everything at once still cannot', () => {
    const result = tighten(base, {
      enabled: [],
      pathScope: ['/'],
      rateLimit: 9999,
      proposeOnly: [],
    });
    expect(result.enabled).toContain('path-scope');
    expect(result.pathScope).not.toContain('/');
    expect(result.rateLimit).toBe(20);
  });
});
