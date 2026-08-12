import { describe, expect, it } from 'vitest';
import type { Clock, Detector, FileStore } from '../../src/core/ports.js';
import { fixedClock, memoryFileStore, staticDetector } from '../../src/substrate/index.js';

/**
 * ADR-0032 — ports are narrow (interface segregation). `substrate/` was
 * originally specified as ONE interface covering filesystem, environment and
 * time; that made every consumer depend on capabilities it does not use and
 * every test stub all three.
 *
 * The tests below are as much about what a consumer *does not* need as what it
 * does. `core/` names these; `substrate/` implements them.
 */

describe('FileStore — stubbable alone', () => {
  it('round-trips a write and a read', async () => {
    const fs: FileStore = memoryFileStore();
    await fs.write('/a/b.md', 'hello');
    expect(await fs.read('/a/b.md')).toBe('hello');
  });

  it('reports existence without reading', async () => {
    const fs = memoryFileStore({ '/x.md': 'x' });
    expect(await fs.exists('/x.md')).toBe(true);
    expect(await fs.exists('/nope.md')).toBe(false);
  });

  it('returns null for a missing file rather than throwing', async () => {
    // Totality again: a missing file is an answer, not a failure. ADR-0026's
    // "never rejects" is only honourable if the layers beneath it do not throw.
    expect(await memoryFileStore().read('/missing.md')).toBeNull();
  });

  it('lists what it holds', async () => {
    const fs = memoryFileStore({ '/a.md': '1', '/b/c.md': '2' });
    expect((await fs.list()).sort()).toEqual(['/a.md', '/b/c.md']);
  });

  it('overwrites on a second write', async () => {
    const fs = memoryFileStore();
    await fs.write('/a.md', 'first');
    await fs.write('/a.md', 'second');
    expect(await fs.read('/a.md')).toBe('second');
  });
});

describe('Clock — stubbable alone', () => {
  it('returns a fixed instant, so nothing in the suite flakes on time', () => {
    const clock: Clock = fixedClock('2026-08-12T09:00:00.000Z');
    expect(clock.now()).toBe('2026-08-12T09:00:00.000Z');
    expect(clock.now()).toBe(clock.now());
  });
});

describe('Detector — stubbable alone', () => {
  it('answers from a fixed fact set', async () => {
    const detect: Detector = staticDetector({ git: true, obsidian: false });
    expect(await detect.has('git')).toBe(true);
    expect(await detect.has('obsidian')).toBe(false);
  });

  it('reports an unknown fact as absent rather than throwing', async () => {
    expect(await staticDetector({}).has('anything')).toBe(false);
  });
});

describe('the ports are genuinely separate (interface segregation)', () => {
  it('a time-only consumer needs no FileStore and no Detector', () => {
    // If this ever requires more than a Clock, the segregation has been lost.
    const stampedAt = (clock: Clock) => clock.now();
    expect(stampedAt(fixedClock('2026-01-01T00:00:00.000Z'))).toBe('2026-01-01T00:00:00.000Z');
  });

  it('a storage-only consumer needs no Clock and no Detector', async () => {
    const readIt = (fs: FileStore) => fs.read('/a.md');
    expect(await readIt(memoryFileStore({ '/a.md': 'ok' }))).toBe('ok');
  });

  it('memoryFileStore starts empty when seeded with nothing', async () => {
    expect(await memoryFileStore().list()).toEqual([]);
  });
});
