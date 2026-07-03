import { describe, expect, it } from 'vitest';
import { navigate } from '../../src/retrieval/navigate';
import { FIXTURE_VAULT } from './fixture';

describe('navigate', () => {
  it('descends the index tree and returns the top concept without reading bodies', () => {
    const r = navigate(FIXTURE_VAULT, 'raft consensus leader election');
    expect(r.results[0]?.id).toBe('distributed-systems/consensus/raft-consensus');
    expect(r.results[0]?.via).toBe('index');
    expect(r.report.bodyReads).toBe(0);
    expect(r.report.byTier.index.reads).toBeGreaterThan(1);
  });

  it('returns references with title, description, link, and a why-trail', () => {
    const top = navigate(FIXTURE_VAULT, 'idempotency keys retries').results[0];
    expect(top?.link).toBe('/system-design/idempotency-patterns.md');
    expect(top?.description).toContain('Effectively-once');
    expect(top?.why.length).toBeGreaterThan(0);
    expect(top?.sections).toBeUndefined();
  });

  it('never exceeds the body-read budget', () => {
    const r = navigate(FIXTURE_VAULT, 'temporal', { sections: true, max: 5, maxBodyReads: 2 });
    expect(r.report.bodyReads).toBeLessThanOrEqual(2);
  });

  it('follows one hop of links from the top reference', () => {
    const r = navigate(FIXTURE_VAULT, 'temporal workflow determinism replay', { hops: 1 });
    expect(r.results.some((x) => x.via === 'link')).toBe(true);
    expect(r.report.bodyReads).toBeGreaterThanOrEqual(1);
  });

  it('extracts matched headings under --sections (bounded body reads)', () => {
    const r = navigate(FIXTURE_VAULT, 'distributed tracing context', { sections: true, max: 2 });
    expect(r.results[0]?.sections).toBeDefined();
    expect(r.report.byTier.body.reads).toBeLessThanOrEqual(2);
  });

  it('filters by tag via bounded frontmatter confirmation', () => {
    const r = navigate(FIXTURE_VAULT, 'negotiation', { tags: ['interview'] });
    expect(r.results[0]?.id).toBe('interview/salary-negotiation');
    expect(r.results.every((x) => x.tags?.includes('interview'))).toBe(true);
  });

  it('falls back to frontmatter grep when a tag-only term misses the index map', () => {
    // "sre" appears only in tags, never in an index bullet's title/description.
    const r = navigate(FIXTURE_VAULT, 'sre');
    expect(r.results.length).toBeGreaterThan(0);
    expect(r.results.every((x) => x.via === 'grep')).toBe(true);
    expect(r.report.byTier.grep.reads).toBeGreaterThan(0);
    expect(r.report.bodyReads).toBe(0);
  });

  it('browses by tag with no query terms', () => {
    const r = navigate(FIXTURE_VAULT, '', { tags: ['rust'], max: 3 });
    expect(r.results.length).toBeGreaterThan(0);
    expect(r.results.every((x) => x.via === 'grep')).toBe(true);
  });

  it('returns no results and suggestions for an unmatched query', () => {
    const r = navigate(FIXTURE_VAULT, 'xylophone zzzz flibberflabber');
    expect(r.results).toHaveLength(0);
    expect(r.suggestions?.length).toBeGreaterThan(0);
  });

  it('respects the max cap', () => {
    const r = navigate(FIXTURE_VAULT, 'databases index', { max: 2 });
    expect(r.results.length).toBeLessThanOrEqual(2);
  });
});
