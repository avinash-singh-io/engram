import { Command } from 'commander';
import { VERSION } from './version';
import { COMMANDS } from './commands/registry';

/**
 * Build the Engram CLI program. Kept separate from the `cli.ts` bin entry so it
 * can be unit-tested without the bin auto-parsing `process.argv`.
 */
export function buildProgram(): Command {
  const program = new Command();

  program
    .name('engram')
    .description('OKF-native knowledge base that agents and humans read and write together.')
    .version(VERSION, '-v, --version', 'print the engram version')
    .showHelpAfterError();

  for (const spec of COMMANDS) {
    program
      .command(spec.name)
      .description(`${spec.summary} (${spec.phase})`)
      .action(() => {
        process.stderr.write(
          `engram ${spec.name}: not yet implemented — arriving in ${spec.phase}.\n`,
        );
        process.exitCode = 2;
      });
  }

  return program;
}
