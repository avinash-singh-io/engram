import { existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { loadConfig } from '../vault/config';
import { readVault, type ConceptRecord, type VaultModel } from '../vault/read';
import { writeFileManaged } from '../vault/write';
import { generateIndex, type IndexConcept } from './generate';

export interface ReindexOptions {
  /** Compute diffs without writing (CI / idempotency assertion). */
  check?: boolean;
}

export interface ReindexResult {
  /** Vault-relative index.md paths whose content changed. */
  changed: string[];
  /** Total index.md files considered. */
  checked: number;
}

function parentDir(dir: string): string {
  const i = dir.lastIndexOf('/');
  return i === -1 ? '' : dir.slice(0, i);
}

function baseName(dir: string): string {
  const i = dir.lastIndexOf('/');
  return i === -1 ? dir : dir.slice(i + 1);
}

function toIndexConcept(c: ConceptRecord): IndexConcept {
  return {
    title: String(c.frontmatter?.title ?? c.id),
    path: `/${c.path}`,
    description: String(c.frontmatter?.description ?? ''),
    id: c.id,
  };
}

/** Compute the full set of index.md files (absolute path → content) for a vault. */
export function computeIndexes(model: VaultModel, okfVersion: string): Map<string, string> {
  const byDir = new Map<string, ConceptRecord[]>();
  for (const c of model.concepts) {
    const list = byDir.get(c.dir) ?? [];
    list.push(c);
    byDir.set(c.dir, list);
  }

  // Every directory on the path to any concept gets an index (unbroken descent).
  const dirs = new Set<string>(['']);
  for (const c of model.concepts) {
    let d = c.dir;
    while (d !== '') {
      dirs.add(d);
      d = parentDir(d);
    }
  }

  const subtreeCount = (dir: string): number => {
    if (dir === '') return model.concepts.length;
    const prefix = `${dir}/`;
    return model.concepts.filter((c) => c.dir === dir || c.dir.startsWith(prefix)).length;
  };

  const out = new Map<string, string>();
  for (const dir of dirs) {
    const concepts = (byDir.get(dir) ?? []).map(toIndexConcept);
    const children = [...dirs]
      .filter((e) => e !== '' && parentDir(e) === dir)
      .map((e) => ({ name: baseName(e), link: `/${e}/index.md`, count: subtreeCount(e) }));
    const isRoot = dir === '';
    const content = generateIndex({
      concepts,
      children,
      isRoot,
      okfVersion,
      dirLabel: isRoot ? 'Vault Index' : baseName(dir),
    });
    const abs = join(model.root, ...(dir ? dir.split('/') : []), 'index.md');
    out.set(abs, content);
  }
  return out;
}

/**
 * Regenerate every directory index.md from concept frontmatter. Deterministic
 * and idempotent (ADR-0006). With `check`, reports diffs without writing.
 */
export function reindex(vaultRoot: string, opts: ReindexOptions = {}): ReindexResult {
  const model = readVault(vaultRoot);
  const okfVersion = loadConfig(vaultRoot).okf_version;
  const indexes = computeIndexes(model, okfVersion);

  const changed: string[] = [];
  for (const [abs, content] of indexes) {
    const existing = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
    if (existing !== content) {
      changed.push(relative(vaultRoot, abs).split(sep).join('/'));
      if (!opts.check) writeFileManaged(abs, content);
    }
  }
  return { changed: changed.sort(), checked: indexes.size };
}
