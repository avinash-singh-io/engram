import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve, sep } from 'node:path';
import type { Command } from 'commander';
import type { ValidationResult } from '../format/types';
import { reindex } from '../indexer/reindex';
import { promoteMomentum } from '../promote';
import { appendLog } from '../vault/log';
import { writeFileSafe } from '../vault/write';
import { fail, parseTags, requireVaultRoot, runCommand } from './util';

export interface PromoteOptions {
  /** OKF type override (default `Reference`). */
  type?: string;
  /** Extra comma-separated tags merged with the derived ones. */
  tags?: string;
  /** Override the derived one-sentence description. */
  description?: string;
  /** Target vault directory (default `references`). */
  to?: string;
  /** Render + validate + print the plan; write nothing. */
  dryRun?: boolean;
  /** Overwrite an existing destination. */
  force?: boolean;
  /** Injected working directory (tests). */
  cwd?: string;
}

export interface PromoteCommandResult {
  /** Vault-relative target path. */
  targetPath: string;
  /** True when a file was written (false for dry-run). */
  written: boolean;
  ok: boolean;
  conceptText: string;
}

function printValidation(v: ValidationResult): void {
  for (const e of v.errors) process.stdout.write(`  ERROR ${e.code}: ${e.message}\n`);
  for (const w of v.warnings) process.stdout.write(`  warn  ${w.code}: ${w.message}\n`);
}

/**
 * Promote a momentum artifact into the vault as a one-way OKF `Reference`
 * concept. Reads the source as plain text (no momentum code dependency,
 * ADR-0001), validates before writing (hard gate, ADR-0011), then reuses the
 * Phase 1 reindex + log writer to link the concept in.
 */
export function runPromote(sourceArg: string, opts: PromoteOptions = {}): PromoteCommandResult {
  const root = requireVaultRoot(opts.cwd);

  const base = opts.cwd ?? process.cwd();
  const sourceAbs = isAbsolute(sourceArg) ? sourceArg : resolve(base, sourceArg);
  if (!existsSync(sourceAbs)) fail(`momentum source not found: ${sourceArg}`, 1);
  const sourceText = readFileSync(sourceAbs, 'utf8');

  const result = promoteMomentum({
    sourceText,
    sourcePath: sourceAbs,
    targetDir: opts.to ?? 'references',
    type: opts.type,
    tags: opts.tags ? parseTags(opts.tags) : undefined,
    description: opts.description,
  });

  // The concept must land inside the vault (path-traversal guard, as in refine).
  const destAbs = resolve(root, result.targetPath);
  if (destAbs !== root && !destAbs.startsWith(root + sep)) fail('destination escapes the vault');

  if (opts.dryRun) {
    process.stdout.write(
      `engram promote (dry-run): ${result.sourceRef} -> ${result.targetPath}\n\n`,
    );
    process.stdout.write(result.conceptText);
    process.stdout.write(`\n${result.logLine}\n`);
    printValidation(result.validation);
    if (!result.ok) fail('non-conformant mapping — nothing written', 1);
    return {
      targetPath: result.targetPath,
      written: false,
      ok: true,
      conceptText: result.conceptText,
    };
  }

  // HARD GATE: never write a non-conformant concept (ADR-0011).
  if (!result.ok) {
    fail(
      'refusing to promote a non-conformant concept:\n' +
        result.validation.errors.map((e) => `  ${e.code}: ${e.message}`).join('\n'),
    );
  }

  if (!writeFileSafe(destAbs, result.conceptText, { force: opts.force })) {
    fail(`destination already exists: ${result.targetPath} (choose --to or pass --force)`);
  }

  reindex(root);
  appendLog(root, result.logEntry);
  return {
    targetPath: result.targetPath,
    written: true,
    ok: true,
    conceptText: result.conceptText,
  };
}

export function registerPromote(program: Command): void {
  program
    .command('promote <source>')
    .description('Import a momentum ADR/learning as a one-way OKF Reference concept. (Phase 4)')
    .option('--type <type>', 'OKF type', 'Reference')
    .option('--tags <csv>', 'extra comma-separated tags', '')
    .option('--description <text>', 'override the derived one-sentence description')
    .option('--to <dir>', 'target vault directory', 'references')
    .option('--dry-run', 'render + validate + print the placement plan; write nothing')
    .option('--force', 'overwrite an existing destination')
    .action((source: string, opts: PromoteOptions) =>
      runCommand(() => {
        const res = runPromote(source, opts);
        if (res.written) process.stdout.write(`engram: promoted -> ${res.targetPath}\n`);
      }),
    );
}
