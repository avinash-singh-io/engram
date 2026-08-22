/**
 * TIER 3 — `FileStore` over an Obsidian vault.
 *
 * This is the file that decides whether ADR-0032's ports were load-bearing or
 * decorative. `nodeFileStore` uses `node:fs`, which does not exist on Obsidian
 * mobile; if the ports are real, swapping this one in makes every operation in
 * `ops/` work on a phone with no other change anywhere.
 *
 * **It does not import `obsidian`.** The dependency is a structural interface —
 * `VaultAdapter` below — that Obsidian's own `DataAdapter` happens to satisfy. So
 * engram's library keeps zero runtime dependencies and no knowledge of Obsidian,
 * the plugin passes `app.vault.adapter` and it fits, and a fake adapter in a test
 * is a plain object rather than a mock of somebody's SDK.
 *
 * Three impedance mismatches are handled here and nowhere else:
 *
 * | Obsidian                              | `FileStore`                     |
 * |---------------------------------------|---------------------------------|
 * | vault-relative paths (`a/b.md`)       | vault-absolute (`/a/b.md`)      |
 * | `read` **throws** on a missing file   | returns `null`, never throws    |
 * | `list` is one directory deep          | recursive over the whole vault  |
 */

import { IGNORED_DIRS } from '../core/paths.js';
import type { FileStore } from '../core/ports.js';

/**
 * The part of Obsidian's `DataAdapter` engram uses.
 *
 * Structural, deliberately: `app.vault.adapter` satisfies it without engram ever
 * naming the `obsidian` package, and it names exactly five methods rather than the
 * twenty the real interface carries.
 */
export interface VaultAdapter {
  /** Throws when the path does not exist — which is why `read` below catches. */
  read(path: string): Promise<string>;
  write(path: string, data: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  /** One directory deep. Entries are vault-relative and carry no leading slash. */
  list(path: string): Promise<{ files: string[]; folders: string[] }>;
  mkdir(path: string): Promise<void>;
}

/** `/a/b.md` → `a/b.md`. Obsidian has no leading slash; engram always has one. */
const toVault = (path: string): string => path.replace(/^\/+/, '');

/** `a/b.md` → `/a/b.md`. */
const toEngram = (path: string): string => (path.startsWith('/') ? path : `/${path}`);

const parentOf = (path: string): string => {
  const at = path.lastIndexOf('/');
  return at <= 0 ? '' : path.slice(0, at);
};

/**
 * Walk the vault.
 *
 * Obsidian lists one level at a time, so the recursion lives here. `IGNORED_DIRS`
 * is applied for the same reason `nodeFileStore` applies it — and dotdirs in
 * general are *not* skipped, because `.engram/` markers must stay visible or the
 * nested-vault-root check silently stops working (TD-004).
 */
async function enumerate(adapter: VaultAdapter, dir: string): Promise<string[]> {
  let listing;
  try {
    listing = await adapter.list(dir);
  } catch {
    return []; // a missing directory is an empty one, not a failure
  }

  const out = listing.files.map(toEngram);
  for (const folder of listing.folders) {
    const name = folder.split('/').filter(Boolean).pop() ?? '';
    if (IGNORED_DIRS.includes(name)) continue;
    out.push(...(await enumerate(adapter, folder)));
  }
  return out;
}

/** `FileStore` over an Obsidian vault. Works on desktop and mobile alike. */
export function obsidianFileStore(adapter: VaultAdapter): FileStore {
  return {
    async read(path) {
      try {
        // Obsidian throws where the port promises `null`. Totality is the whole
        // reason `capture` can guarantee it never rejects (ADR-0026), so the
        // conversion belongs here rather than in every caller.
        return await adapter.read(toVault(path));
      } catch {
        return null;
      }
    },
    async write(path, content) {
      const target = toVault(path);
      const parent = parentOf(target);
      if (parent !== '' && !(await adapter.exists(parent))) {
        await adapter.mkdir(parent);
      }
      await adapter.write(target, content);
    },
    async exists(path) {
      try {
        return await adapter.exists(toVault(path));
      } catch {
        return false;
      }
    },
    async list() {
      return (await enumerate(adapter, '/')).sort();
    },
  };
}
