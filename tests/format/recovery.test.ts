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

  it('names the failing key and its line', () => {
    const errors = parseFrontmatter(OBSIDIAN).keyErrors;
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.key).toBe('part-of');
    expect(errors[0]!.line).toBeGreaterThan(0);
  });

  it('surfaces one warning per failing key, naming it', () => {
    const { warnings } = readNode(OBSIDIAN, PATH);
    expect(warnings.some((w) => w.includes('part-of'))).toBe(true);
  });

  it('leaves no empty husk where a block failed', () => {
    // `part-of: {}` reads as "declared and empty", which is a quieter lie than
    // "could not be read" — and produces no warning downstream.
    expect(parseFrontmatter(OBSIDIAN).frontmatter).not.toHaveProperty('part-of');
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
