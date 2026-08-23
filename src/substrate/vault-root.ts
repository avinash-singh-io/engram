/**
 * TIER 3 — Substrate. Finding which vault you are standing in.
 *
 * [ADR-0046](../../specs/decisions/0046-vault-root-discovery.md). `engram capture`
 * run from a subdirectory used to create a second vault inside the first, file the
 * note there, and report a path relative to a root the user did not believe they
 * were in — success, about the wrong place.
 *
 * The cause was that ADR-0030 conflated two rules. **Boundary** — how far a vault
 * extends — is that ADR's subject and is unchanged. **Discovery** — which root you
 * are in — was never argued for; the invocation directory was simply assumed.
 *
 * This lives in `substrate/` because it looks *outward* from the vault. A `FileStore`
 * is rooted at the vault by construction and cannot see above itself, which is the
 * property that makes the port safe and also the reason this cannot use one.
 */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { ROOT_MARKER } from '../core/paths.js';

/** A repository is a boundary (ADR-0030), so the search never crosses one. */
const GIT_DIR = '.git';

/**
 * Walk up from `from` looking for a vault root.
 *
 * **Nearest wins**, which is ADR-0030's "one root is the whole world" evaluated from
 * wherever you happen to be standing — and it keeps a nested vault winning over its
 * parent, matching what the walker already does when it refuses to descend into one.
 *
 * Returns `null` rather than guessing. Falling back to the working directory is what
 * produced the bug: it turns "you are not in a vault" into "here is a new vault",
 * which is a far larger action than anyone asked for.
 */
export function findVaultRoot(from: string): string | null {
  let dir = resolve(from);
  for (;;) {
    // Checked before `.git`, so a vault that is itself a repository — the common
    // case — resolves to itself rather than stopping at its own boundary.
    if (existsSync(join(dir, ROOT_MARKER))) return dir;
    // A repository with no vault in it ends the search. Escaping it to find a vault
    // somewhere above would be exactly the boundary violation ADR-0030 prevents.
    if (existsSync(join(dir, GIT_DIR))) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export interface ResolvedRoot {
  root: string;
  /** How it was decided — the CLI reports discovery, since invisible magic is worse. */
  how: 'flag' | 'found' | 'cwd';
  /** True when there is no vault here and the caller is not allowed to invent one. */
  missing: boolean;
}

/**
 * Resolve the root for one command.
 *
 * `explicit` wins with no discovery at all: a user who names a directory means that
 * directory. `creating` is true only for `init`, which is the one case where the
 * absence of a vault is the point rather than an error.
 */
export function resolveVaultRoot(
  cwd: string,
  explicit: string | undefined,
  creating: boolean,
): ResolvedRoot {
  if (explicit !== undefined) return { root: resolve(explicit), how: 'flag', missing: false };
  const found = findVaultRoot(cwd);
  if (found !== null) return { root: found, how: 'found', missing: false };
  return { root: resolve(cwd), how: 'cwd', missing: !creating };
}

/** What to tell someone standing outside a vault. */
export function noVaultMessage(cwd: string): string {
  return (
    `engram: no vault here. Looked for ${ROOT_MARKER}/ in ${cwd} and every directory ` +
    `above it, stopping at the repository boundary.\n` +
    `  Run \`engram init\` to create one, or pass \`--vault <dir>\` to name it.\n`
  );
}
