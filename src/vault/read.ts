import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { isReservedFile, pathToConceptId } from '../format/concept-id';
import { parseFrontmatter } from '../format/frontmatter';
import { IGNORE_DIRS } from './paths';

/** One concept file parsed into an addressable record. */
export interface ConceptRecord {
  /** Concept ID = vault-relative path minus `.md`. */
  id: string;
  /** Vault-relative path (posix separators). */
  path: string;
  /** Absolute fs path. */
  absPath: string;
  /** Vault-relative directory (posix), '' for the vault root. */
  dir: string;
  frontmatter: Record<string, unknown> | null;
  body: string;
  raw: string;
}

/** The whole vault read into memory. Phase 2/3/5 consume this — do not fork it. */
export interface VaultModel {
  root: string;
  concepts: ConceptRecord[];
}

/**
 * The canonical vault walker (shared foundation). Enumerate every concept `.md`
 * file under the vault root, skipping ignored dirs, dotdirs, and reserved files.
 * Returns absolute paths, sorted for determinism.
 */
export function enumerateConceptFiles(vaultRoot: string, extraIgnore: string[] = []): string[] {
  const ignore = new Set([...IGNORE_DIRS, ...extraIgnore]);
  const out: string[] = [];
  const walk = (absDir: string): void => {
    for (const entry of readdirSync(absDir, { withFileTypes: true })) {
      const abs = join(absDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || ignore.has(entry.name)) continue;
        walk(abs);
      } else if (entry.isFile() && entry.name.endsWith('.md') && !isReservedFile(entry.name)) {
        out.push(abs);
      }
    }
  };
  walk(vaultRoot);
  return out.sort();
}

/** Read + parse the whole vault into an in-memory model. */
export function readVault(vaultRoot: string, extraIgnore: string[] = []): VaultModel {
  const concepts = enumerateConceptFiles(vaultRoot, extraIgnore).map((absPath) => {
    const path = relative(vaultRoot, absPath).split(sep).join('/');
    const raw = readFileSync(absPath, 'utf8');
    const parsed = parseFrontmatter(raw);
    const slash = path.lastIndexOf('/');
    return {
      id: pathToConceptId(path),
      path,
      absPath,
      dir: slash === -1 ? '' : path.slice(0, slash),
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      raw,
    };
  });
  return { root: vaultRoot, concepts };
}
