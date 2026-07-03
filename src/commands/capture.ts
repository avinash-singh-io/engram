import { join } from 'node:path';
import type { Command } from 'commander';
import { appendLog } from '../vault/log';
import { writeFileSafe } from '../vault/write';
import { fileStamp, readStdin, requireVaultRoot, slugify } from './util';

/** Write a raw note into the vault inbox. Returns the created path. */
export function runCapture(text: string, cwd = process.cwd()): string {
  const root = requireVaultRoot(cwd);
  const clean = text.trim();
  const name = `${fileStamp()}-${slugify(clean)}.md`;
  const abs = join(root, 'inbox', name);
  writeFileSafe(abs, `${clean}\n`);
  appendLog(root, {
    action: 'Captured',
    title: clean.slice(0, 60) || name,
    link: `/inbox/${name}`,
  });
  return abs;
}

export function registerCapture(program: Command): void {
  program
    .command('capture [text]')
    .description('Drop a raw note into the inbox for later refinement. (Phase 1)')
    .action(async (text: string | undefined) => {
      const content = text ?? (await readStdin());
      const abs = runCapture(content);
      process.stdout.write(`engram: captured -> ${abs}\n`);
    });
}
