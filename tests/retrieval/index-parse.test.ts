import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isDescentTarget, parseIndex } from '../../src/retrieval/index-parse';
import { FIXTURE_VAULT } from './fixture';

describe('index-parse', () => {
  it('parses section descent-links from the root index', () => {
    const p = parseIndex(readFileSync(join(FIXTURE_VAULT, 'index.md'), 'utf8'));
    expect(p.descents.length).toBeGreaterThan(0);
    expect(p.descents.every((d) => d.kind === 'descent')).toBe(true);
    expect(p.descents.some((d) => d.target === '/system-design/index.md')).toBe(true);
    expect(p.headings).toContain('Sections');
  });

  it('parses concept bullets with title, description, and section from a leaf index', () => {
    const p = parseIndex(readFileSync(join(FIXTURE_VAULT, 'system-design', 'index.md'), 'utf8'));
    const idem = p.concepts.find((c) => c.target === '/system-design/idempotency-patterns.md');
    expect(idem?.title).toBe('Idempotency Patterns');
    expect(idem?.description).toContain('Effectively-once');
    expect(idem?.section).toBe('Concepts');
    expect(idem?.kind).toBe('concept');
  });

  it('classifies index/_moc targets as descent and leaf .md as concept', () => {
    expect(isDescentTarget('/a/index.md')).toBe(true);
    expect(isDescentTarget('/a/_moc.md')).toBe(true);
    expect(isDescentTarget('/a/b.md')).toBe(false);
  });

  it('tolerates a flat index with bullets under no heading', () => {
    const p = parseIndex('* [X](/x.md) - one\n* [Y](/y.md) - two\n');
    expect(p.concepts).toHaveLength(2);
    expect(p.headings).toHaveLength(0);
    expect(p.concepts[0]?.section).toBe('');
    expect(p.concepts[0]?.description).toBe('one');
  });

  it('ignores prose and malformed lines', () => {
    const p = parseIndex('# Title\n\nsome prose here\n\n* [X](/x.md) - d\nnot a bullet\n');
    expect(p.entries).toHaveLength(1);
    expect(p.entries[0]?.title).toBe('X');
  });

  it('parses a bullet with no description', () => {
    const p = parseIndex('## Concepts\n\n* [A](/a.md)\n');
    expect(p.concepts[0]?.description).toBe('');
    expect(p.concepts[0]?.section).toBe('Concepts');
  });
});
