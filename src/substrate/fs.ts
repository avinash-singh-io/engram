/**
 * TIER 3 — implements `core/ports.ts`.
 *
 * Two implementations: a real filesystem store, and an in-memory one that is
 * not a test double bolted on afterwards but the thing that makes the core
 * exercisable without temp directories.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { IGNORED_DIRS } from '../core/paths.js';
import type { FileStore } from '../core/ports.js';

/** In-memory FileStore. Seedable, so a fixture is a literal rather than a directory. */
export function memoryFileStore(seed: Record<string, string> = {}): FileStore {
  const files = new Map<string, string>(Object.entries(seed));
  return {
    async read(path) {
      return files.get(path) ?? null;
    },
    async write(path, content) {
      files.set(path, content);
    },
    async exists(path) {
      return files.has(path);
    },
    async list() {
      return [...files.keys()];
    },
  };
}

/**
 * Recursively enumerate `dir`, returning vault-absolute paths.
 *
 * Skips `IGNORED_DIRS` but NOT dotdirs in general — `.engram/` markers must be
 * visible, because the walker detects nested vault roots by finding them
 * (TD-004). A store that hid them would make that check silently unenforceable.
 */
async function enumerate(root: string, dir = ''): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(join(root, dir), { withFileTypes: true });
  } catch {
    return []; // a missing directory is an empty one, not a failure
  }
  const out: string[] = [];
  for (const entry of entries) {
    if (IGNORED_DIRS.includes(entry.name)) continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...(await enumerate(root, rel)));
    else out.push(rel);
  }
  return out;
}

/** Real filesystem, rooted at `root`. Paths are vault-absolute (`/a/b.md`). */
export function nodeFileStore(root: string): FileStore {
  const resolve = (p: string) => `${root}${p.startsWith('/') ? p : `/${p}`}`;
  return {
    async read(path) {
      try {
        return await readFile(resolve(path), 'utf8');
      } catch {
        // A missing file is an answer, not a failure (ADR-0026).
        return null;
      }
    },
    async write(path, content) {
      const full = resolve(path);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, content, 'utf8');
    },
    async exists(path) {
      return (await this.read(path)) !== null;
    },
    async list() {
      return (await enumerate(root)).sort();
    },
  };
}
