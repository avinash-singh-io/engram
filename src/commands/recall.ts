import type { Command } from 'commander';
import { checkIndexQuality } from '../retrieval/index-quality';
import { navigate, type NavigateOptions } from '../retrieval/navigate';
import { writeAgentsContract } from '../retrieval/agents-contract';
import { resolveVaultRoot } from '../retrieval/vault-root';
import type { RecallReference, RecallResult } from '../retrieval/types';
import { fail, runCommand } from './util';

export interface RecallCliOptions {
  tag?: string[];
  type?: string;
  max?: string;
  hops?: string;
  vault?: string;
  json?: boolean;
  explain?: boolean;
  sections?: boolean;
  emitContract?: boolean;
  checkIndex?: boolean;
  /** Test seam — overrides cwd for vault discovery. */
  cwd?: string;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function toNavigateOptions(opts: RecallCliOptions): NavigateOptions {
  return {
    tags: opts.tag,
    type: opts.type,
    max: parsePositiveInt(opts.max, 5),
    hops: parsePositiveInt(opts.hops, 0),
    sections: Boolean(opts.sections),
  };
}

function renderReference(ref: RecallReference, n: number, explain: boolean): string {
  const lines = [
    `${n}. [${ref.title}](${ref.link})`,
    `   ${ref.description || '(no description)'}`,
  ];
  if (explain) {
    lines.push(`   via ${ref.via} · score ${ref.score.toFixed(1)} · ${ref.why.join(', ')}`);
  } else if (ref.why.length > 0) {
    lines.push(`   why: ${ref.why.join(', ')}`);
  }
  if (ref.sections && ref.sections.length > 0) {
    lines.push(`   sections: ${ref.sections.map((s) => s.heading).join(' · ')}`);
  }
  return lines.join('\n');
}

function renderHuman(result: RecallResult, explain: boolean): string {
  const r = result.report;
  const header = `engram recall "${result.query}" — ${result.results.length} reference${
    result.results.length === 1 ? '' : 's'
  } (touched ${r.filesTouched}/${r.conceptCount} files, ${r.bodyReads} bodies)`;
  const body = result.results.map((ref, i) => renderReference(ref, i + 1, explain)).join('\n');
  const out = [header, '', body];
  if (explain) {
    out.push(
      '',
      `reads: index=${r.byTier.index.reads} frontmatter=${r.byTier.frontmatter.reads} grep=${r.byTier.grep.reads} body=${r.byTier.body.reads} (${r.bytes} bytes)`,
    );
  }
  return `${out.join('\n')}\n`;
}

/** Core recall action; returns the exit code and writes output. Test seam. */
export function runRecall(query: string | undefined, opts: RecallCliOptions = {}): number {
  const root = resolveVaultRoot(opts.cwd ?? process.cwd(), opts.vault);

  if (opts.emitContract) {
    const res = writeAgentsContract(root);
    process.stdout.write(
      `engram: ${res.changed ? 'wrote' : 'already current'} AGENTS.md traversal contract at ${res.path}\n`,
    );
    return 0;
  }

  if (opts.checkIndex) {
    const report = checkIndexQuality(root);
    if (report.issues.length === 0) {
      process.stdout.write(
        `engram: indexes are navigation-grade (${report.stats.indexes} indexes, ${report.stats.concepts} concepts)\n`,
      );
      return 0;
    }
    process.stderr.write(
      `engram: ${report.issues.length} index-quality issue(s):\n${report.issues
        .map((i) => `  [${i.severity}] ${i.code}: ${i.message}`)
        .join('\n')}\n`,
    );
    return 1;
  }

  if (!query || query.trim() === '') {
    fail('recall needs a query, or use --emit-contract / --check-index.', 2);
  }

  const result = navigate(root, query, toNavigateOptions(opts));

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.results.length > 0 ? 0 : 1;
  }

  if (result.results.length === 0) {
    process.stderr.write(
      `engram: no concept above threshold for "${query}".\n${(result.suggestions ?? [])
        .map((s) => `  - ${s}`)
        .join('\n')}\n`,
    );
    return 1;
  }

  process.stdout.write(renderHuman(result, Boolean(opts.explain)));
  return 0;
}

export function registerRecall(program: Command): void {
  program
    .command('recall [query]')
    .description('Navigate the vault and return the minimal relevant concepts. (Phase 2)')
    .option('--tag <tags...>', 'require at least one of these tags')
    .option('--type <type>', 'require this concept type')
    .option('--max <n>', 'maximum references to return', '5')
    .option('--hops <n>', 'one-hop link expansion from the top reference', '0')
    .option('--vault <path>', 'vault root (default: discover from cwd)')
    .option('--json', 'machine-readable output including the ReadReport')
    .option('--explain', 'show scores, match trail, and read tiers')
    .option('--sections', 'extract matched headings (reads bodies, bounded)')
    .option('--emit-contract', 'write the AGENTS.md traversal contract and exit')
    .option('--check-index', 'check the vault indexes are navigation-grade and exit')
    .action((query: string | undefined, opts: RecallCliOptions) =>
      runCommand(() => {
        process.exitCode = runRecall(query, opts);
      }),
    );
}
