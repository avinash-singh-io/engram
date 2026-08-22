import { describe, expect, it } from 'vitest';
import { diffLines, renderDiff } from '../../src/surface/diff.js';

const signs = (before: string, after: string) =>
  diffLines(before, after)
    .map((l) => l.sign)
    .join('');

describe('diffLines', () => {
  it('marks an unchanged file as entirely context', () => {
    expect(signs('a\nb', 'a\nb')).toBe('  ');
  });

  it('finds a single changed line rather than replacing the file', () => {
    expect(signs('a\nb\nc', 'a\nB\nc')).toBe(' -+ ');
  });

  it('handles an insertion', () => {
    expect(signs('a\nc', 'a\nb\nc')).toBe(' + ');
  });

  it('handles a deletion', () => {
    expect(signs('a\nb\nc', 'a\nc')).toBe(' - ');
  });

  it('treats a new file as all additions', () => {
    expect(signs('', 'a\nb')).toBe('++');
  });

  it('treats an emptied file as all deletions', () => {
    expect(signs('a\nb', '')).toBe('--');
  });

  it('reconstructs each side from its own lines', () => {
    const before = 'one\ntwo\nthree\nfour';
    const after = 'one\ntwo point five\nthree\nfour\nfive';
    const d = diffLines(before, after);

    expect(
      d
        .filter((l) => l.sign !== '+')
        .map((l) => l.text)
        .join('\n'),
    ).toBe(before);
    expect(
      d
        .filter((l) => l.sign !== '-')
        .map((l) => l.text)
        .join('\n'),
    ).toBe(after);
  });

  /** The quadratic LCS is capped; past it, correctness still holds. */
  it('falls back cleanly on a very large file', () => {
    const big = Array.from({ length: 2100 }, (_, i) => `line ${i}`).join('\n');
    const d = diffLines(big, `${big}\nextra`);
    expect(d.filter((l) => l.sign === '+')).toHaveLength(2101);
    expect(d.some((l) => l.sign === ' ')).toBe(false);
  });
});

describe('renderDiff', () => {
  it('says so when nothing changes', () => {
    expect(renderDiff('a\nb', 'a\nb')).toBe('  (no change)');
  });

  it('collapses unchanged runs far from any change', () => {
    const before = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n');
    const after = before.replace('line 15', 'CHANGED');
    const out = renderDiff(before, after);

    expect(out).toContain('- line 15');
    expect(out).toContain('+ CHANGED');
    expect(out).toContain('...');
    expect(out.split('\n').length).toBeLessThan(15);
  });

  it('keeps context around the change', () => {
    const before = 'a\nb\nc\nd\ne\nf\ng';
    expect(renderDiff(before, before.replace('d', 'D'))).toContain('  a');
  });
});
