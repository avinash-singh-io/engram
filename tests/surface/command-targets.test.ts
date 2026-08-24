/**
 * Where engram may write a command, and what guards that promise.
 *
 * Mirror of `skill-targets.test.ts`, kept deliberately parallel: the same
 * invariants over the **registry**, not over the one descriptor that happens to
 * carry commands today. Adding an agent with a commands target must inherit
 * these guarantees by construction.
 */

import { describe, expect, it } from 'vitest';
import {
  AGENTS,
  commandPath,
  commandTargets,
  isCommandPath,
  isSkillPath,
  type AgentDescriptor,
} from '../../src/surface/adapters.js';

describe('command targets', () => {
  it('every declared target records how it was verified', () => {
    // The ADR-0044 rule, mechanically: no plausible path from documentation
    // without evidence beside the claim.
    for (const agent of commandTargets()) {
      expect(agent.commands.verified.length, `${agent.name} has no verification`).toBeGreaterThan(
        30,
      );
    }
  });

  it('never writes outside the vault', () => {
    for (const agent of commandTargets()) {
      expect(agent.commands.dir.startsWith('/')).toBe(true);
      expect(agent.commands.dir).not.toContain('~');
      expect(agent.commands.dir).not.toContain('..');
    }
  });
});

describe('commandPath', () => {
  const opencode = commandTargets().find((a) => a.name === 'opencode')!.commands;

  it('is always managed-prefixed — commands have no user-authored source', () => {
    expect(commandPath(opencode, 'capture')).toBe('/.opencode/commands/engram-capture.md');
    expect(commandPath(opencode, 'connect-the-dots')).toBe(
      '/.opencode/commands/engram-connect-the-dots.md',
    );
  });

  it('keeps every operation clear of built-in and user command names', () => {
    // opencode lets custom commands override built-ins; the prefix is what keeps
    // `/engram-capture` from ever shadowing anything or being shadowed.
    expect(commandPath(opencode, 'format').endsWith('/engram-format.md')).toBe(true);
  });
});

describe('isCommandPath', () => {
  it('covers every target in the registry', () => {
    // Derived, never restated — BUG-008's shape (GEMINI.md, STRUCTURE.md,
    // SKILL.md) closed at birth for commands rather than after a first escape.
    for (const agent of commandTargets()) {
      expect(isCommandPath(`${agent.commands.dir}/engram-format.md`)).toBe(true);
    }
  });

  it('does not claim paths outside any commands directory', () => {
    expect(isCommandPath('/concepts/note.md')).toBe(false);
    expect(isCommandPath('/AGENTS.md')).toBe(false);
    expect(isCommandPath('/.opencode/skills/probe/SKILL.md')).toBe(false);
  });

  it('picks up an agent added later without touching this function', () => {
    const invented: AgentDescriptor[] = [
      {
        name: 'invented',
        why: 'test',
        contractFile: '/INVENTED.md',
        commands: { dir: '/.invented/commands', verified: 'x'.repeat(40), caveats: [] },
      },
    ];
    expect(isCommandPath('/.invented/commands/engram-x.md', invented)).toBe(true);
  });
});

describe('the opencode descriptor', () => {
  const opencode = AGENTS.find((a) => a.name === 'opencode');

  it('exists with both targets', () => {
    expect(opencode).toBeDefined();
    expect(opencode?.skills?.dir).toBe('/.opencode/skills');
    expect(opencode?.skills?.plugin).toBeNull();
    expect(opencode?.commands?.dir).toBe('/.opencode/commands');
  });

  it('gets no contract copy — it reads AGENTS.md natively', () => {
    // Decision 3: a second contract file for opencode would be a file that
    // exists only to be maintained, exactly the codex precedent.
    expect(opencode?.contractFile).toBeUndefined();
  });

  it('does not disturb the walker exclusions of the others', () => {
    expect(isSkillPath('/.opencode/skills/x/SKILL.md')).toBe(true);
    expect(isCommandPath('/.opencode/commands/engram-x.md')).toBe(true);
    expect(isSkillPath('/.opencode/commands/engram-x.md')).toBe(false);
  });
});
