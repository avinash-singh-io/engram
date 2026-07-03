import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, sep } from 'node:path';
import { isReservedFile, pathToConceptId } from '../format/concept-id';
import { parseFrontmatter } from '../format/frontmatter';
import { validateConcept } from '../format/validate';
import { reindex } from '../indexer/reindex';
import { appendLog } from '../vault/log';
import { findVaultRoot } from '../vault/paths';

export type HookAction = 'validated' | 'skipped' | 'blocked';

export interface HookResult {
  ok: boolean;
  action: HookAction;
  messages: string[];
}

const skip = (reason: string): HookResult => ({ ok: true, action: 'skipped', messages: [reason] });

/**
 * The write-hook engine (ADR-0008). On a concept write inside a vault: revalidate
 * (fail-loud — surface errors, `ok:false`), then keep indexes fresh and log the
 * change. Non-concept / reserved / inbox / non-vault writes are silent no-ops.
 */
export function runWriteHook(absFilePath: string): HookResult {
  if (!absFilePath.endsWith('.md')) return skip('not a markdown file');

  const root = findVaultRoot(dirname(absFilePath));
  if (!root) return skip('not inside an engram vault');

  const rel = relative(root, absFilePath).split(sep).join('/');
  if (
    isReservedFile(rel) ||
    rel.startsWith('inbox/') ||
    rel.split('/').some((p) => p.startsWith('.'))
  ) {
    return skip(`reserved or non-concept path: ${rel}`);
  }
  if (!existsSync(absFilePath)) return skip('file does not exist');

  const text = readFileSync(absFilePath, 'utf8');
  const result = validateConcept(text, rel);
  if (!result.ok) {
    return {
      ok: false,
      action: 'blocked',
      messages: result.errors.map((e) => `${e.code}: ${e.message}`),
    };
  }

  reindex(root); // writes only the index.md files that actually changed
  const title = String(parseFrontmatter(text).frontmatter?.title ?? pathToConceptId(rel));
  appendLog(root, { action: 'Updated', title, link: `/${rel}` });

  return { ok: true, action: 'validated', messages: [`revalidated + reindexed ${rel}`] };
}
