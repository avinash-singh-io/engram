/**
 * BUG-011 — a line engram cannot read must never cost a note its identity.
 *
 * ADR-0047 §2. These assert the *blast radius* of a failure, not which constructs
 * the parser knows: every case here uses content engram still cannot parse, and
 * every one must still keep `id`. That independence is deliberate — a construct
 * invented tomorrow must not be able to reopen this.
 */

import { describe, expect, it } from 'vitest';
import { parseFrontmatter, readNode } from '../../src/format/registry.js';

/** The reporting user's file, verbatim, in the form Obsidian rewrote it into. */
const OBSIDIAN = `---
okf_version: 0.2
id: finance-glossary
timestamp: 2026-08-23T20:28:29.392Z
author: avinash
part-of:
  - finance
---

The body.`;

const PATH = '/3-resources/finance/finance-glossary.md';

describe('a bad line costs you that line', () => {
  it('keeps the id — the whole of BUG-011', () => {
    expect(readNode(OBSIDIAN, PATH).node.id).toBe('finance-glossary');
  });

  it('does not fall back to path-as-identity', () => {
    // ADR-0021: identity is a slug, path is an address. Trading one for the other
    // means moving the file breaks every relation pointing at it.
    expect(readNode(OBSIDIAN, PATH).node.id).not.toBe(PATH);
  });

  it('keeps author and timestamp rather than inventing them', () => {
    // ADR-0020 forbids engram inventing time or provenance. Substituting `unknown`
    // and the epoch is exactly that, done by accident.
    const { node } = readNode(OBSIDIAN, PATH);
    expect(node.stamp.by).toBe('avinash');
    expect(node.stamp.at).toBe('2026-08-23T20:28:29.392Z');
  });

  it('reads it with the codec the file declares, not the fallback', () => {
    // detectVersion(null) fell back to okf 0.1, which has no closed relations by
    // construction — a second, independent way to lose every edge.
    expect(parseFrontmatter(OBSIDIAN).frontmatter?.okf_version).toBe('0.2');
  });

  it('reads it cleanly now that block sequences are implemented', () => {
    // Group 1 kept the identity while `part-of` was still unreadable; Group 2 reads
    // the sequence too. Asserted here so the file the bug was reported against is
    // pinned end to end, not just its identity.
    const parsed = parseFrontmatter(OBSIDIAN);
    expect(parsed.keyErrors).toEqual([]);
    expect(parsed.frontmatter?.['part-of']).toEqual(['finance']);
    expect(readNode(OBSIDIAN, PATH).edges.map((e) => `${e.kind}->${e.to}`)).toEqual([
      'part-of->finance',
    ]);
  });

  /**
   * A construct engram genuinely cannot read, so these assert blast radius rather
   * than coverage. The Obsidian fixture no longer qualifies — which is the point of
   * Group 2 — so recovery is proved against something still outside the subset.
   */
  const UNREADABLE = `---
okf_version: 0.2
id: finance-glossary
author: avinash
weird: &anchor value
part-of:
  - finance
---

The body.`;

  it('names the failing key and its line', () => {
    const errors = parseFrontmatter(UNREADABLE).keyErrors;
    expect(errors.length).toBe(1);
    expect(errors[0]!.key).toBe('weird');
    expect(errors[0]!.line).toBeGreaterThan(0);
  });

  it('surfaces one warning per failing key, naming it', () => {
    const { warnings } = readNode(UNREADABLE, PATH);
    expect(warnings.some((w) => w.includes('weird'))).toBe(true);
  });

  it('costs only the failing key — everything around it survives', () => {
    const { node, edges } = readNode(UNREADABLE, PATH);
    expect(node.id).toBe('finance-glossary');
    expect(node.stamp.by).toBe('avinash');
    expect(edges.map((e) => e.to)).toEqual(['finance']);
    expect(parseFrontmatter(UNREADABLE).frontmatter).not.toHaveProperty('weird');
  });

  it('leaves no empty husk where a nested block failed', () => {
    // `a: {}` reads as "declared and empty", which is a quieter lie than "could not
    // be read" — and produces no warning downstream.
    const parsed = parseFrontmatter('---\nid: x\na:\n  b:\n    c: d\n---\nbody');
    expect(parsed.frontmatter).not.toHaveProperty('a');
    expect(parsed.frontmatter?.id).toBe('x');
  });

  it.each([
    ['an unreadable construct anywhere', 'id: keeps-id\nweird: &anchor v\nauthor: me'],
    ['an unclosed flow list', 'id: keeps-id\npart-of: [a, b\nauthor: me'],
    ['an unclosed flow map', 'id: keeps-id\nemits: { type: X\nauthor: me'],
    ['an indented key with no parent', 'id: keeps-id\n  orphan: v\nauthor: me'],
  ])('keeps id and later keys despite %s', (_label, yaml) => {
    const { node } = readNode(`---\n${yaml}\n---\nbody`, PATH);
    expect(node.id).toBe('keeps-id');
    expect(node.stamp.by).toBe('me');
  });

  it('still reports a wholly unreadable block as unparsed', () => {
    // The one case that keeps returning a null mapping: nothing readable at all.
    const parsed = parseFrontmatter('---\n  - a\n  - b\n---\nbody');
    expect(parsed.frontmatter).toBeNull();
    expect(parsed.yamlError).toBeDefined();
  });

  it('still reports an unterminated block', () => {
    const parsed = parseFrontmatter('---\nid: x\n\nno closing delimiter');
    expect(parsed.frontmatter).toBeNull();
    expect(parsed.yamlError).toContain('unterminated');
  });
});
