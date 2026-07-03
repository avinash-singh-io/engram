import type { Command } from 'commander';
import { reindex } from '../indexer/reindex';
import { requireVaultRoot, runCommand } from './util';

export function registerReindex(program: Command): void {
  program
    .command('reindex')
    .description('Regenerate index.md files from concept frontmatter. (Phase 1)')
    .option('--check', 'report drift without writing (exit 1 if stale)')
    .action((opts: { check?: boolean }) =>
      runCommand(() => {
        const root = requireVaultRoot();
        const res = reindex(root, { check: Boolean(opts.check) });
        if (opts.check) {
          if (res.changed.length > 0) {
            process.stderr.write(
              `engram: ${res.changed.length} index(es) out of date:\n${res.changed.map((c) => `  ${c}`).join('\n')}\n`,
            );
            process.exitCode = 1;
          } else {
            process.stdout.write('engram: indexes up to date\n');
          }
        } else {
          process.stdout.write(
            `engram: reindexed (${res.changed.length} changed of ${res.checked})\n`,
          );
        }
      }),
    );
}
