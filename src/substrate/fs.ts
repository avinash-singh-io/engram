/**
 * TIER 3 — implements `core/ports.ts`.
 *
 * Two implementations: a real filesystem store, and an in-memory one that is
 * not a test double bolted on afterwards but the thing that makes the core
 * exercisable without temp directories.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
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

/** Real filesystem, rooted at `root`. Paths are vault-absolute (`/a/b.md`). */
export function nodeFileStore(root: string): FileStore {
  const resolve = (p: string) => `${root}${p.startsWith('/') ? p : `/${p}`}`;
  const known = new Set<string>();
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
      known.add(path);
    },
    async exists(path) {
      return (await this.read(path)) !== null;
    },
    async list() {
      return [...known];
    },
  };
}
