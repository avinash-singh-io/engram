import { describe, expect, it } from 'vitest';
import * as registry from '../../src/format/registry.js';

/**
 * RESCUED FROM v1 — frontmatter parsing robustness.
 *
 * Found in the Group 0 sweep alongside BUG-001. This one is load-bearing for
 * ADR-0026 (capture never rejects): a codec that throws on malformed YAML makes
 * "never rejects" impossible to honour upstream. Real vaults contain CRLF from
 * Windows editors and BOMs from exports — neither is an error condition.
 *
 * SKIPPED DELIBERATELY — UNSKIP IN GROUP 3. Group 7 verifies none survive.
 */
describe('frontmatter parsing is total, never throwing', () => {
  it('parses a well-formed block', () => {
    const p = registry.parseFrontmatter('---\ntype: Concept\ntitle: X\n---\n# Body\n');
    expect(p.hasFrontmatter).toBe(true);
    expect(p.frontmatter).toMatchObject({ type: 'Concept', title: 'X' });
    expect(p.body.trim()).toBe('# Body');
  });

  it('tolerates CRLF line endings', () => {
    const p = registry.parseFrontmatter('---\r\ntype: Concept\r\n---\r\nbody');
    expect(p.hasFrontmatter).toBe(true);
    expect(p.frontmatter).toMatchObject({ type: 'Concept' });
  });

  it('strips a leading BOM', () => {
    const p = registry.parseFrontmatter('﻿---\ntype: Concept\n---\nbody');
    expect(p.hasFrontmatter).toBe(true);
    expect(p.frontmatter).toMatchObject({ type: 'Concept' });
  });

  it('flags a file with no frontmatter rather than failing', () => {
    const p = registry.parseFrontmatter('# No frontmatter here');
    expect(p.hasFrontmatter).toBe(false);
    expect(p.frontmatter).toBeNull();
  });

  it('captures invalid YAML as a null mapping plus an error — never throws', () => {
    const p = registry.parseFrontmatter('---\ntype: [unclosed\n---\nbody');
    expect(p.hasFrontmatter).toBe(true);
    expect(p.frontmatter).toBeNull();
    expect(p.yamlError).toBeTruthy();
  });
});

/**
 * One level of nesting, added in Phase 17 so `metadata:` can be read.
 *
 * The Agent Skills standard puts every tool-specific field under `metadata`, which
 * the flat subset silently flattened into top-level keys with a null `metadata`.
 * These tests pin both halves: that nesting now works, and that no flat document
 * reads differently than it did before.
 */
describe('nested frontmatter', () => {
  it('reads an indented block as a map', () => {
    const { frontmatter } = registry.parseFrontmatter(
      [
        '---',
        'name: connect-the-dots',
        'metadata:',
        '  engram-uses: capture format',
        '---',
        '',
      ].join('\n'),
    );
    expect(frontmatter?.metadata).toEqual({ 'engram-uses': 'capture format' });
    expect(frontmatter?.name).toBe('connect-the-dots');
  });

  it('still reads a bare key with no value as null', () => {
    // The regression this extension could most easily have caused: `aliases:` with
    // nothing after it must stay null, not become an empty map.
    const { frontmatter } = registry.parseFrontmatter(
      ['---', 'aliases:', 'title: x', '---', ''].join('\n'),
    );
    expect(frontmatter?.aliases).toBeNull();
    expect(frontmatter?.title).toBe('x');
  });

  it('reads a bare key at the end of the block as null', () => {
    const { frontmatter } = registry.parseFrontmatter(
      ['---', 'title: x', 'aliases:', '---', ''].join('\n'),
    );
    expect(frontmatter?.aliases).toBeNull();
  });

  it('is not confused by a comment or blank line between parent and child', () => {
    const { frontmatter } = registry.parseFrontmatter(
      ['---', 'metadata:', '', '  # a note', '  k: v', '---', ''].join('\n'),
    );
    expect(frontmatter?.metadata).toEqual({ k: 'v' });
  });

  it('closes the nested map when a top-level key follows', () => {
    const { frontmatter } = registry.parseFrontmatter(
      ['---', 'metadata:', '  a: 1', 'name: after', '---', ''].join('\n'),
    );
    expect(frontmatter?.metadata).toEqual({ a: '1' });
    expect(frontmatter?.name).toBe('after');
  });

  it('refuses an indented key with no parent rather than guessing', () => {
    const { frontmatter, yamlError } = registry.parseFrontmatter(
      ['---', '  orphan: 1', '---', ''].join('\n'),
    );
    expect(frontmatter).toBeNull();
    expect(yamlError).toContain('no parent');
  });

  it('leaves the inline map form working', () => {
    const { frontmatter } = registry.parseFrontmatter(
      ['---', 'emits: { type: Synthesis }', '---', ''].join('\n'),
    );
    expect(frontmatter?.emits).toEqual({ type: 'Synthesis' });
  });
});
