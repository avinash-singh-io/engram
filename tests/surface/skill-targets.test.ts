/**
 * Where engram may write a skill, and what it is called once it is there.
 *
 * These are invariants over the **registry**, not over the three descriptors that
 * happen to be in it today. Adding an agent is supposed to be adding a descriptor;
 * these tests are what make that true instead of merely intended.
 */

import { describe, expect, it } from 'vitest';
import {
  AGENTS,
  ENGRAM_PLUGIN,
  invocationName,
  isSkillPath,
  skillPath,
  skillTargets,
  type AgentDescriptor,
} from '../../src/surface/adapters.js';

describe('skill targets', () => {
  it('every declared target records how it was verified', () => {
    // ADR-0044 refused to write to `.agents/skills/` because it could not be
    // verified as read. That principle is worth nothing as prose — this is the
    // mechanical form of it, so a plausible path from a blog post cannot be added
    // without someone first watching a skill load from it.
    for (const agent of skillTargets()) {
      expect(agent.skills.verified.length, `${agent.name} has no verification`).toBeGreaterThan(30);
    }
  });

  it('never writes outside the vault', () => {
    // A home directory would be machine-wide and would leak one vault's skills into
    // every unrelated project. Vault-relative paths are the whole reason project
    // scope was chosen over the friction-free personal one.
    for (const agent of skillTargets()) {
      expect(agent.skills.dir.startsWith('/')).toBe(true);
      expect(agent.skills.dir).not.toContain('~');
      expect(agent.skills.dir).not.toContain('..');
    }
  });

  it('gives Claude Code a plugin and the others a prefix', () => {
    const claude = AGENTS.find((a) => a.name === 'claude');
    expect(claude?.skills?.plugin).toBe(ENGRAM_PLUGIN);
    for (const agent of skillTargets()) {
      if (agent.name === 'claude') continue;
      expect(agent.skills.plugin).toBeNull();
    }
  });
});

describe('invocationName', () => {
  const claude = skillTargets().find((a) => a.name === 'claude')!.skills;
  const gemini = skillTargets().find((a) => a.name === 'gemini')!.skills;

  it("namespaces engram's own skills where the host does it for us", () => {
    expect(invocationName(claude, 'format', true)).toBe('/engram:format');
  });

  it("prefixes engram's own skills where it does not", () => {
    expect(invocationName(gemini, 'format', true)).toBe('/engram-format');
  });

  it('leaves a skill you wrote unmarked in every host', () => {
    // The one rule the whole design rests on: if it carries engram's mark, engram
    // wrote it. A user's own name is theirs, unprefixed, everywhere.
    for (const agent of skillTargets()) {
      expect(invocationName(agent.skills, 'literature-review', false)).toBe('/literature-review');
    }
  });
});

describe('skillPath', () => {
  const claude = skillTargets().find((a) => a.name === 'claude')!.skills;
  const gemini = skillTargets().find((a) => a.name === 'gemini')!.skills;

  it('puts a managed skill under the plugin, not beside the manifest', () => {
    // The documented common mistake: `skills/` belongs at the plugin ROOT, never
    // inside `.claude-plugin/`, which holds `plugin.json` and nothing else.
    expect(skillPath(claude, 'format', true)).toBe('/.claude/skills/engram/skills/format/SKILL.md');
    expect(skillPath(claude, 'format', true)).not.toContain('.claude-plugin/skills');
  });

  it('names the directory exactly what the skill is invoked as', () => {
    // The standard requires `name` to match the parent directory. Where engram
    // prefixes the invocation it must prefix the directory too, or the rendered
    // skill is invalid rather than merely oddly named.
    expect(skillPath(gemini, 'format', true)).toBe('/.gemini/skills/engram-format/SKILL.md');
  });

  it('agrees with invocationName for every target and both origins', () => {
    for (const agent of skillTargets()) {
      for (const managed of [true, false]) {
        const invoked = invocationName(agent.skills, 'format', managed).replace(/^\/|.*:/g, '');
        expect(skillPath(agent.skills, 'format', managed)).toContain(`/${invoked}/SKILL.md`);
      }
    }
  });
});

describe('isSkillPath', () => {
  it('covers every target in the registry', () => {
    // Derived, never restated. `RESERVED_FILES` restated a list the adapter registry
    // also owned, and `reindex` indexed its own GEMINI.md as a knowledge node
    // (BUG-008) — then reproduced it with STRUCTURE.md the same day. A rendered
    // SKILL.md is the third instance of that shape waiting to happen.
    for (const agent of skillTargets()) {
      expect(isSkillPath(`${agent.skills.dir}/anything/SKILL.md`)).toBe(true);
    }
  });

  it('does not claim a path merely because it looks similar', () => {
    expect(isSkillPath('/engram/skills/mine/SKILL.md')).toBe(false);
    expect(isSkillPath('/.claude/settings.json')).toBe(false);
    expect(isSkillPath('/.claude/commands/foo.md')).toBe(false);
    expect(isSkillPath('/concepts/note.md')).toBe(false);
  });

  it('picks up an agent added later without touching this function', () => {
    const invented: AgentDescriptor[] = [
      {
        name: 'invented',
        contractFile: '/INVENTED.md',
        why: 'test',
        skills: { dir: '/.invented/skills', plugin: null, verified: 'x'.repeat(40), caveats: [] },
      },
    ];
    expect(isSkillPath('/.invented/skills/a/SKILL.md', invented)).toBe(true);
  });
});
