import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from '../src/format';

describe('parseFrontmatter', () => {
  it('parses a well-formed block', () => {
    const p = parseFrontmatter('---\ntype: Concept\ntitle: X\n---\n# Body\n');
    expect(p.hasFrontmatter).toBe(true);
    expect(p.frontmatter).toMatchObject({ type: 'Concept', title: 'X' });
    expect(p.body.trim()).toBe('# Body');
  });

  it('tolerates CRLF line endings', () => {
    const p = parseFrontmatter('---\r\ntype: Concept\r\n---\r\nbody');
    expect(p.hasFrontmatter).toBe(true);
    expect(p.frontmatter).toMatchObject({ type: 'Concept' });
  });

  it('strips a leading BOM', () => {
    const p = parseFrontmatter('﻿---\ntype: Concept\n---\nbody');
    expect(p.hasFrontmatter).toBe(true);
    expect(p.frontmatter).toMatchObject({ type: 'Concept' });
  });

  it('flags a file with no frontmatter', () => {
    const p = parseFrontmatter('# No frontmatter here');
    expect(p.hasFrontmatter).toBe(false);
    expect(p.frontmatter).toBeNull();
  });

  it('captures invalid YAML as a null mapping', () => {
    const p = parseFrontmatter('---\ntype: [unclosed\n---\nbody');
    expect(p.hasFrontmatter).toBe(true);
    expect(p.frontmatter).toBeNull();
    expect(p.yamlError).toBeTruthy();
  });
});
