/**
 * Rendering skills into agent directories — and, more importantly, what engram
 * refuses to touch while doing it.
 */

import { describe, expect, it } from 'vitest';
import { reindex } from '../../src/ops/reindex.js';
import { init } from '../../src/ops/init.js';
import { managedBy, serializeSkill, parseSkill } from '../../src/policy/skills.js';
import {
  pluginManifest,
  renderSkills,
  skillIgnoreLines,
  spliceIgnore,
} from '../../src/surface/render-skills.js';
import { isSkillPath } from '../../src/surface/adapters.js';
import { fixedClock, memoryFileStore } from '../../src/substrate/index.js';

const clock = fixedClock('2026-08-23T09:00:00.000Z');

const PLUGIN = '/.claude/skills/engram';
const MANIFEST = `${PLUGIN}/.claude-plugin/plugin.json`;

const userSkill = (name: string) =>
  [
    '---',
    `name: ${name}`,
    'description: A skill the user wrote. Use when testing.',
    'metadata:',
    '  engram-uses: format',
    '---',
    '',
    'Mine.',
  ].join('\n');

const vault = async (extra: Record<string, string> = {}) => {
  const files = memoryFileStore();
  await init(files, clock);
  for (const [p, c] of Object.entries(extra)) await files.write(p, c);
  await reindex(files, clock);
  return files;
};

describe('the plugin', () => {
  it('writes a manifest the official validator accepts', async () => {
    const files = await vault();
    const manifest = JSON.parse((await files.read(MANIFEST))!) as Record<string, unknown>;
    // `claude plugin validate` passes on name alone but warns about all three of
    // these. Engram emits them, and `version` is its own so a rendered plugin says
    // which engram wrote it.
    expect(manifest.name).toBe('engram');
    expect(manifest.description).toBeTypeOf('string');
    expect(manifest.version).toBeTypeOf('string');
    expect(manifest.author).toBeDefined();
  });

  it('puts skills at the plugin root, never inside .claude-plugin/', async () => {
    // The documented common mistake. `.claude-plugin/` holds plugin.json and
    // nothing else; everything else lives at the plugin root.
    const files = await vault();
    expect(await files.exists(`${PLUGIN}/skills/format/SKILL.md`)).toBe(true);
    const inManifestDir = (await files.list()).filter((p) =>
      p.startsWith(`${PLUGIN}/.claude-plugin/`),
    );
    expect(inManifestDir).toEqual([MANIFEST]);
  });

  it('renders every operation there, so /engram:format works with no MCP', async () => {
    const files = await vault();
    for (const op of ['init', 'capture', 'format', 'link', 'reindex', 'doctor']) {
      expect(await files.exists(`${PLUGIN}/skills/${op}/SKILL.md`), op).toBe(true);
    }
  });
});

describe('the namespace is the differentiator', () => {
  it("leaves a skill you wrote unprefixed, beside engram's plugin", async () => {
    const files = await vault({ '/engram/skills/mine/SKILL.md': userSkill('mine') });
    // `/mine`, not `/engram:mine`. You chose the name; it is yours.
    expect(await files.exists('/.claude/skills/mine/SKILL.md')).toBe(true);
    expect(await files.exists(`${PLUGIN}/skills/mine/SKILL.md`)).toBe(false);
  });

  it("prefixes engram's own where the host has no plugin concept", async () => {
    const files = await vault();
    expect(await files.exists('/.gemini/skills/engram-format/SKILL.md')).toBe(true);
    // The standard requires `name` to match the directory, so the prefix must be in
    // both or the rendered skill is invalid rather than merely oddly named.
    const raw = (await files.read('/.gemini/skills/engram-format/SKILL.md'))!;
    expect(parseSkill(raw, 'built-in')).toHaveProperty('skill.name', 'engram-format');
  });

  it('leaves your skills unprefixed there too', async () => {
    const files = await vault({ '/engram/skills/mine/SKILL.md': userSkill('mine') });
    expect(await files.exists('/.gemini/skills/mine/SKILL.md')).toBe(true);
    expect(await files.exists('/.antigravity/skills/mine/SKILL.md')).toBe(true);
  });
});

