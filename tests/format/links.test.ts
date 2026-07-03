import { describe, expect, it } from 'vitest';
import { decodeLinkTarget, encodeLinkTarget, extractMarkdownLinks } from '../../src/format/links';
import { generateIndex } from '../../src/indexer/generate';
import { parseIndex } from '../../src/retrieval/index-parse';

describe('encodeLinkTarget (BUG-001)', () => {
  // The report's test matrix: only the CommonMark-breaking chars are encoded;
  // `&`, `+`, and `—` stay readable.
  it.each([
    ['/dir/Five Dimensions.md', '/dir/Five%20Dimensions.md'],
    ['/dir/OKF Genome & Storage.md', '/dir/OKF%20Genome%20&%20Storage.md'],
    ['/dir/Working Memory + Context.md', '/dir/Working%20Memory%20+%20Context.md'],
    ['/dir/Core Thesis — Memory.md', '/dir/Core%20Thesis%20—%20Memory.md'],
    ['/dir/no-spaces.md', '/dir/no-spaces.md'],
  ])('encodes %s -> %s', (raw, expected) => {
    expect(encodeLinkTarget(raw)).toBe(expected);
  });

  it('balances parens a bare CommonMark destination requires', () => {
    expect(encodeLinkTarget('/dir/Notes (draft).md')).toBe('/dir/Notes%20%28draft%29.md');
  });

  it('encodes a literal percent so decoding is well-defined', () => {
    expect(encodeLinkTarget('/dir/50% off.md')).toBe('/dir/50%25%20off.md');
  });

  it('encodes tabs and other control chars', () => {
    expect(encodeLinkTarget('/dir/a\tb.md')).toBe('/dir/a%09b.md');
  });

  it('preserves `/` separators (encodes per segment)', () => {
    expect(encodeLinkTarget('/a b/c d/e f.md')).toBe('/a%20b/c%20d/e%20f.md');
  });

  it('encodes the path and the #fragment independently', () => {
    expect(encodeLinkTarget('/dir/My File.md#My Heading')).toBe('/dir/My%20File.md#My%20Heading');
  });

  it('leaves external URLs untouched', () => {
    expect(encodeLinkTarget('https://example.com/a/b')).toBe('https://example.com/a/b');
  });

  it('does not double-encode an already-encoded target', () => {
    expect(encodeLinkTarget('/dir/My%20File.md')).toBe('/dir/My%20File.md');
    expect(encodeLinkTarget('/dir/Notes%20%28draft%29.md')).toBe('/dir/Notes%20%28draft%29.md');
  });

  it('is idempotent: encode(encode(x)) === encode(x)', () => {
    for (const raw of [
      '/dir/My File.md',
      '/a b/Notes (v2).md#On Spaces',
      '/dir/50% off.md',
      '/dir/no-spaces.md',
    ]) {
      const once = encodeLinkTarget(raw);
      expect(encodeLinkTarget(once)).toBe(once);
    }
  });
});

describe('decodeLinkTarget (BUG-001)', () => {
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
      expect(decodeLinkTarget(encodeLinkTarget(raw))).toBe(raw);
    }
  });

  it('leaves a malformed percent-escape verbatim (no throw)', () => {
    expect(decodeLinkTarget('/dir/100%.md')).toBe('/dir/100%.md');
  });

  it('leaves external URLs untouched', () => {
    expect(decodeLinkTarget('https://example.com/a%20b')).toBe('https://example.com/a%20b');
  });
});

describe('extractMarkdownLinks decodes targets for matching', () => {
  it('returns filesystem-true (decoded) targets', () => {
    const links = extractMarkdownLinks('See [X](/dir/My%20File.md) and [Y](/dir/no-spaces.md).');
    expect(links.map((l) => l.target)).toEqual(['/dir/My File.md', '/dir/no-spaces.md']);
  });
});

describe('emit -> parse round-trip (the reproduced failure)', () => {
  it('generateIndex + parseIndex recover a spaced concept path', () => {
    const md = generateIndex({
      concepts: [
        {
          title: 'My Spaced Title',
          path: '/demo/My Spaced Title.md',
          description: 'One line.',
          id: 'demo/My Spaced Title',
        },
      ],
      children: [],
      isRoot: false,
      dirLabel: 'demo',
    });
    // Emitted destination is CommonMark-safe...
    expect(md).toContain('](/demo/My%20Spaced%20Title.md)');
    expect(md).not.toContain('My Spaced Title.md)'); // no raw space in the destination
    // ...and parses back to the true filesystem path (previously dropped entirely).
    const parsed = parseIndex(md);
    expect(parsed.concepts).toHaveLength(1);
    expect(parsed.concepts[0]?.target).toBe('/demo/My Spaced Title.md');
  });

  it('keeps no-space index output byte-identical (ADR-0006)', () => {
    const input = {
      concepts: [{ title: 'Alpha', path: '/d/alpha.md', description: 'A.', id: 'd/alpha' }],
      children: [],
      isRoot: false,
      dirLabel: 'd',
    };
    expect(generateIndex(input)).toContain('* [Alpha](/d/alpha.md) - A.');
  });
});
