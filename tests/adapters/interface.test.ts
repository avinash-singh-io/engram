import { describe, expect, it } from 'vitest';
import {
  ADAPTERS,
  COMMAND_DEFINITIONS,
  adapterIds,
  getAdapter,
  type AdapterFile,
} from '../../src/adapters';
import { assetsRoot } from '../../src/assets';

const COMMAND_NAMES = ['capture', 'refine', 'link', 'reindex', 'promote'];

describe('shared command definitions', () => {
  it('exposes the Phase 1 + promote command set with non-empty bodies', () => {
    expect(COMMAND_DEFINITIONS.map((c) => c.name)).toEqual(COMMAND_NAMES);
    for (const def of COMMAND_DEFINITIONS) {
      expect(def.summary.length).toBeGreaterThan(0);
      expect(def.body.trim().length).toBeGreaterThan(0);
    }
  });

  it('includes a promote command that references the engram promote CLI', () => {
    const promote = COMMAND_DEFINITIONS.find((c) => c.name === 'promote');
    expect(promote).toBeDefined();
    expect(promote?.body).toContain('engram promote');
  });
});

describe('adapter seam', () => {
  it('registers claude, codex, and antigravity', () => {
    expect(adapterIds().sort()).toEqual(['antigravity', 'claude', 'codex']);
  });

  it('every adapter has an id + label and returns files with exactly one source', () => {
    for (const id of adapterIds()) {
      const adapter = getAdapter(id);
      expect(adapter, id).toBeDefined();
      expect(adapter?.id).toBe(id);
      expect(adapter?.label.length ?? 0).toBeGreaterThan(0);
      const files = adapter?.files(assetsRoot()) ?? [];
      expect(files.length).toBeGreaterThan(0);
      for (const f of files as AdapterFile[]) {
        // Exactly one of content / src is set (XOR).
        expect(Boolean(f.content) !== Boolean(f.src), `${id}:${f.dest}`).toBe(true);
        expect(f.dest.length).toBeGreaterThan(0);
      }
    }
  });

  it('every adapter renders a command file for each shared command definition', () => {
    for (const id of adapterIds()) {
      const dests = (getAdapter(id)?.files(assetsRoot()) ?? []).map((f) => f.dest);
      for (const name of COMMAND_NAMES) {
        expect(dests.some((d) => d.endsWith(`${name}.md`)), `${id}:${name}`).toBe(true);
      }
    }
  });
});

describe('ADAPTERS registry', () => {
  it('maps each id to an adapter whose id matches its key', () => {
    for (const [key, adapter] of Object.entries(ADAPTERS)) {
      expect(adapter.id).toBe(key);
    }
  });
});
