import { describe, expect, it } from 'vitest';
import { guardrailNames, type GuardrailConfig } from '../../src/policy/guardrails.js';
import { BUILT_IN_SKILLS, configFor, discoverSkills, parseSkill } from '../../src/policy/skills.js';
import { OPERATIONS } from '../../src/policy/skill-schema.js';
import { memoryFileStore } from '../../src/substrate/index.js';

const skill = (frontmatter: string[], body = '# Steps\n\n1. Do the thing.') =>
  ['---', ...frontmatter, '---', '', body].join('\n');

const valid = skill(['name: my-skill', 'description: Does a thing.', 'uses: [capture, format]']);

describe('a skill declaring an operation engram does not have is rejected', () => {
  /**
   * The check that makes §6's guarantee real. "A skill can only sequence the seven
   * operations and can never add an eighth" is only true if a skill that tries is
   * refused — otherwise it is a sentence in a document.
   */
  it('rejects it, naming the offending operation', () => {
    const r = parseSkill(
      skill(['name: bad', 'description: x', 'uses: [capture, rm -rf]']),
      'vault',
    );
    expect('error' in r).toBe(true);
    if ('error' in r) {
      expect(r.error.reason).toContain('rm -rf');
      expect(r.error.reason).toContain('unknown operation');
    }
  });

  it('lists what engram actually has, so the fix is obvious', () => {
    const r = parseSkill(skill(['name: bad', 'description: x', 'uses: [recall]']), 'vault');
    if ('error' in r) {
      for (const op of OPERATIONS) expect(r.error.reason).toContain(op);
    }
  });

  it('accepts every real operation', () => {
    const r = parseSkill(
      skill(['name: ok', 'description: x', `uses: [${OPERATIONS.join(', ')}]`]),
      'vault',
    );
    expect('skill' in r).toBe(true);
  });
});

describe('a malformed skill fails loudly, never silently', () => {
  it.each([
    ['no frontmatter', '# Just a heading'],
    ['no name', skill(['description: x', 'uses: [capture]'])],
    ['no description', skill(['name: x', 'uses: [capture]'])],
    ['no uses', skill(['name: x', 'description: y'])],
    ['empty uses', skill(['name: x', 'description: y', 'uses: []'])],
    ['unparseable yaml', '---\nname: [unclosed\n---\nbody'],
  ])('rejects %s', (_label, raw) => {
    expect('error' in parseSkill(raw, 'vault')).toBe(true);
  });

  it('a rejected skill says why', () => {
    const r = parseSkill(skill(['name: x', 'description: y']), 'vault');
    if ('error' in r) expect(r.error.reason).toMatch(/uses/);
  });
});

describe('discovery: built-ins plus vault-local, vault wins', () => {
  it('finds the built-ins', async () => {
    const { skills, errors } = await discoverSkills(memoryFileStore());
    expect(errors).toEqual([]);
    expect(skills.map((s) => s.name)).toContain('connect-the-dots');
    expect(skills.every((s) => s.origin === 'built-in')).toBe(true);
  });

  it('every shipped built-in is itself valid', async () => {
    // A built-in that does not parse would be engram shipping a broken example.
    for (const raw of Object.values(BUILT_IN_SKILLS)) {
      expect('skill' in parseSkill(raw, 'built-in')).toBe(true);
    }
  });

  it('finds vault-local skills', async () => {
    const files = memoryFileStore({ '/.engram/skills/mine.md': valid });
    const { skills } = await discoverSkills(files);
    expect(skills.find((s) => s.name === 'my-skill')?.origin).toBe('vault');
  });

  it('vault-local overrides a built-in of the same name', async () => {
    const override = skill([
      'name: connect-the-dots',
      'description: My own version.',
      'uses: [format]',
    ]);
    const { skills } = await discoverSkills(memoryFileStore({ '/.engram/skills/c.md': override }));
    const found = skills.filter((s) => s.name === 'connect-the-dots');
    expect(found).toHaveLength(1);
    expect(found[0]!.origin).toBe('vault');
    expect(found[0]!.description).toBe('My own version.');
  });

  it('reports a broken vault skill with its path, and keeps the others', async () => {
    const files = memoryFileStore({
      '/.engram/skills/good.md': valid,
      '/.engram/skills/broken.md': '# no frontmatter',
    });
    const { skills, errors } = await discoverSkills(files);
    expect(skills.map((s) => s.name)).toContain('my-skill');
    expect(errors[0]!.reason).toContain('/.engram/skills/broken.md');
  });

  it('ignores files outside the skills directory', async () => {
    const { skills } = await discoverSkills(memoryFileStore({ '/notes/mine.md': valid }));
    expect(skills.map((s) => s.name)).not.toContain('my-skill');
  });

  it('returns skills sorted, so listings are deterministic', async () => {
    const { skills } = await discoverSkills(memoryFileStore());
    expect(skills.map((s) => s.name)).toEqual([...skills.map((s) => s.name)].sort());
  });
});

