import { isAbsolute, resolve } from 'node:path';
import type { Command } from 'commander';
import { parseHookPayload } from '../hooks/payload';
import { runWriteHook } from '../hooks/write-hook';
import { readStdin } from './util';

/**
 * Hidden internal command driven by a scaffolded Claude Code PostToolUse hook
 * (ADR-0008). Reads the payload on stdin, runs the write-hook per file, and
 * exits non-zero (fail-loud) if any concept fails validation.
 */
export function registerHook(program: Command): void {
  program
    .command('hook', { hidden: true })
    .description('internal: run the write-hook on a PostToolUse payload (stdin)')
    .action(async () => {
      const payload = parseHookPayload(await readStdin());
      let blocked = false;
      for (const fp of payload.filePaths) {
        const abs = isAbsolute(fp) ? fp : resolve(payload.cwd ?? process.cwd(), fp);
        const res = runWriteHook(abs);
        if (!res.ok) {
          blocked = true;
          process.stderr.write(`engram hook: ${res.messages.join('; ')}\n`);
        }
      }
      if (blocked) process.exitCode = 2;
    });
}
