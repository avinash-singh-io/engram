import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseMomentum } from '../../src/promote';

const SOURCES = join(import.meta.dirname, '..', 'fixtures', 'promote', 'sources');
const read = (name: string): string => readFileSync(join(SOURCES, name), 'utf8');

describe('parseMomentum — ADR', () => {
  const adr = parseMomentum(read('adr-shared-engine.md'));

  it('recognizes an ADR and extracts number, title, date, status', () => {
    expect(adr.kind).toBe('adr');
    expect(adr.id).toBe('0007');
    expect(adr.title).toBe('Vendor the shared engine now, extract a library later');
    expect(adr.date).toBe('2026-06-15');
    expect(adr.status).toBe('accepted');
    expect(adr.sourceRef).toBe('ADR-0007');
  });

  it('splits the ## sections and captures the Decision body', () => {
    expect(adr.sections.map((s) => s.heading)).toEqual([
      'Context',
      'Options Considered',
      'Decision',
      'Consequences',
    ]);
    expect(adr.decision).toContain('Vendor the engine pattern');
  });

  it('carries no Topics for a bare ADR', () => {
    expect(adr.topics).toEqual([]);
  });
});

describe('parseMomentum — learning entry', () => {
  const learning = parseMomentum(read('learning-entry.md'));

  it('recognizes a [TYPE] DATE — title header', () => {
    expect(learning.kind).toBe('learning');
    expect(learning.title).toBe('Lock the evaluator before the optimization loop');
    expect(learning.date).toBe('2026-06-20');
    expect(learning.sourceRef).toBe('[DECISION] 2026-06-20');
  });

  it('extracts Topics and a multi-line Detail', () => {
    expect(learning.topics).toEqual(['evaluation', 'optimization', 'discipline']);
    expect(learning.detail).toBe(
      'Froze the evaluation corpus and the scalar metric before building the ' +
        'self-improvement loop so score history stays comparable across runs.',
    );
  });
});

describe('parseMomentum — defensive fallbacks', () => {
  it('treats an untitled/ADR-less doc as an ADR with a fallback title', () => {
    const art = parseMomentum('Just some prose with no heading.');
    expect(art.kind).toBe('adr');
    expect(art.title.length).toBeGreaterThan(0);
  });
});
