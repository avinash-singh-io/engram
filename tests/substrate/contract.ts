import { expect, it } from 'vitest';
import type { FileStore } from '../../src/core/ports.js';

/**
 * The `FileStore` contract, asserted once and run against every implementation.
 *
 * A port whose implementations are tested separately is three interfaces wearing a
 * shared name. That only became falsifiable in Phase 14, when `obsidianFileStore`
 * arrived: `nodeFileStore` cannot run on Obsidian mobile, so if `ops/` is to work
 * on a phone unchanged, the two have to agree on every promise the port makes —
 * including the ones that are easy to get wrong in one direction only.
 *
 * The sharpest of those is totality. Obsidian's adapter **throws** on a missing
 * read where the port returns `null`; `node:fs` throws a different error for the
 * same case. Every caller in `ops/` assumes neither ever does.
 */
export function fileStoreContract(make: () => FileStore | Promise<FileStore>): void {
  const store = async () => await make();

  it('round-trips a write and a read', async () => {
    const fs = await store();
    await fs.write('/a/b.md', 'hello');
    expect(await fs.read('/a/b.md')).toBe('hello');
  });

  it('returns null for a missing file rather than throwing', async () => {
    const fs = await store();
    await expect(fs.read('/nope.md')).resolves.toBeNull();
  });

  it('returns null for a missing file in a missing directory', async () => {
    const fs = await store();
    await expect(fs.read('/no/such/dir/file.md')).resolves.toBeNull();
  });

  it('reports existence, and agrees with read', async () => {
    const fs = await store();
    await fs.write('/x.md', 'x');

    expect(await fs.exists('/x.md')).toBe(true);
    expect(await fs.exists('/nope.md')).toBe(false);
    expect((await fs.read('/x.md')) !== null).toBe(await fs.exists('/x.md'));
    expect((await fs.read('/nope.md')) !== null).toBe(await fs.exists('/nope.md'));
  });

  it('creates intermediate directories on write', async () => {
    const fs = await store();
    await fs.write('/deeply/nested/path/note.md', 'content');
    expect(await fs.read('/deeply/nested/path/note.md')).toBe('content');
  });

  it('overwrites rather than appending', async () => {
    const fs = await store();
    await fs.write('/x.md', 'first');
    await fs.write('/x.md', 'second');
    expect(await fs.read('/x.md')).toBe('second');
  });

  it('lists what was written, with vault-absolute paths', async () => {
    const fs = await store();
    await fs.write('/a.md', '1');
    await fs.write('/nested/b.md', '2');

    const listed = await fs.list();
    expect(listed).toContain('/a.md');
    expect(listed).toContain('/nested/b.md');
    expect(listed.every((p) => p.startsWith('/'))).toBe(true);
  });

  it('lists in a stable, sorted order', async () => {
    const fs = await store();
    for (const p of ['/z.md', '/a.md', '/m/n.md']) await fs.write(p, 'x');
    const listed = await fs.list();
    expect(listed).toEqual([...listed].sort());
  });

  it('lists nothing for an empty store rather than throwing', async () => {
    await expect((await store()).list()).resolves.toEqual([]);
  });

  /**
   * `.engram/` must stay visible. The walker detects a nested vault root by finding
   * that marker (TD-004, ADR-0030), so a store that hid dotfiles would make the
   * boundary check silently unenforceable.
   */
  it('lists dotfiles, because .engram markers must be findable', async () => {
    const fs = await store();
    await fs.write('/.engram/queue/p.md', 'proposal');
    expect(await fs.list()).toContain('/.engram/queue/p.md');
  });

  it('round-trips content it did not author, byte for byte', async () => {
    const fs = await store();
    for (const [path, content] of [
      ['/empty.md', ''],
      ['/unicode.md', '👨‍👩‍👧‍👦 — em dash, ünïcödé'],
      ['/trailing.md', 'no newline'],
      ['/newlines.md', 'a\n\n\nb\n'],
      ['/frontmatter.md', '---\nid: x\n---\n# body\n'],
    ] as const) {
      await fs.write(path, content);
      expect(await fs.read(path)).toBe(content);
    }
  });
}
