import { existsSync, readFileSync, renameSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import type { Command } from 'commander';
import { isReservedFile } from '../format/concept-id';
import { serializeConcept } from '../format/serialize';
import { validateConcept } from '../format/validate';
import { reindex } from '../indexer/reindex';
import { appendLog } from '../vault/log';
import { ensureDir, writeFileSafe } from '../vault/write';
import { fail, isoTimestamp, parseTags, requireVaultRoot, runCommand } from './util';

export interface RefineOptions {
  to: string;
  title: string;
  description: string;
  type?: string;
  tags?: string;
  force?: boolean;
  cwd?: string;
}

/** Turn an inbox item into a filed, OKF-valid concept. Returns the concept path. */
export function runRefine(inbox: string, opts: RefineOptions): string {
  const root = requireVaultRoot(opts.cwd);

  const inboxAbs = isAbsolute(inbox) ? inbox : join(root, inbox);
  if (!existsSync(inboxAbs)) fail(`inbox item not found: ${inbox}`);
  const body = readFileSync(inboxAbs, 'utf8').trim();

  const dest = opts.to.replace(/^\//, '');
  if (!dest.toLowerCase().endsWith('.md') || isReservedFile(dest)) {
    fail(`invalid destination (must be a non-reserved .md path): ${opts.to}`);
  }
  const destAbs = resolve(root, dest);
  if (destAbs !== root && !destAbs.startsWith(root + sep)) fail('destination escapes the vault');

  const frontmatter = {
    type: opts.type ?? 'Concept',
    title: opts.title,
    description: opts.description,
    tags: parseTags(opts.tags),
    timestamp: isoTimestamp(),
  };
  const text = serializeConcept(frontmatter, body || '# Notes');
  const result = validateConcept(text, dest);
  if (!result.ok) {
    fail(
      `refusing to write a non-conformant concept:\n${result.errors.map((e) => `  ${e.code}: ${e.message}`).join('\n')}`,
    );
  }

  if (!writeFileSafe(destAbs, text, { force: opts.force })) {
    fail(`destination already exists: ${dest} (choose a different --to or pass --force)`);
  }

  // Archive the inbox item non-destructively (Principle 6).
  const archiveAbs = join(root, '.engram', 'archive', 'inbox', basename(inboxAbs));
  ensureDir(dirname(archiveAbs));
  renameSync(inboxAbs, archiveAbs);

  reindex(root);
  appendLog(root, { action: 'Added', title: opts.title, link: `/${dest}` });
  return destAbs;
}

export function registerRefine(program: Command): void {
  program
    .command('refine <inbox>')
    .description('Turn an inbox item into a filed, frontmatter-complete concept. (Phase 1)')
    .requiredOption('--to <path>', 'vault-relative destination, e.g. system-design/x.md')
    .requiredOption('--title <title>', 'concept title')
    .requiredOption('--description <text>', 'one-sentence description')
    .option('--type <type>', 'OKF type', 'Concept')
    .option('--tags <csv>', 'comma-separated tags', '')
    .option('--force', 'overwrite an existing destination')
    .action((inbox: string, opts: RefineOptions) =>
      runCommand(() => {
        const dest = runRefine(inbox, opts);
        process.stdout.write(`engram: filed -> ${dest}\n`);
      }),
    );
}
