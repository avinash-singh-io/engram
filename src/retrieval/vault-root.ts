import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CliError } from '../commands/util';
import { enumerateConceptFiles } from '../vault/read';
import { findVaultRoot } from '../vault/paths';

/**
 * Resolve the vault root for a recall. An explicit `override` (`--vault`) wins;
 * otherwise walk up from `cwd` to the nearest OKF root (the canonical
 * `findVaultRoot`: `.engram/config.json`, or the `index.md` + `AGENTS.md` pair).
 * Throws `CliError(2)` when no vault is found — recall's "not in a vault" exit.
 *
 * Reuses the Phase 1 canonical walker/discovery rather than forking it
 * (see TD-003: dedupe the two root-discovery entry points post-landing).
 */
export function resolveVaultRoot(cwd = process.cwd(), override?: string): string {
  if (override) {
    const abs = resolve(override);
    if (!existsSync(join(abs, 'index.md'))) {
      throw new CliError(`no index.md at --vault path: ${abs}`, 2);
    }
    return abs;
  }
  const root = findVaultRoot(resolve(cwd));
  if (!root) {
    throw new CliError(
      'not inside an OKF vault — need index.md + AGENTS.md, or run `engram init`.',
      2,
    );
  }
  return root;
}

/** Absolute path to the vault's root `index.md`. */
export function rootIndexPath(vaultRoot: string): string {
  return join(vaultRoot, 'index.md');
}

/**
 * Count concepts via directory enumeration only (readdir, zero content reads) —
 * the denominator for the bounded-read fraction. Enumeration lists structure,
 * it never opens a concept body, so it does not touch the M3/M6 budget.
 */
export function countConcepts(vaultRoot: string): number {
  return enumerateConceptFiles(vaultRoot).length;
}
