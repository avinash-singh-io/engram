/**
 * Enumerate authored content under a vault root.
 *
 * Three behaviours here are not conveniences — each closes a specific hole:
 *
 * 1. **Nested-root refusal (TD-004).** A parent `reindex` descending into a nested
 *    vault would write that vault's titles and descriptions into a shared,
 *    committed `index.md`. A real disclosure path, and the obvious thing a user
 *    tries when told to keep private notes in a separate directory.
 * 2. **Reserved-file detection.** `index.md` and friends are engram's, not the
 *    user's. Enumerating them as content is how a generator ends up overwriting
 *    something a human wrote.
 * 3. **Enumeration-only counting.** Structure can be listed without reading a
 *    single body — the bounded-read property Phase 11 will depend on.
 */

import { ROOT_MARKER } from '../core/paths.js';
import { isDerived, isReservedFile } from '../core/paths.js';
import type { FileStore } from '../core/ports.js';

export interface WalkFinding {
  level: 'warning';
  code: 'nested-root-skipped' | 'reserved-path-has-content';
  message: string;
  path: string;
}

export interface WalkResult {
  /** Authored content paths, sorted. Never reserved, never derived, never nested. */
  paths: string[];
  /** Structure counted without reading any body. */
  count: number;
  findings: WalkFinding[];
}

/**
 * Directories that are themselves vault roots.
 *
 * Detected on the **explicit `.engram/` marker only** — never a heuristic. A false
 * positive silently drops real authored content, which is a worse failure than the
 * disclosure this guards against, so the rule is deliberately literal.
 */
function nestedRootsIn(all: string[]): string[] {
  const roots = new Set<string>();
  for (const p of all) {
    const marker = `/${ROOT_MARKER}/`;
    const at = p.indexOf(marker);
    // A marker at position 0 is the vault's own sidecar, not a nested root.
    if (at > 0) roots.add(p.slice(0, at + 1));
  }
  return [...roots].sort();
}

export async function walk(files: FileStore): Promise<WalkResult> {
  const all = await files.list();
  const nested = nestedRootsIn(all);
  const findings: WalkFinding[] = [];

  for (const root of nested) {
    findings.push({
      level: 'warning',
      code: 'nested-root-skipped',
      path: root,
      message: `${root} is its own vault root (${ROOT_MARKER}/) — skipped entirely, nothing under it was read. ADR-0030: boundaries are repositories.`,
    });
  }

  const paths: string[] = [];
  for (const p of all) {
    if (nested.some((root) => p.startsWith(root))) continue;
    if (p.includes(`/${ROOT_MARKER}/`) || p.startsWith(`/${ROOT_MARKER}/`)) continue;
    if (!p.endsWith('.md')) continue;
    if (isDerived(p)) continue;
    if (isReservedFile(p)) continue;
    paths.push(p);
  }

  paths.sort();
  return { paths, count: paths.length, findings };
}
