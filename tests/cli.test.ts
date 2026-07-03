import { describe, expect, it } from 'vitest';
import { buildProgram } from '../src/cli-program';
import { COMMANDS } from '../src/commands/registry';
import { VERSION } from '../src/version';

describe('cli program', () => {
  it('registers every planned subcommand', () => {
    const names = buildProgram()
      .commands.map((c) => c.name())
      .sort();
    expect(names).toEqual([...COMMANDS].map((c) => c.name).sort());
  });

  it('reports the package version', () => {
    expect(buildProgram().version()).toBe(VERSION);
  });

  it('gives every command a non-empty description', () => {
    for (const cmd of buildProgram().commands) {
      expect(cmd.description().length).toBeGreaterThan(0);
    }
  });
});
