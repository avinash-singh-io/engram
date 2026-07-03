import { describe, expect, it } from 'vitest';
import { conceptIdToPath, isReservedFile, pathToConceptId } from '../src/format';

describe('concept identity', () => {
  it('maps a path to an ID (strips .md and leading slash)', () => {
    expect(pathToConceptId('/system-design/temporal-internals.md')).toBe(
      'system-design/temporal-internals',
    );
    expect(pathToConceptId('system-design/x.md')).toBe('system-design/x');
    expect(pathToConceptId('./a/b.md')).toBe('a/b');
  });

  it('round-trips id → path → id', () => {
    const id = 'system-design/idempotency-patterns';
    expect(pathToConceptId(conceptIdToPath(id))).toBe(id);
  });

  it('throws on a non-markdown path', () => {
    expect(() => pathToConceptId('notes.txt')).toThrow();
  });

  it('detects reserved files at any depth', () => {
    expect(isReservedFile('index.md')).toBe(true);
    expect(isReservedFile('a/b/index.md')).toBe(true);
    expect(isReservedFile('log.md')).toBe(true);
    expect(isReservedFile('AGENTS.md')).toBe(true);
    expect(isReservedFile('CLAUDE.md')).toBe(true);
    expect(isReservedFile('system-design/x.md')).toBe(false);
  });
});
