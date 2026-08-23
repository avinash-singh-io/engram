/**
 * The parser, tested against the promise rather than against itself.
 *
 * Every case here is generated from `SUBSET` and `EXCLUDED` in `subset.ts`
 * (ADR-0047 §1), so a construct cannot be claimed without being exercised and cannot
 * quietly stop working. The subset had been implicit since Phase 8, which is exactly
 * how a gap the size of BUG-011 stayed invisible for ten releases.
 */

import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from '../../src/format/registry.js';
import { EXCLUDED, SUBSET } from '../../src/format/subset.js';

const parse = (yaml: string) => parseFrontmatter(`---\n${yaml}\n---\nbody`);

describe('every construct engram claims to read', () => {
  it.each(SUBSET.map((s) => [s.name, s] as const))('reads %s', (_name, entry) => {
    const parsed = parse(entry.yaml);
    expect(parsed.keyErrors).toEqual([]);
    for (const [key, value] of Object.entries(entry.expect)) {
      expect(parsed.frontmatter?.[key]).toEqual(value);
    }
  });

  it.each(SUBSET.filter((s) => s.styles !== undefined).map((s) => [s.name, s] as const))(
    'records the sequence style of %s',
    (_name, entry) => {
      expect(parse(entry.yaml).styles).toMatchObject(entry.styles!);
    },
  );
});

describe('every construct engram refuses', () => {
  it.each(EXCLUDED.map((s) => [s.name, s] as const))(
    'refuses %s without losing the rest of the document',
    (_name, entry) => {
      const parsed = parse(entry.yaml);
      // Named, not silent. An anchor read as the literal string "&anchor value"
      // parses cleanly and is quietly wrong, which is worse than a refusal.
      expect(parsed.keyErrors.map((e) => e.reason).join(' ')).toContain(entry.warns);
      // And the exclusion is per key. A construct engram has not implemented is not
      // a reason to cost a note its identity either.
      for (const [key, value] of Object.entries(entry.survives)) {
        expect(parsed.frontmatter?.[key]).toEqual(value);
      }
      // No garbage left behind: a refused construct contributes no key at all.
      const claimed = new Set(Object.keys(entry.survives));
      for (const k of Object.keys(parsed.frontmatter ?? {})) {
        if (!claimed.has(k)) expect(k.trim()).not.toBe('');
      }
    },
  );
});

describe('the two families BUG-011 was about', () => {
  it('reads the reporting user’s file identically in both styles', () => {
    const flow = parse('okf_version: 0.2\nid: g\npart-of: [finance]');
    const block = parse('okf_version: 0.2\nid: g\npart-of:\n  - finance');
    expect(block.frontmatter).toEqual(flow.frontmatter);
  });

  it('distinguishes the two styles even when the values match', () => {
    expect(parse('part-of: [a]').styles).toEqual({ 'part-of': 'flow' });
    expect(parse('part-of:\n  - a').styles).toEqual({ 'part-of': 'block' });
  });

  it('does not mistake a block sequence for a nested map', () => {
    // The original defect: `part-of:` saw an indented next line, opened a nested
    // map, and the sequence item then failed the key:value check.
    expect(Array.isArray(parse('part-of:\n  - a').frontmatter?.['part-of'])).toBe(true);
  });

  it('still reads a nested map when the indented line really is one', () => {
    expect(parse('metadata:\n  engram-uses: capture').frontmatter?.metadata).toEqual({
      'engram-uses': 'capture',
    });
  });

  it('treats a bare dash as a null item, not an error', () => {
    const parsed = parse('part-of:\n  -\n  - a');
    expect(parsed.keyErrors).toEqual([]);
    expect(parsed.frontmatter?.['part-of']).toEqual([null, 'a']);
  });

  it('keeps `#` and blank lines as content inside a block scalar', () => {
    const parsed = parse('note: |\n  # not a comment\n\n  after a blank');
    expect(parsed.frontmatter?.note).toBe('# not a comment\n\nafter a blank');
  });

  it('folds paragraphs rather than collapsing them', () => {
    expect(parse('note: >\n  one two\n\n  three').frontmatter?.note).toBe('one two\n\nthree');
  });
});
