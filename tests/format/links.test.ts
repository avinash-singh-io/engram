import { describe, expect, it } from 'vitest';
import * as links from '../../src/format/links.js';

/**
 * RESCUED FROM v1 — BUG-001 (shipped v0.6.5, CommonMark §6.3).
 *
 * The Phase 8 clean-room rewrite deletes the v1 implementation. Clean-room
 * forbids copying that code; it does NOT license re-introducing a fixed bug as
 * a fresh one. These assertions are the behaviour, carried over verbatim from
 * the v1 suite so the matrix that was learned the hard way is not rediscovered.
 *
 * SKIPPED DELIBERATELY — UNSKIP IN GROUP 3, where format/links.ts is written
 * test-first. Group 7 verifies no `describe.skip` survives the phase.
 */
describe.skip('encodeLinkTarget (BUG-001) — UNSKIP IN GROUP 3', () => {
  // Only the CommonMark-breaking characters are encoded; `&`, `+` and `—` stay
  // readable, because a destination humans cannot read is its own defect.
  it.each([
    ['/dir/Five Dimensions.md', '/dir/Five%20Dimensions.md'],
    ['/dir/OKF Genome & Storage.md', '/dir/OKF%20Genome%20&%20Storage.md'],
    ['/dir/Working Memory + Context.md', '/dir/Working%20Memory%20+%20Context.md'],
    ['/dir/Core Thesis — Memory.md', '/dir/Core%20Thesis%20—%20Memory.md'],
    ['/dir/no-spaces.md', '/dir/no-spaces.md'],
  ])('encodes %s -> %s', (raw, expected) => {
    expect(links.encodeLinkTarget(raw)).toBe(expected);
  });

  it('balances parens a bare CommonMark destination requires', () => {
    expect(links.encodeLinkTarget('/dir/Notes (draft).md')).toBe('/dir/Notes%20%28draft%29.md');
  });

  it('encodes a literal percent so decoding is well-defined', () => {
    expect(links.encodeLinkTarget('/dir/50% off.md')).toBe('/dir/50%25%20off.md');
  });

  it('encodes tabs and other control chars', () => {
    expect(links.encodeLinkTarget('/dir/a\tb.md')).toBe('/dir/a%09b.md');
  });

  it('preserves `/` separators (encodes per segment)', () => {
    expect(links.encodeLinkTarget('/a b/c d/e f.md')).toBe('/a%20b/c%20d/e%20f.md');
  });

  it('encodes the path and the #fragment independently', () => {
    expect(links.encodeLinkTarget('/dir/My File.md#My Heading')).toBe(
      '/dir/My%20File.md#My%20Heading',
    );
  });

  it('leaves external URLs untouched', () => {
    expect(links.encodeLinkTarget('https://example.com/a/b')).toBe('https://example.com/a/b');
  });

  it('does not double-encode an already-encoded target', () => {
    expect(links.encodeLinkTarget('/dir/My%20File.md')).toBe('/dir/My%20File.md');
    expect(links.encodeLinkTarget('/dir/Notes%20%28draft%29.md')).toBe(
      '/dir/Notes%20%28draft%29.md',
    );
  });

  it('is idempotent: encode(encode(x)) === encode(x)', () => {
    for (const raw of [
      '/dir/My File.md',
      '/a b/Notes (v2).md#On Spaces',
      '/dir/50% off.md',
      '/dir/no-spaces.md',
    ]) {
      const once = links.encodeLinkTarget(raw);
      expect(links.encodeLinkTarget(once)).toBe(once);
    }
  });
});

describe.skip('decodeLinkTarget (BUG-001) — UNSKIP IN GROUP 3', () => {
  it('round-trips: decode(encode(p)) === p', () => {
    for (const raw of [
      '/dir/Five Dimensions.md',
      '/dir/OKF Genome & Storage.md',
      '/dir/Working Memory + Context.md',
      '/dir/Core Thesis — Memory.md',
      '/dir/Notes (draft).md',
      '/dir/50% off.md',
      '/a b/c d/My File.md#Some Heading',
      '/dir/no-spaces.md',
    ]) {
      expect(links.decodeLinkTarget(links.encodeLinkTarget(raw))).toBe(raw);
    }
  });

  it('leaves a malformed percent-escape verbatim (no throw)', () => {
    expect(links.decodeLinkTarget('/dir/100%.md')).toBe('/dir/100%.md');
  });

  it('leaves external URLs untouched', () => {
    expect(links.decodeLinkTarget('https://example.com/a%20b')).toBe('https://example.com/a%20b');
  });
});

describe.skip('extractMarkdownLinks decodes targets for matching — UNSKIP IN GROUP 3', () => {
  it('returns filesystem-true (decoded) targets', () => {
    const found = links.extractMarkdownLinks(
      'See [X](/dir/My%20File.md) and [Y](/dir/no-spaces.md).',
    );
    expect(found.map((l: { target: string }) => l.target)).toEqual([
      '/dir/My File.md',
      '/dir/no-spaces.md',
    ]);
  });
});
