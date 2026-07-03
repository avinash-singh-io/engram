import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readAsset } from '../assets';
import { writeFileManaged } from '../vault/write';

/**
 * The canonical AGENTS.md traversal contract. Single source of truth is the
 * bundled `assets/vault/AGENTS.md` (Phase 1 ships the baseline; Phase 2 enriched
 * it additively with the read-budget + `engram recall` sections). `init` writes
 * it on scaffold; `engram recall --emit-contract` (re)writes it here. Rendering
 * from the shared asset keeps init and recall byte-identical.
 *
 * AGENTS.md is an OKF reserved passthrough file — no frontmatter
 * (docs/okf-conformance.md §1).
 */
export function renderAgentsContract(): string {
  return readAsset('vault', 'AGENTS.md');
}

export interface WriteContractResult {
  path: string;
  /** False when the on-disk contract already matched (idempotent re-run). */
  changed: boolean;
}

/**
 * Write the traversal contract to `<vaultRoot>/AGENTS.md`. Idempotent: a second
 * write with unchanged content produces no diff and reports `changed: false`.
 */
export function writeAgentsContract(vaultRoot: string): WriteContractResult {
  const abs = join(vaultRoot, 'AGENTS.md');
  const next = renderAgentsContract();
  const prev = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  if (prev === next) return { path: abs, changed: false };
  writeFileManaged(abs, next);
  return { path: abs, changed: true };
}