describe('overriding a built-in removes it rather than shadowing it', () => {
  it("renders your version, and stops rendering engram's", async () => {
    const files = memoryFileStore();
    await files.write('/engram/skills/connect-the-dots/SKILL.md', userSkill('connect-the-dots'));
    await init(files, clock);

    expect(await files.exists('/.claude/skills/connect-the-dots/SKILL.md')).toBe(true);
    expect((await files.read('/.claude/skills/connect-the-dots/SKILL.md'))!).toContain('Mine.');
    // /engram:connect-the-dots is never written. One skill of that name, not two
    // for a human to disambiguate.
    expect(await files.exists(`${PLUGIN}/skills/connect-the-dots/SKILL.md`)).toBe(false);
  });

  it('reports a copy already rendered before you overrode it', async () => {
    // Overriding AFTER engram has already rendered the built-in leaves that copy on
    // disk, so `/engram:connect-the-dots` keeps working until it is removed. Engram
    // will not delete it — the FileStore port has four methods and removal is
    // deliberately not one of them. So it is named, with the command, exactly as
    // `upgrade` names what it left behind.
    const files = await vault();
    expect(await files.exists(`${PLUGIN}/skills/connect-the-dots/SKILL.md`)).toBe(true);

    await files.write('/engram/skills/connect-the-dots/SKILL.md', userSkill('connect-the-dots'));
    const { skills } = await reindex(files, clock);

    expect(skills.stale).toContain(`${PLUGIN}/skills/connect-the-dots/SKILL.md`);
    expect(await files.read('/.claude/skills/connect-the-dots/SKILL.md')).toContain('Mine.');
  });
});

describe('the provenance marker decides what engram may overwrite', () => {
  it('never touches a file it did not write, and says so', async () => {
    const files = memoryFileStore();
    await init(files, clock);
    const theirs = '---\nname: format\ndescription: Someone else wrote this.\n---\n\nTheirs.\n';
    await files.write(`${PLUGIN}/skills/format/SKILL.md`, theirs);

    const { skills } = await reindex(files, clock);
    expect(await files.read(`${PLUGIN}/skills/format/SKILL.md`)).toBe(theirs);
    expect(skills.skipped.map((s) => s.path)).toContain(`${PLUGIN}/skills/format/SKILL.md`);
  });

  it('regenerates one that carries the marker', async () => {
    const files = await vault();
    const path = `${PLUGIN}/skills/format/SKILL.md`;
    await files.write(path, `${(await files.read(path))!}\n\nEDITED BY HAND\n`);
    await reindex(files, clock);
    // No lock, and none is wanted: the protection is that the edit is taken back.
    expect(await files.read(path)).not.toContain('EDITED BY HAND');
  });

  it('stops managing a file once you delete the marker — no flag needed', async () => {
    const files = await vault();
    const path = `${PLUGIN}/skills/format/SKILL.md`;
    const mine = (await files.read(path))!.replace(/^\s*engram-managed:.*$/m, '  mine: yes');
    await files.write(path, mine);
    expect(managedBy(mine)).toBeNull();

    await reindex(files, clock);
    expect(await files.read(path)).toBe(mine);
  });

  it('reports an orphaned render instead of deleting it', async () => {
    // The FileStore port has four methods and removal is deliberately not one of
    // them — the same instinct as the no-delete guardrail. So engram reports.
    const files = await vault();
    await files.write(
      `${PLUGIN}/skills/gone/SKILL.md`,
      serializeSkill(
        { name: 'gone', description: 'x', uses: ['format'], body: 'b', origin: 'built-in' },
        { managed: '0.14.0' },
      ),
    );
    const { skills } = await reindex(files, clock);
    expect(skills.stale).toContain(`${PLUGIN}/skills/gone/SKILL.md`);
    expect(await files.exists(`${PLUGIN}/skills/gone/SKILL.md`)).toBe(true);
  });
});