/**
 * Phase 10 built `tighten()` before skills existed, precisely for this. A
 * constraint added after the thing it constrains is not a constraint.
 */
describe('a skill may tighten guardrails, never loosen them', () => {
  const base: GuardrailConfig = {
    enabled: ['path-scope'],
    pathScope: ['/concepts/', '/decisions/'],
    rateLimit: 20,
  };

  it('adding a rule tightens', () => {
    const s = parseSkill(
      skill(['name: s', 'description: d', 'uses: [format]', 'guardrails: [require-sources]']),
      'vault',
    );
    if ('skill' in s) {
      expect(configFor(base, s.skill).enabled).toContain('require-sources');
      expect(configFor(base, s.skill).enabled).toContain('path-scope');
    }
  });

  it('cannot remove a rule the vault has in force', () => {
    const s = parseSkill(
      skill(['name: s', 'description: d', 'uses: [format]', 'guardrails: []']),
      'vault',
    );
    if ('skill' in s) expect(configFor(base, s.skill).enabled).toContain('path-scope');
  });

  it('cannot widen the path scope — the downloaded-skill case', () => {
    const s = parseSkill(
      skill(['name: greedy', 'description: d', 'uses: [format]', 'guardrails: { pathScope: [/] }']),
      'vault',
    );
    if ('skill' in s) expect(configFor(base, s.skill).pathScope).not.toContain('/');
  });

  it('cannot raise the rate limit', () => {
    const s = parseSkill(
      skill([
        'name: greedy',
        'description: d',
        'uses: [format]',
        'guardrails: { rateLimit: 9999 }',
      ]),
      'vault',
    );
    if ('skill' in s) expect(configFor(base, s.skill).rateLimit).toBe(20);
  });

  it('a skill declaring no guardrails inherits the vault config unchanged', () => {
    const s = parseSkill(valid, 'vault');
    if ('skill' in s) expect(configFor(base, s.skill)).toEqual(base);
  });

  it('every guardrail a built-in names actually exists', () => {
    for (const raw of Object.values(BUILT_IN_SKILLS)) {
      const r = parseSkill(raw, 'built-in');
      if ('skill' in r && r.skill.guardrails?.enabled !== undefined) {
        for (const name of r.skill.guardrails.enabled) {
          expect(guardrailNames()).toContain(name);
        }
      }
    }
  });
});

describe('both guardrail declaration forms parse (the shorthand is §6 own example)', () => {
  it('the list form enables those rules', () => {
    const s = parseSkill(
      skill(['name: s', 'description: d', 'uses: [format]', 'guardrails: [require-sources]']),
      'vault',
    );
    if ('skill' in s) expect(s.skill.guardrails?.enabled).toEqual(['require-sources']);
  });

  it('the map form carries scopes and limits', () => {
    const s = parseSkill(
      skill(['name: s', 'description: d', 'uses: [format]', 'guardrails: { rateLimit: 3 }']),
      'vault',
    );
    if ('skill' in s) expect(s.skill.guardrails?.rateLimit).toBe(3);
  });

  it('a skill declaring rules is NEVER parsed as declaring none', () => {
    // The failure this guards: silent loosening. A skill that asks to be
    // constrained and is read as unconstrained is worse than one that fails.
    const s = parseSkill(
      skill(['name: s', 'description: d', 'uses: [format]', 'guardrails: [require-sources]']),
      'vault',
    );
    if ('skill' in s) {
      expect(configFor({ enabled: [] }, s.skill).enabled).toContain('require-sources');
    }
  });
});
