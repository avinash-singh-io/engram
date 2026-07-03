import { Command } from 'commander';
import { COMMANDS } from './commands/registry';
import { registerHook } from './commands/hook';
import { VERSION } from './version';

/**
 * Build the Engram CLI program. Single dispatch loop: each spec either wires its
 * real command via `register` or gets a stub. Adding a phase's command is a
 * one-entry change to the registry — this loop never changes (shared foundation).
 */
export function buildProgram(): Command {
  const program = new Command();

  program
    .name('engram')
    .description('OKF-native knowledge base that agents and humans read and write together.')
    .version(VERSION, '-v, --version', 'print the engram version')
    .showHelpAfterError();

  for (const spec of COMMANDS) {
    if (spec.register) {
      spec.register(program);
    } else {
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
  }

  registerHook(program);
  return program;
}
