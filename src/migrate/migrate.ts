import { statSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from '../format/frontmatter';
import { serializeConcept } from '../format/serialize';
import { validateConcept } from '../format/validate';
import { reindex } from '../indexer/reindex';
import { appendLog } from '../vault/log';
import { readVault, type VaultModel } from '../vault/read';
import { writeFileManaged } from '../vault/write';
import { deriveFrontmatter, type DeriveOptions } from './derive';
import { convertWikilinks, type LinkResolver, type WikilinkConversion } from './links';

export interface MigrationItem {
  path: string;
  frontmatter: Record<string, unknown>;
  conversions: WikilinkConversion[];
  newText: string;
  /** Whether the migrated text passes `validateConcept`. */
  valid: boolean;
}

export interface MigrationPlan {
  /** Non-conformant files that will be rewritten. */
  items: MigrationItem[];
  /** Already-conformant files (left untouched). */
  alreadyValid: string[];
}

function pickDefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== '') out[k] = v;
  }
  return out;
}

/** Resolve wikilink targets by concept filename or title (case-insensitive). */
function buildResolver(model: VaultModel): LinkResolver {
  const byKey = new Map<string, string>();
  for (const c of model.concepts) {
    const link = `/${c.path}`;
    const base = (c.path.split('/').pop() ?? c.path).replace(/\.md$/i, '');
    byKey.set(base.toLowerCase(), link);
    const title = c.frontmatter?.title;
    if (typeof title === 'string') byKey.set(title.toLowerCase(), link);
  }
  return (target) => byKey.get(target.trim().toLowerCase()) ?? null;
}

/**
 * Plan an OKF migration: for each non-conformant concept, derive frontmatter
 * (preserving any existing valid fields) and convert wikilinks. Pure — writes
 * nothing.
 */
export function planMigration(vaultRoot: string, opts: DeriveOptions = {}): MigrationPlan {
  const model = readVault(vaultRoot);
  const resolve = buildResolver(model);
  const items: MigrationItem[] = [];
  const alreadyValid: string[] = [];

  for (const c of model.concepts) {
    if (validateConcept(c.raw, c.path).ok) {
      alreadyValid.push(c.path);
      continue;
    }

    const parsed = parseFrontmatter(c.raw);
    const existing =
      parsed.frontmatter && typeof parsed.frontmatter === 'object' ? parsed.frontmatter : {};
    const bodySource = parsed.hasFrontmatter ? parsed.body : c.raw;
    const derived = deriveFrontmatter(c.path, bodySource, statSync(c.absPath).mtime, opts);
    const frontmatter = { ...derived, ...pickDefined(existing) };

    const { body, conversions } = convertWikilinks(bodySource, resolve);
    const newText = serializeConcept(frontmatter, body);
    items.push({
      path: c.path,
      frontmatter,
      conversions,
      newText,
      valid: validateConcept(newText, c.path).ok,
    });
  }
  return { items, alreadyValid };
}

/** Apply a migration plan (write files, log, then reindex). Returns written paths. */
export function applyMigration(vaultRoot: string, plan: MigrationPlan): string[] {
  for (const item of plan.items) {
    writeFileManaged(join(vaultRoot, item.path), item.newText);
    appendLog(vaultRoot, {
      action: 'Migrated',
      title: String(item.frontmatter.title ?? item.path),
      link: `/${item.path}`,
    });
  }
  if (plan.items.length > 0) reindex(vaultRoot);
  return plan.items.map((i) => i.path);
}
