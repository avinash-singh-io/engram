import { readFileSync } from 'node:fs';
import type { Command } from 'commander';
import { validateConcept } from '../format/validate';
import { reindex } from '../indexer/reindex';
import { appendLog } from '../vault/log';
import { readVault, type ConceptRecord, type VaultModel } from '../vault/read';
import { writeFileManaged } from '../vault/write';
import { fail, requireVaultRoot } from './util';

function tagsOf(c: ConceptRecord): string[] {
  const t = c.frontmatter?.tags;
  return Array.isArray(t) ? t.filter((x): x is string => typeof x === 'string') : [];
}

function titleOf(c: ConceptRecord): string {
  return String(c.frontmatter?.title ?? c.id);
}

/** Resolve a concept by id, vault path, or link (`/a/b.md`, `a/b`, `a/b.md`). */
export function findConcept(model: VaultModel, ref: string): ConceptRecord | undefined {
  const norm = ref.replace(/^\//, '').replace(/\.md$/i, '');
  return model.concepts.find((c) => c.id === norm || c.path === `${norm}.md`);
}

export interface LinkSuggestion {
  concept: ConceptRecord;
  shared: string[];
}

/** Rank other concepts by tag overlap (no embeddings — non-goal N3). */
export function suggestByTags(model: VaultModel, src: ConceptRecord, limit = 10): LinkSuggestion[] {
  const srcTags = new Set(tagsOf(src));
  return model.concepts
    .filter((c) => c.id !== src.id)
    .map((concept) => ({ concept, shared: tagsOf(concept).filter((t) => srcTags.has(t)) }))
    .filter((x) => x.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || a.concept.id.localeCompare(b.concept.id))
    .slice(0, limit);
}

function insertSeeAlso(src: ConceptRecord, target: ConceptRecord): void {
  const bullet = `- [${titleOf(target)}](/${target.path})`;
  let text = readFileSync(src.absPath, 'utf8').replace(/\s+$/, '');
  if (text.includes(`(/${target.path})`)) return; // already linked
  if (/^#{1,6}\s+See also\s*$/im.test(text)) {
    text = `${text}\n${bullet}`;
  } else {
    text = `${text}\n\n# See also\n\n${bullet}`;
  }
  writeFileManaged(src.absPath, `${text}\n`);
}

export interface LinkOptions {
  to?: string;
  suggest?: boolean;
  cwd?: string;
}

export function runLink(concept: string, opts: LinkOptions): void {
  const root = requireVaultRoot(opts.cwd);
  const model = readVault(root);
  const src = findConcept(model, concept);
  if (!src) fail(`concept not found: ${concept}`);

  if (opts.suggest) {
    const suggestions = suggestByTags(model, src);
    if (suggestions.length === 0) {
      process.stdout.write('engram: no tag-overlap suggestions.\n');
      return;
    }
    for (const s of suggestions) {
      process.stdout.write(`  /${s.concept.path}  (shared: ${s.shared.join(', ')})\n`);
    }
    return;
  }

  if (!opts.to) fail('specify --suggest or --to <concept>');
  const target = findConcept(model, opts.to);
  if (!target) fail(`target concept not found: ${opts.to}`);

  insertSeeAlso(src, target);
  const revalidated = validateConcept(readFileSync(src.absPath, 'utf8'), src.path);
  if (!revalidated.ok) fail('link produced a non-conformant concept (aborted)');

  reindex(root);
  appendLog(root, { action: 'Linked', title: titleOf(src), link: `/${src.path}` });
  process.stdout.write(`engram: linked /${src.path} -> /${target.path}\n`);
}

export function registerLink(program: Command): void {
  program
    .command('link <concept>')
    .description('Suggest and insert cross-links between related concepts. (Phase 1)')
    .option('--to <concept>', 'target concept to link to')
    .option('--suggest', 'list tag-overlap suggestions')
    .action((concept: string, opts: LinkOptions) => runLink(concept, opts));
}
