import { describe, expect, it } from 'vitest';
import { buildProgram } from '../src/cli-program';
import { COMMANDS } from '../src/commands/registry';
import { VERSION } from '../src/version';

describe('cli program', () => {
  it('registers every planned public subcommand plus the hidden hook', () => {
    const names = buildProgram()
      .commands.map((c) => c.name())
      .sort();
    for (const spec of COMMANDS) expect(names).toContain(spec.name);
    expect(names).toContain('hook');
  });

  it('reports the package version', () => {
    expect(buildProgram().version()).toBe(VERSION);
  });

  it('gives every command a non-empty description', () => {
    for (const cmd of buildProgram().commands) {
      expect(cmd.description().length).toBeGreaterThan(0);
    }
  });

  it('has no remaining stubs — recall (Phase 2) and promote (Phase 4) are wired', () => {
    const stubs = COMMANDS.filter((c) => !c.register).map((c) => c.name);
    expect(stubs).toEqual([]);
  });

  it('registers promote with a real handler and its options', () => {
    const promote = buildProgram().commands.find((c) => c.name() === 'promote');
    expect(promote).toBeDefined();
    const flags = (promote?.options ?? []).map((o) => o.long);
    expect(flags).toEqual(
      expect.arrayContaining(['--type', '--tags', '--description', '--to', '--dry-run']),
    );
  });
});
