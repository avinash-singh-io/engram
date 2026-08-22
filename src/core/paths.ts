/**
 * TIER 1 — reserved names and derived paths, in one place.
 *
 * Two vocabularies that must not drift, because both are consulted by the walker,
 * the generators and `doctor`. Keeping them here rather than inline is what stops
 * a generator writing to a path the walker still treats as authored content.
 */

/**
 * Files engram generates or owns. **Never authored content, at any depth.**
 *
 * Rescued from v1's `isReservedFile` during the Phase 8 sweep, where it was noted
 * as belonging to whichever phase built the walker (ADR-0029).
 */
export const RESERVED_FILES: readonly string[] = ['index.md', 'log.md', 'AGENTS.md', 'CLAUDE.md'];

/** Derived subtree — 100% generated, gitignored, safe to delete (ADR-0023, ADR-0029). */
export const VIEWS_DIR = 'views';

/**
 * Where `capture` puts unprocessed content.
 *
 * Named `raw/` rather than `inbox/`: an inbox implies a queue someone owes it to
 * you to drain, and nothing in here is owed processing. `raw/` describes what the
 * files are — unformatted thoughts, pasted articles, half-finished notes — which is
 * the honest promise, since ADR-0026 lets capture accept anything and never asks
 * what happens next.
 */
export const RAW_DIR = '/raw';

/** The marker that makes a directory a vault root (ADR-0030). */
export const ROOT_MARKER = '.engram';

/** Directories the walker never descends into. */
export const IGNORED_DIRS: readonly string[] = ['node_modules', '.git', '.obsidian'];

/** True when `path` names a reserved file, at any depth. */
export function isReservedFile(path: string): boolean {
  const base = path.split('/').pop() ?? '';
  return RESERVED_FILES.includes(base);
}

/** True when `path` lives under the derived subtree. */
export function isDerived(path: string): boolean {
  const p = path.startsWith('/') ? path.slice(1) : path;
  return p === 'index.md' || p.startsWith(`${VIEWS_DIR}/`);
}

/**
 * The gitignore lines engram manages (ADR-0029).
 *
 * Derived state is never synced, so it can never conflict. A user may still choose
 * to commit it, in which case `doctor` reports the resolution rule rather than
 * trying to merge.
 */
export const DERIVED_GITIGNORE = [
  '# engram — derived state, regenerate with `engram reindex`',
  '/views/',
  '/index.md',
];
