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
describe.skip('frontmatter parsing is total, never throwing — UNSKIP IN GROUP 3', () => {
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
