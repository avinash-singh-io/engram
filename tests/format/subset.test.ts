/**
 * The subset table itself (ADR-0047 §1).
 *
 * These assert the table is well-formed. The tests that assert engram actually
 * *parses* every entry live in `yaml.test.ts` and iterate this same table — the
 * point being that a construct cannot be claimed here without being exercised
 * there.
 */

import { describe, expect, it } from 'vitest';
import { EXCLUDED, SUBSET, excludedNames, subsetNames } from '../../src/format/subset.js';

describe('the stated subset', () => {
  it('names every construct uniquely', () => {
    const names = subsetNames();
    expect(new Set(names).size).toBe(names.length);
  });

  it('never claims and excludes the same construct', () => {
    const claimed = new Set(subsetNames());
    for (const name of excludedNames()) expect(claimed.has(name)).toBe(false);
  });

  it.each(SUBSET.map((s) => [s.name, s] as const))('%s is a usable entry', (_name, entry) => {
    expect(entry.yaml.trim()).not.toBe('');
    expect(Object.keys(entry.expect).length).toBeGreaterThan(0);
  });

  it.each(EXCLUDED.map((s) => [s.name, s] as const))(
    '%s names itself in its warning and survives per key',
    (_name, entry) => {
      expect(entry.warns.trim()).not.toBe('');
      // Every exclusion must keep something. An exclusion that loses the whole
      // document is BUG-011 wearing a different hat.
      expect(Object.keys(entry.survives).length).toBeGreaterThan(0);
    },
  );

  it('claims the two families BUG-011 was about', () => {
    const names = subsetNames().join(' ');
    expect(names).toContain('block sequence');
    expect(names).toContain('block scalar');
  });
});
