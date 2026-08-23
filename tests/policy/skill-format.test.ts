/**
 * The Agent Skills format — reading it, writing it, and not breaking the old one.
 *
 * Engram's `uses`, `emits` and `guardrails` were top-level fields the standard does
 * not define, which made every engram skill valid in engram and nowhere else. They
 * move under `metadata`. **The validation is unchanged; only its location moves** —
 * and these tests are what makes that claim checkable rather than asserted.
 */

import { describe, expect, it } from 'vitest';
import { planUpgrade, applyUpgrade } from '../../src/ops/upgrade.js';
import {
  discoverSkills,
  isDirectorySkill,
  isFlatSkill,
  managedBy,
  parseSkill,
  serializeSkill,
} from '../../src/policy/skills.js';
import { memoryFileStore } from '../../src/substrate/index.js';

const skill = (raw: string) => {
  const r = parseSkill(raw, 'vault');
  if ('error' in r) throw new Error(r.error.reason);
  return r.skill;
};

const STANDARD = [
  '---',
  'name: mine',
  'description: Does a thing. Use when a thing needs doing.',
  'metadata:',
  '  engram-uses: capture format link',
  '  engram-guardrails: require-sources no-delete',
  '  engram-emits-type: Synthesis',
  '  engram-emits-relations: sources',
  '---',
  '',
  'Body.',
].join('\n');

const LEGACY = [
  '---',
  'name: mine',
  'description: Does a thing.',
  'uses: [capture, format, link]',
  'emits: { type: Synthesis, relations: [sources] }',
  'guardrails: [require-sources, no-delete]',
  '---',
  '',
  'Body.',
].join('\n');

describe('reading the standard layout', () => {
  it('reads a space-separated metadata string as a list', () => {
    expect(skill(STANDARD).uses).toEqual(['capture', 'format', 'link']);
  });

  it('reads emits from its two flat keys', () => {
    expect(skill(STANDARD).emits).toEqual({ type: 'Synthesis', relations: ['sources'] });
  });

  it('reads guardrails from metadata', () => {
    expect(skill(STANDARD).guardrails).toEqual({ enabled: ['require-sources', 'no-delete'] });
  });

  it('reads the other three tightenings, which a flat map still expresses', () => {
    const s = skill(
      [
        '---',
        'name: m',
        'description: d',
        'metadata:',
        '  engram-uses: format',
        '  engram-path-scope: /concepts/ /sources/',
        '  engram-rate-limit: 5',
        '  engram-propose-only: /decisions/',
        '---',
        '',
        'b',
      ].join('\n'),
    );
    expect(s.guardrails).toEqual({
      pathScope: ['/concepts/', '/sources/'],
      rateLimit: 5,
      proposeOnly: ['/decisions/'],
    });
  });

  it('still rejects an operation engram does not have, wherever it is declared', () => {
    // The check that makes v2-overview §6's guarantee real. Moving the field must
    // not have moved the validation with it.
    for (const raw of [
      STANDARD.replace('engram-uses: capture format link', 'engram-uses: capture teleport'),
      LEGACY.replace('uses: [capture, format, link]', 'uses: [capture, teleport]'),
    ]) {
      const r = parseSkill(raw, 'vault');
      expect('error' in r && r.error.reason).toContain('teleport');
    }
  });
});

describe('the legacy layout still loads', () => {
  it('reads uses, emits and guardrails from the top level', () => {
    const s = skill(LEGACY);
    expect(s.uses).toEqual(['capture', 'format', 'link']);
    expect(s.emits).toEqual({ type: 'Synthesis', relations: ['sources'] });
    expect(s.guardrails).toEqual({ enabled: ['require-sources', 'no-delete'] });
  });

  it('keeps the shorthand list form working — the array check must come first', () => {
    // `Array.isArray` is also `typeof 'object'`. Testing for an object first
    // swallows the list form v2-overview §6's own example uses, and the skill then
    // runs with NO guardrails. Silent loosening by parse order, pinned here.
    const s = skill(
      LEGACY.replace('guardrails: [require-sources, no-delete]', 'guardrails: [require-sources]'),
    );
    expect(s.guardrails).toEqual({ enabled: ['require-sources'] });
  });

  it('lets metadata win when a file somehow carries both', () => {
    const both = LEGACY.replace(
      'guardrails: [require-sources, no-delete]',
      'guardrails: [require-sources, no-delete]\nmetadata:\n  engram-uses: doctor',
    );
    expect(skill(both).uses).toEqual(['doctor']);
  });
});

