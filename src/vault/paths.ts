import { existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

/** Directories never walked for concepts (tooling, VCS, raw captures). */
export const IGNORE_DIRS = [
  '.git',
  '.engram',
  '.claude',
  '.obsidian',
  'node_modules',
  'dist',
  'inbox',
];

/**
 * Find the vault root by walking up from `startDir`, looking for the `.engram`
 * marker or the OKF root pair (index.md + AGENTS.md). Returns null if none found.
 */
export function findVaultRoot(startDir: string): string | null {
  let dir = startDir;
  for (;;) {
    if (existsSync(join(dir, '.engram', 'config.json'))) return dir;
    if (existsSync(join(dir, 'index.md')) && existsSync(join(dir, 'AGENTS.md'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Convert an absolute-bundle-relative link (`/a/b.md`) to an absolute fs path. */
export function linkToFsPath(vaultRoot: string, link: string): string {
  const clean = (link.split('#')[0] ?? '').replace(/^\//, '');
  return join(vaultRoot, clean);
}

/** Convert an absolute fs path inside the vault to an absolute-bundle-relative link. */
export function fsPathToLink(vaultRoot: string, absPath: string): string {
  const rel = relative(vaultRoot, absPath).split(sep).join('/');
  return `/${rel}`;
}
