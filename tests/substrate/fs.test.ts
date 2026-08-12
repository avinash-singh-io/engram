import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { nodeFileStore } from '../../src/substrate/index.js';

/**
 * Regression cover for a real defect Phase 9 exposed.
 *
 * `nodeFileStore.list()` originally returned only the paths written through that
 * store instance, so a fresh store — which is what every CLI invocation builds —
 * enumerated nothing. Every Phase 8 test happened to write before listing, so the
 * defect was invisible until `reindex` needed to enumerate a vault it had not
 * just created.
 */
const vault = () => mkdtempSync(join(tmpdir(), 'engram-fs-'));

describe('nodeFileStore.list walks the real filesystem', () => {
  it('lists files a DIFFERENT store instance wrote', async () => {
    const root = vault();
    await nodeFileStore(root).write('/a.md', 'one');
    await nodeFileStore(root).write('/nested/deep/b.md', 'two');

    // A fresh store, exactly as a new CLI invocation builds.
    expect(await nodeFileStore(root).list()).toEqual(['/a.md', '/nested/deep/b.md']);
  });

  it('returns paths sorted, so generated output is deterministic', async () => {
    const root = vault();
    const files = nodeFileStore(root);
    for (const p of ['/z.md', '/a.md', '/m.md']) await files.write(p, 'x');
    expect(await nodeFileStore(root).list()).toEqual(['/a.md', '/m.md', '/z.md']);
  });

  it('an empty vault lists nothing rather than failing', async () => {
    expect(await nodeFileStore(vault()).list()).toEqual([]);
  });

  it('a nonexistent root lists nothing rather than throwing', async () => {
    expect(await nodeFileStore('/no/such/place').list()).toEqual([]);
  });

  /**
   * Load-bearing for TD-004: the walker detects nested vault roots by finding
   * `.engram/` markers. A store that hid dotdirs would make that check silently
   * unenforceable — the disclosure guard would report clean while doing nothing.
   */
  it('does NOT hide .engram markers, which nested-root detection depends on', async () => {
    const root = vault();
    const files = nodeFileStore(root);
    await files.write('/private/.engram/config.json', '{}');
    await files.write('/private/secret.md', 'x');
    expect(await nodeFileStore(root).list()).toContain('/private/.engram/config.json');
  });

  it('skips ignored directories', async () => {
    const root = vault();
    const files = nodeFileStore(root);
    await files.write('/node_modules/pkg/index.md', 'x');
    await files.write('/.git/config', 'x');
    await files.write('/real.md', 'x');
    expect(await nodeFileStore(root).list()).toEqual(['/real.md']);
  });
});
