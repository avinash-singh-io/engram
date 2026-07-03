import { describe, expect, it } from 'vitest';
import { ReadLedger } from '../../src/retrieval/reader';
import { grepFrontmatter, toFrontmatterMatch } from '../../src/retrieval/scan';
import { FIXTURE_VAULT } from './fixture';

describe('scan / grepFrontmatter', () => {
  it('greps by tag, routing every read through the grep tier and reading no bodies', () => {
    const l = new ReadLedger(FIXTURE_VAULT);
    const m = grepFrontmatter(FIXTURE_VAULT, l, { tags: ['rust'] });
    expect(m.length).toBeGreaterThan(0);
    expect(m.every((x) => x.tags.includes('rust'))).toBe(true);
    const r = l.report(126);
    expect(r.byTier.grep.reads).toBe(126);
    expect(r.bodyReads).toBe(0);
  });

  it('greps by type', () => {
    const l = new ReadLedger(FIXTURE_VAULT);
    const m = grepFrontmatter(FIXTURE_VAULT, l, { type: 'Drill-Map' });
    expect(m.length).toBeGreaterThan(0);
    expect(m.every((x) => x.type === 'Drill-Map')).toBe(true);
  });

  it('greps by term and ranks the strongest match first', () => {
    const l = new ReadLedger(FIXTURE_VAULT);
    const m = grepFrontmatter(FIXTURE_VAULT, l, { terms: ['bloom'] });
    expect(m[0]?.id).toBe('algorithms/probabilistic/bloom-filters');
    expect(m[0]?.matchedFields).toContain('title');
  });

  it('caps the returned output (bounded)', () => {
    const l = new ReadLedger(FIXTURE_VAULT);
    const m = grepFrontmatter(FIXTURE_VAULT, l, { tags: ['databases'], cap: 3 });
    expect(m.length).toBeLessThanOrEqual(3);
  });

  it('shapes a frontmatter mapping into a normalized match record', () => {
    const shaped = toFrontmatterMatch(
      { title: 'X', description: 'd', tags: ['a', 1, 'b'], type: 'Reference' },
      'dir/x.md',
    );
    expect(shaped.id).toBe('dir/x');
    expect(shaped.link).toBe('/dir/x.md');
    expect(shaped.tags).toEqual(['a', 'b']);
    expect(shaped.type).toBe('Reference');
  });
});
