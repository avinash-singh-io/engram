import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateConcept } from '../../src/format';
import { parseMomentum, promoteMomentum, rewriteLinks, toConcept } from '../../src/promote';

const ROOT = join(import.meta.dirname, '..', 'fixtures', 'promote');
const source = (name: string): string => readFileSync(join(ROOT, 'sources', `${name}.md`), 'utf8');
const expected = (name: string): string =>
  readFileSync(join(ROOT, 'expected', `${name}.concept.md`), 'utf8');

const CASES = [
  { name: 'adr-shared-engine', sourcePath: 'momentum/decisions/0007-vendor-shared-engine.md' },
  { name: 'learning-entry', sourcePath: 'momentum/phases/phase-3-loop/history.md' },
];

describe('promote golden lock (v1)', () => {
  for (const c of CASES) {
    it(`${c.name} renders byte-for-byte to its locked expected concept`, () => {
      const result = promoteMomentum({
        sourceText: source(c.name),
        sourcePath: c.sourcePath,
        targetDir: 'references',
      });
      expect(result.conceptText).toBe(expected(c.name));
      expect(result.ok).toBe(true);
      expect(validateConcept(result.conceptText, result.targetPath).errors).toEqual([]);
    });
  }
});

describe('toConcept mapping', () => {
  const adr = parseMomentum(source('adr-shared-engine'));

  it('maps to type Reference with a one-sentence description from ## Decision', () => {
    const c = toConcept(adr, { targetDir: 'references', sourcePath: 'm/adr.md' });
    expect(c.frontmatter.type).toBe('Reference');
    expect(c.description.startsWith('Vendor the engine pattern')).toBe(true);
    expect(c.description.split('. ').length).toBe(1); // single sentence
  });

  it('honors --type / --description / --tags overrides', () => {
    const c = toConcept(adr, {
      targetDir: 'references',
      sourcePath: 'm/adr.md',
      type: 'MOC',
      description: 'A custom one-liner.',
      tags: ['custom'],
    });
    expect(c.frontmatter.type).toBe('MOC');
    expect(c.frontmatter.description).toBe('A custom one-liner.');
    expect(c.frontmatter.tags).toEqual(['custom', 'momentum', 'adr']);
  });

  it('always yields a non-empty tag list and a parseable timestamp', () => {
    const bare = parseMomentum('# 1 — Nameless\n\n## Decision\n\nDo the thing.');
    const c = toConcept(bare, { targetDir: 'references', sourcePath: 'm/x.md' });
    expect((c.frontmatter.tags as string[]).length).toBeGreaterThan(0);
    expect(String(c.frontmatter.timestamp)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('derives ISO timestamp from the ADR date', () => {
    const c = toConcept(adr, { targetDir: 'references', sourcePath: 'm/adr.md' });
    expect(c.frontmatter.timestamp).toBe('2026-06-15T00:00:00Z');
  });

  it('falls back to now() when the source has no date', () => {
    const undated = parseMomentum('# 2 — Undated\n\n## Decision\n\nShip it.');
    const c = toConcept(undated, {
      targetDir: 'references',
      sourcePath: 'm/x.md',
      now: new Date('2030-01-02T03:04:05Z'),
    });
    expect(c.frontmatter.timestamp).toBe('2030-01-02T03:04:05Z');
  });
});

describe('rewriteLinks (ADR-0003 standard links)', () => {
  it('rewrites a wikilink to a standard absolute link', () => {
    expect(rewriteLinks('see [[Some Note]] here', 'references')).toBe(
      'see [Some Note](/some-note.md) here',
    );
  });

  it('rewrites a labeled wikilink using the label text', () => {
    expect(rewriteLinks('[[Target Page|nice label]]', 'references')).toBe(
      '[nice label](/target-page.md)',
    );
  });

  it('rewrites an internal relative .md link to a vault-relative sibling', () => {
    expect(rewriteLinks('[x](0007-foo.md)', 'references')).toBe('[x](/references/0007-foo.md)');
    expect(rewriteLinks('[x](../decisions/y.md#h)', 'refs')).toBe('[x](/refs/y.md#h)');
  });

  it('leaves external URLs and already-absolute links untouched', () => {
    expect(rewriteLinks('[a](https://x.dev/y.md)', 'references')).toBe('[a](https://x.dev/y.md)');
    expect(rewriteLinks('[a](/already/abs.md)', 'references')).toBe('[a](/already/abs.md)');
  });
});

describe('promote hard gate (validate-before-write)', () => {
  it('defends the common fields so a normal source always maps to a valid concept', () => {
    // A degenerate source (no heading, no sections) still validates because the
    // mapper backfills title, description, tags, and timestamp.
    const result = promoteMomentum({ sourceText: 'nothing here', sourcePath: 'm/x.md' });
    expect(result.ok).toBe(true);
    expect(result.description.length).toBeGreaterThan(0);
  });

  it('reports ok:false with the timestamp error when a source carries a malformed date', () => {
    const bad = [
      '# 3 — Typo Date',
      '',
      '> **Date**: 2026-13-45',
      '',
      '## Decision',
      '',
      'Ship.',
    ].join('\n');
    const result = promoteMomentum({ sourceText: bad, sourcePath: 'm/bad.md' });
    expect(result.ok).toBe(false);
    expect(result.validation.errors.map((e) => e.code)).toContain('timestamp-unparseable');
  });
});
