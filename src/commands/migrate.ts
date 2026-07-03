import { resolve } from 'node:path';
import type { Command } from 'commander';
import { applyMigration, planMigration } from '../migrate';
import { requireVaultRoot, runCommand } from './util';

export function registerMigrate(program: Command): void {
  program
    .command('migrate [dir]')
    .description('Adopt existing Markdown notes as OKF concepts (frontmatter + links). (Phase 6)')
    .option('--write', 'apply the migration (default: dry-run preview)')
    .option('--type <type>', 'OKF type for migrated notes', 'Reference')
    .action((dir: string | undefined, opts: { write?: boolean; type?: string }) =>
      runCommand(() => {
        const root = requireVaultRoot(dir ? resolve(dir) : process.cwd());
        const plan = planMigration(root, { type: opts.type });

        process.stdout.write(
          `engram migrate: ${plan.items.length} to migrate, ${plan.alreadyValid.length} already conformant\n`,
        );
        if (plan.items.length === 0) return;

        for (const item of plan.items) {
          const links = item.conversions.length;
          const unresolved = item.conversions.filter((c) => !c.resolved).length;
          const linkNote = links
            ? ` · ${links} link${links === 1 ? '' : 's'}${unresolved ? ` (${unresolved} unresolved)` : ''}`
            : '';
          const flag = item.valid ? '' : ' ⚠ still invalid — review';
          const tags = (item.frontmatter.tags as string[] | undefined)?.join(', ') ?? '';
          process.stdout.write(
            `  ${item.path}\n    → ${String(item.frontmatter.type)}: "${String(item.frontmatter.title)}" [${tags}]${linkNote}${flag}\n`,
          );
        }

        if (!opts.write) {
          process.stdout.write('\nDry-run — re-run with --write to apply.\n');
          return;
        }

        applyMigration(root, plan);
        const invalid = plan.items.filter((i) => !i.valid);
        process.stdout.write(
          `\nengram: migrated ${plan.items.length} file(s); indexes regenerated.\n`,
        );
        if (invalid.length > 0) {
          process.stdout.write(
            `  ${invalid.length} still need manual review: ${invalid.map((i) => i.path).join(', ')}\n`,
          );
        }
      }),
    );
}
