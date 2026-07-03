import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Command } from 'commander';
import { validateConcept } from '../format/validate';
import { reindex } from '../indexer/reindex';
import { readVault } from '../vault/read';
import { requireVaultRoot, runCommand } from './util';

/** One health finding about a concept or the vault as a whole. */
export interface DoctorFinding {
  /** Vault-relative path of the offending file, or '.' for vault-wide checks. */
  path: string;
  /** Stable finding code (validator code, or an `sync-`/`index-` health code). */
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

/** The read-only vault health report. `ok` is false iff any error finding exists. */
export interface DoctorReport {
  root: string;
  conceptsChecked: number;
  gitPresent: boolean;
  findings: DoctorFinding[];
  ok: boolean;
}

// Git conflict markers are unambiguous: seven identical chars followed by a
// space or end-of-line. We do NOT scan for a bare `=======` because setext
// headings and rules can produce that legitimately; the open/base/close markers
// alone are a false-positive-free conflict signal.
const CONFLICT_MARKERS = [/^<{7}(?= |$)/m, /^\|{7}(?= |$)/m, /^>{7}(?= |$)/m];
const BOM = 0xfeff;

function hasConflictMarker(text: string): boolean {
  return CONFLICT_MARKERS.some((re) => re.test(text));
}

/**
 * Group vault-relative paths that fold to the same name on a case-insensitive
 * backend (e.g. `Note.md` and `note.md`). Returned groups have length > 1 and
 * are sorted. Pure so it is testable off a case-insensitive host filesystem.
 */
export function caseFoldCollisions(paths: string[]): string[][] {
  const byFold = new Map<string, string[]>();
  for (const p of paths) {
    const fold = p.toLowerCase();
    const list = byFold.get(fold) ?? [];
    list.push(p);
    byFold.set(fold, list);
  }
  return [...byFold.values()].filter((g) => g.length > 1).map((g) => [...g].sort());
}

/**
 * Walk a vault (read-only) and report OKF conformance + sync-health issues.
 * Reuses the shipped format/indexer libs — this is a checker, never a sync
 * engine (ADR-0004). It runs `validateConcept` over every concept, flags VCS
 * conflict markers, CRLF/BOM line mangling, case-fold filename collisions,
 * stale indexes, and a missing git spine.
 */
export function runDoctor(vaultRoot: string): DoctorReport {
  const model = readVault(vaultRoot);
  const findings: DoctorFinding[] = [];

  for (const concept of model.concepts) {
    const result = validateConcept(concept.raw, concept.path);
    for (const e of result.errors) {
      findings.push({ path: concept.path, code: e.code, message: e.message, severity: 'error' });
    }
    for (const w of result.warnings) {
      findings.push({ path: concept.path, code: w.code, message: w.message, severity: 'warning' });
    }

    if (hasConflictMarker(concept.raw)) {
      findings.push({
        path: concept.path,
        code: 'sync-conflict-marker',
        message: 'Unresolved VCS conflict marker (<<<<<<< / ||||||| / >>>>>>>).',
        severity: 'error',
      });
    }
    if (concept.raw.charCodeAt(0) === BOM) {
      findings.push({
        path: concept.path,
        code: 'sync-bom',
        message: 'File starts with a UTF-8 BOM; a sync channel may have re-encoded it.',
        severity: 'warning',
      });
    }
    if (concept.raw.includes('\r\n')) {
      findings.push({
        path: concept.path,
        code: 'sync-crlf',
        message: 'File uses CRLF line endings; a sync channel may have rewritten them.',
        severity: 'warning',
      });
    }
  }

  // Case-fold filename collisions drift path-based concept IDs on
  // case-insensitive cloud backends (docs/okf-conformance.md §7).
  for (const group of caseFoldCollisions(model.concepts.map((c) => c.path))) {
    findings.push({
      path: group[0] ?? '',
      code: 'sync-case-collision',
      message: `Case-fold collision — these fold to one name on case-insensitive backends: ${group.join(
        ', ',
      )}.`,
      severity: 'error',
    });
  }

  // Index freshness — reuse the shipped indexer in check-only mode (no writes).
  for (const stale of reindex(vaultRoot, { check: true }).changed) {
    findings.push({
      path: stale,
      code: 'index-stale',
      message: 'Index is out of date; run `engram reindex`.',
      severity: 'warning',
    });
  }

  // Sync spine health: git is the source of truth (ADR-0004).
  const gitPresent = existsSync(join(vaultRoot, '.git'));
  if (!gitPresent) {
    findings.push({
      path: '.',
      code: 'sync-no-git',
      message: 'No git repository at the vault root; git is the sync source of truth (ADR-0004).',
      severity: 'warning',
    });
  }

  return {
    root: vaultRoot,
    conceptsChecked: model.concepts.length,
    gitPresent,
    findings,
    ok: findings.every((f) => f.severity !== 'error'),
  };
}

function printReport(report: DoctorReport): void {
  const errors = report.findings.filter((f) => f.severity === 'error');
  const warnings = report.findings.filter((f) => f.severity === 'warning');
  process.stdout.write(`engram doctor: ${report.root}\n`);
  process.stdout.write(`  concepts: ${report.conceptsChecked} checked\n`);
  process.stdout.write(`  git spine: ${report.gitPresent ? 'present' : 'MISSING'}\n`);
  process.stdout.write(`  findings: ${errors.length} error(s), ${warnings.length} warning(s)\n`);
  for (const f of errors) {
    process.stdout.write(`  ERROR ${f.path} — ${f.code}: ${f.message}\n`);
  }
  for (const f of warnings) {
    process.stdout.write(`  WARN  ${f.path} — ${f.code}: ${f.message}\n`);
  }
  if (report.ok) {
    process.stdout.write('engram: vault healthy\n');
  } else {
    process.stderr.write(`engram: ${errors.length} error(s) — vault not healthy\n`);
  }
}

export function registerDoctor(program: Command): void {
  program
    .command('doctor [dir]')
    .description('Validate every concept and check sync health, read-only. (Phase 3)')
    .option('--json', 'emit the full report as JSON')
    .action((dir: string | undefined, opts: { json?: boolean }) =>
      runCommand(() => {
        const root = requireVaultRoot(dir ? resolve(dir) : process.cwd());
        const report = runDoctor(root);
        if (opts.json) {
          process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        } else {
          printReport(report);
        }
        if (!report.ok) process.exitCode = 1;
      }),
    );
}
