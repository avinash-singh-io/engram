/**
 * Concept identity: a concept's ID is its vault-relative path minus `.md`.
 * See docs/okf-conformance.md §7. Reserved files are not concepts.
 */

// index/log are OKF structural files; AGENTS.md + CLAUDE.md are agent-instruction
// files (not vault knowledge). None are enumerated, validated, or migrated as concepts.
export const RESERVED_FILENAMES = ['index.md', 'log.md', 'AGENTS.md', 'CLAUDE.md'] as const;

/** Normalize to forward slashes and strip any leading `./` or `/` segments. */
export function normalizeVaultPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^(?:\.\/|\/)+/, '');
}

/** The final path segment (filename) of a vault path. */
export function basename(p: string): string {
  const norm = normalizeVaultPath(p);
  const idx = norm.lastIndexOf('/');
  return idx === -1 ? norm : norm.slice(idx + 1);
}

/** True for the reserved, non-concept filenames (index.md, log.md, AGENTS.md). */
export function isReservedFile(p: string): boolean {
  return (RESERVED_FILENAMES as readonly string[]).includes(basename(p));
}

/** Path → concept ID. Throws when the path is not a `.md` file. */
export function pathToConceptId(p: string): string {
  const norm = normalizeVaultPath(p);
  if (!norm.toLowerCase().endsWith('.md')) {
    throw new Error(`Not a markdown path: ${p}`);
  }
  return norm.slice(0, -'.md'.length);
}

/** Concept ID → path (adds `.md`). Inverse of pathToConceptId. */
export function conceptIdToPath(id: string): string {
  return `${normalizeVaultPath(id)}.md`;
}
