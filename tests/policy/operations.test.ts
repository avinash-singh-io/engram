/**
 * The operation registry — one list, and the invariants that keep it one.
 *
 * `skill-schema.ts` named the six operations and `surface/agents-md.ts` separately
 * held a table of the same six. Two lists of the same thing is the shape that
 * produced BUG-008 twice. These assert over the registry rather than over the six
 * entries that happen to be in it, so adding a seventh operation fails loudly here
 * instead of silently shipping a contract that omits it.
 */

import { describe, expect, it } from 'vitest';
import {
  getOperation,
  operations,
  operationSkills,
  OPERATION_TOOLS,
} from '../../src/policy/operations.js';
import { BUILT_IN_SKILLS, discoverSkills, parseSkill } from '../../src/policy/skills.js';
import { OPERATIONS } from '../../src/policy/skill-schema.js';
import { generateAgentsMd } from '../../src/surface/agents-md.js';
import { DEFAULTS } from '../../src/policy/config.js';
import { memoryFileStore } from '../../src/substrate/index.js';
import { parseFrontmatter } from '../../src/format/registry.js';

describe('the registry covers every operation', () => {
  it('has a definition for each, and no extras', () => {
    expect(operations().map((o) => o.name)).toEqual([...OPERATIONS]);
  });

  it('gives each one a command, a description and a when-to-use', () => {
    for (const op of operations()) {
      expect(op.command.startsWith('engram '), op.name).toBe(true);
      expect(op.does.length, op.name).toBeGreaterThan(20);
      expect(op.steps.length, op.name).toBeGreaterThan(2);
    }
  });

  it('writes a description that says when to use it, not just what it is called', () => {
    // Load-bearing: `description` is what an agent matches against when deciding
    // whether to load a skill. One that restates the name makes the skill
    // unreachable except by explicit invocation.
    for (const op of operations()) {
      expect(op.when.length, op.name).toBeGreaterThan(60);
      // A usage trigger as its own sentence — "Use when…", "Use after…",
      // "Use whenever…". What matters is that it names an occasion, not that it
      // uses one particular phrasing.
      expect(op.when.toLowerCase(), op.name).toMatch(/\. use (when|after|before|whenever)/);
    }
  });
});

describe('every operation ships as a skill', () => {
  it('generates one per operation, from the registry', () => {
    expect(operationSkills().map((s) => s.name)).toEqual([...OPERATIONS]);
  });

  it('each declares exactly the operation it describes', () => {
    for (const s of operationSkills()) expect(s.uses).toEqual([s.name]);
  });

  it('each says how to actually run it — a shell command, not just a name', () => {
    // The finding that started this phase: the contract listed `engram capture
    // [text]` in a table and never said whether that was a shell command, a CLI
    // subcommand or an MCP tool.
    for (const s of operationSkills()) {
      expect(s.body, s.name).toContain('```bash');
      expect(s.body, s.name).toContain('# How to run it');
    }
  });

  it("each is a valid skill by engram's own validator", async () => {
    // They go through serializeSkill and back through parseSkill like any other, so
    // a mistake in a generated skill fails the same way a mistake in yours does.
    const { skills, errors } = await discoverSkills(memoryFileStore());
    expect(errors).toEqual([]);
    for (const name of OPERATIONS) expect(skills.map((s) => s.name)).toContain(name);
  });

  it('declares the tool hint on every rendered operation skill', () => {
    // Experimental in the hosts, so this is a hint and the docs say so. Asserted
    // because a hint that silently stops being emitted is worse than none.
    expect(OPERATION_TOOLS).toBe('Bash(engram:*)');
    for (const name of OPERATIONS) {
      const rendered = BUILT_IN_SKILLS[name]!;
      // Asserted on the parsed value, not the raw line: `Bash(engram:*)` contains a
      // colon, so it is written quoted or a real YAML parser reads it as a mapping.
      expect(parseFrontmatter(rendered).frontmatter?.['allowed-tools'], name).toBe(OPERATION_TOOLS);
      expect(parseSkill(rendered, 'built-in'), name).toHaveProperty('skill');
    }
  });

  it('tells an agent that a queued format is not a failure', () => {
    // The most consequential thing an agent can get wrong about engram: treating a
    // deferral as an error and retrying, which turns a refusal into a retry loop.
    const format = operationSkills().find((s) => s.name === 'format')!;
    expect(format.body).toMatch(/not a failure/i);
    expect(format.body).toMatch(/must not be retried/i);
  });
});

describe('the contract reads from the same registry', () => {
  it('lists every operation the registry has', () => {
    const md = generateAgentsMd(DEFAULTS, 'default');
    for (const op of operations()) expect(md).toContain(op.does);
  });

  it('cannot drift, because there is no second list to drift from', () => {
    // Asserted by construction: the table is generated from `operations()`. If a
    // future edit reintroduces a literal table, this fails.
    const md = generateAgentsMd(DEFAULTS, 'default');
    for (const name of OPERATIONS) {
      expect(getOperation(name), name).toBeDefined();
      expect(md, name).toContain(getOperation(name)!.command);
    }
  });
});