describe('a rendered skill is never mistaken for a note', () => {
  it('an empty vault still reports zero nodes, on both runs', async () => {
    // BUG-008's shape for the third time: GEMINI.md, then STRUCTURE.md the same
    // day, and a SKILL.md is indistinguishable from a note to a walker that only
    // checks the extension.
    const files = memoryFileStore();
    await init(files, clock);
    expect((await reindex(files, clock)).counts.nodes).toBe(0);
    expect((await reindex(files, clock)).counts.nodes).toBe(0);
  });

  it('and no rendered skill appears in the index', async () => {
    const files = await vault({ '/engram/skills/mine/SKILL.md': userSkill('mine') });
    const index = (await files.read('/index.md'))!;
    expect(index).not.toContain('SKILL.md');
    expect(index.toLowerCase()).not.toContain('engram:format');
  });

  it('reindex is byte-identical on a second run', async () => {
    const files = await vault({ '/engram/skills/mine/SKILL.md': userSkill('mine') });
    const before = await Promise.all(
      (await files.list()).sort().map(async (p) => [p, await files.read(p)] as const),
    );
    await reindex(files, clock);
    const after = await Promise.all(
      (await files.list()).sort().map(async (p) => [p, await files.read(p)] as const),
    );
    expect(after).toEqual(before);
  });
});

describe('the banner says what to do instead of only saying do not', () => {
  it('points a reader at the source file', async () => {
    const files = await vault({ '/engram/skills/mine/SKILL.md': userSkill('mine') });
    expect((await files.read('/.claude/skills/mine/SKILL.md'))!).toContain(
      'engram/skills/mine/SKILL.md',
    );
  });

  it("tells you how to replace one of engram's", async () => {
    const files = await vault();
    const raw = (await files.read(`${PLUGIN}/skills/format/SKILL.md`))!;
    expect(raw).toMatch(/create engram\/skills\/format\/SKILL\.md to replace it/);
  });
});

describe('the managed gitignore block', () => {
  it('ignores what engram renders and nothing else', async () => {
    const files = await vault({ '/engram/skills/mine/SKILL.md': userSkill('mine') });
    const ignore = (await files.read('/.gitignore'))!;
    expect(ignore).toContain('/.claude/skills/engram/');
    expect(ignore).toContain('/.claude/skills/mine/');
    // `.claude/` also holds settings and commands that are the user's. Ignoring the
    // whole directory would quietly stop those being committed.
    expect(ignore).not.toMatch(/^\/\.claude\/$/m);
    expect(ignore).not.toContain('/.claude/settings.json');
  });

  it('preserves lines outside the markers', () => {
    const mine = 'node_modules/\n.DS_Store\n';
    const out = spliceIgnore(mine, ['/.claude/skills/engram/']);
    expect(out).toContain('node_modules/');
    expect(out).toContain('.DS_Store');
    expect(out).toContain('/.claude/skills/engram/');
  });

  it('replaces the block rather than appending a second one', () => {
    const once = spliceIgnore('', ['/a/']);
    const twice = spliceIgnore(once, ['/b/']);
    expect(twice.match(/BEGIN engram/g)).toHaveLength(1);
    expect(twice).toContain('/b/');
    expect(twice).not.toContain('/a/');
  });

  it('lists a directory for every skill it renders', () => {
    const skills = [
      {
        name: 'format',
        description: 'd',
        uses: ['format' as const],
        body: 'b',
        origin: 'built-in' as const,
      },
      {
        name: 'mine',
        description: 'd',
        uses: ['format' as const],
        body: 'b',
        origin: 'vault' as const,
      },
    ];
    const lines = skillIgnoreLines(skills);
    expect(lines).toContain('/.claude/skills/engram/');
    expect(lines).toContain('/.claude/skills/mine/');
    expect(lines).toContain('/.gemini/skills/engram-format/');
    for (const l of lines) expect(isSkillPath(`${l}x/SKILL.md`)).toBe(true);
  });
});

describe('an agent with no verified directory gets nothing', () => {
  it('writes no skills for a descriptor without a target', async () => {
    // ADR-0044: engram will not write to a location it cannot verify is read.
    const files = memoryFileStore();
    const result = await renderSkills(
      files,
      [{ name: 'a', description: 'd', uses: ['format'], body: 'b', origin: 'built-in' }],
      [{ name: 'unverified', contractFile: '/UNVERIFIED.md', why: 'test' }],
    );
    expect(result.written).toEqual([]);
    expect(await files.list()).toEqual([]);
  });
});

describe('pluginManifest', () => {
  it('is valid JSON ending in a newline', () => {
    const raw = pluginManifest('engram', '9.9.9');
    expect(raw.endsWith('\n')).toBe(true);
    expect(JSON.parse(raw)).toMatchObject({ name: 'engram', version: '9.9.9' });
  });
});