describe('serializeSkill', () => {
  it('round-trips through the parser', () => {
    const before = skill(STANDARD);
    const after = skill(serializeSkill(before));
    expect(after.uses).toEqual(before.uses);
    expect(after.emits).toEqual(before.emits);
    expect(after.guardrails).toEqual(before.guardrails);
    expect(after.description).toBe(before.description);
    expect(after.body.trim()).toBe(before.body.trim());
  });

  it('puts nothing engram-specific at the top level', () => {
    // The whole point: to an agent that has never heard of engram, this is an
    // ordinary valid skill.
    const out = serializeSkill(skill(STANDARD));
    const frontmatter = out.split('---')[1]!;
    const topLevel = frontmatter
      .split('\n')
      .filter((l) => l.trim() !== '' && !/^\s/.test(l))
      .map((l) => l.split(':')[0]);
    expect(topLevel).toEqual(['name', 'description', 'metadata']);
  });

  it('quotes a description that would otherwise break a real YAML parser', () => {
    // Other agents parse this with a full YAML engine, not engram's subset. An
    // unquoted `: ` would be a mapping there and a description here.
    const s = { ...skill(STANDARD), description: 'Warning: do "this", not that' };
    expect(serializeSkill(s)).toContain('description: "Warning: do \\"this\\", not that"');
    expect(skill(serializeSkill(s)).description).toBe('Warning: do "this", not that');
  });

  it('writes the provenance marker only when asked', () => {
    expect(serializeSkill(skill(STANDARD))).not.toContain('engram-managed');
    const managed = serializeSkill(skill(STANDARD), { managed: '0.14.0' });
    expect(managedBy(managed)).toBe('0.14.0');
    expect(managedBy(serializeSkill(skill(STANDARD)))).toBeNull();
  });

  it('renames to the invocation name when the host needs a prefix', () => {
    const out = serializeSkill(skill(STANDARD), { name: 'engram-mine' });
    expect(out).toContain('name: engram-mine');
    expect(skill(out).name).toBe('engram-mine');
  });

  it('says where the source is instead of only saying do not edit', () => {
    const out = serializeSkill(skill(STANDARD), { source: 'engram/skills/mine/SKILL.md' });
    expect(out).toContain('engram/skills/mine/SKILL.md');
    expect(out).toMatch(/lost on the next reindex/);
  });
});

describe('the three source layouts', () => {
  it('classifies each one', () => {
    expect(isDirectorySkill('/engram/skills/a/SKILL.md')).toBe(true);
    expect(isFlatSkill('/engram/skills/a.md')).toBe(true);
    expect(isFlatSkill('/.engram/skills/a.md')).toBe(true);
    expect(isFlatSkill('/engram/skills/a/SKILL.md')).toBe(false);
    expect(isDirectorySkill('/engram/skills/a.md')).toBe(false);
    expect(isFlatSkill('/engram/guardrails.md')).toBe(false);
  });

  it('discovers all three, with the directory form winning a tie', () => {
    const files = memoryFileStore({
      '/.engram/skills/a.md': STANDARD.replace('name: mine', 'name: a').replace('Body.', 'legacy'),
      '/engram/skills/b.md': STANDARD.replace('name: mine', 'name: b'),
      '/engram/skills/a/SKILL.md': STANDARD.replace('name: mine', 'name: a').replace(
        'Body.',
        'directory',
      ),
      '/engram/skills/c/SKILL.md': STANDARD.replace('name: mine', 'name: c'),
    });
    return discoverSkills(files, {}).then(({ skills }) => {
      expect(skills.map((s) => s.name)).toEqual(['a', 'b', 'c']);
      expect(skills.find((s) => s.name === 'a')!.body.trim()).toBe('directory');
    });
  });
});

describe('upgrading a flat skill', () => {
  it('moves it into the directory layout', async () => {
    const files = memoryFileStore({
      '/.engram/config.json': '{"structure":"default","createdWith":"0.12.0"}',
      '/engram/skills/mine.md': STANDARD,
    });
    const plan = await planUpgrade(files);
    expect(plan.moves.map((m) => m.to)).toContain('/engram/skills/mine/SKILL.md');
    await applyUpgrade(files, plan);
    expect(await files.read('/engram/skills/mine/SKILL.md')).toContain('name: mine');
  });

  it('uses the declared name, not the filename', async () => {
    // The standard requires `name` to match the parent directory, so a file called
    // `notes.md` declaring `name: mine` must land in `mine/`, or the moved skill is
    // invalid rather than merely oddly placed.
    const files = memoryFileStore({
      '/.engram/config.json': '{"structure":"default","createdWith":"0.12.0"}',
      '/engram/skills/notes.md': STANDARD,
    });
    const plan = await planUpgrade(files);
    expect(plan.moves.map((m) => m.to)).toContain('/engram/skills/mine/SKILL.md');
  });

  it('leaves a skill already in the directory layout alone', async () => {
    const files = memoryFileStore({
      '/.engram/config.json': '{"structure":"default","createdWith":"0.14.0"}',
      '/engram/skills/mine/SKILL.md': STANDARD,
    });
    expect((await planUpgrade(files)).moves).toEqual([]);
  });
});
