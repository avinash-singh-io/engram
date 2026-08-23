import { describe, expect, it } from 'vitest';
import { init } from '../../src/ops/init.js';
import { reindex } from '../../src/ops/reindex.js';
import { getStructure, guideFor, STRUCTURES, structureIds } from '../../src/policy/structures.js';
import { generateAgentsMd } from '../../src/surface/agents-md.js';
import { DEFAULTS, loadGuardrails } from '../../src/policy/config.js';
import { discoverSkills } from '../../src/policy/skills.js';
import { fixedClock, memoryFileStore } from '../../src/substrate/index.js';

const clock = fixedClock('2026-08-22T09:00:00.000Z');

describe('the structures engram ships', () => {
  it('offers several philosophies plus custom, and prefers none', () => {
    expect(structureIds()).toEqual(['default', 'para', 'zettelkasten', 'custom']);
  });

  it('every structure has a guide, a label and a description of who it suits', () => {
    for (const s of STRUCTURES) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.suits.length).toBeGreaterThan(0);
      expect(s.preamble.join('').length).toBeGreaterThan(80);
    }
  });

  /**
   * The guide is built centrally so a newly added philosophy cannot ship one that
   * omits how relations work or where a formatted note belongs.
   */
  it('every guide explains the shared essentials, not just its own philosophy', () => {
    for (const s of STRUCTURES) {
      const g = guideFor(s);
      expect(g).toContain('## The path a note takes');
      expect(g).toContain('## Relations are what actually organise this');
      expect(g).toContain('## Growing without reorganising');
      expect(g).toContain('## When a folder gets crowded');
      // raw/ is in every vault, so it is in every guide's directory table.
      expect(g).toContain('`raw/`');
    }
  });

  it('names its own directories in its guide', () => {
    const para = getStructure('para')!;
    const g = guideFor(para);
    for (const c of para.containers) expect(g).toContain(`\`${c.name}/\``);
  });
});

describe('init honours the declared structure', () => {
  const created = async (structure: string) =>
    (await init(memoryFileStore(), clock, structure)).created;

  it("creates PARA's four buckets, because that is what choosing PARA means", async () => {
    const c = await created('para');
    for (const dir of ['1-projects', '2-areas', '3-resources', '4-archive']) {
      expect(c).toContain(`/${dir}/.gitkeep`);
    }
  });

  it('creates one flat folder for zettelkasten', async () => {
    const c = await created('zettelkasten');
    expect(c).toContain('/notes/.gitkeep');
    expect(c).not.toContain('/concepts/.gitkeep');
  });

  it("creates only raw/ for custom — the shape is the user's to declare", async () => {
    const c = await created('custom');
    expect(c).toContain('/raw/.gitkeep');
    expect(c.filter((p) => p.endsWith('/.gitkeep'))).toEqual(['/raw/.gitkeep']);
  });

  it('always creates raw/, whatever the structure', async () => {
    for (const id of structureIds()) expect(await created(id)).toContain('/raw/.gitkeep');
  });

  it('writes the guide and records the choice', async () => {
    const files = memoryFileStore();
    await init(files, clock, 'para');
    expect(await files.read('/STRUCTURE.md')).toContain('PARA');
    expect(await files.read('/.engram/config.json')).toContain('"structure": "para"');
  });

  it('rejects an unknown structure and lists what it ships', async () => {
    await expect(init(memoryFileStore(), clock, 'nonsense')).rejects.toThrow(/engram ships/);
  });

  it('never overwrites a guide the user has edited', async () => {
    const mine = '# My own convention\n\nEverything goes in one pile.';
    const files = memoryFileStore({ '/STRUCTURE.md': mine });
    await init(files, clock, 'para');
    expect(await files.read('/STRUCTURE.md')).toBe(mine);
  });
});

describe('AGENTS.md carries the filing convention', () => {
  it('names every container an agent should use', async () => {
    const md = generateAgentsMd(DEFAULTS, 'para');
    expect(md).toContain('## Where to file what');
    for (const c of getStructure('para')!.containers) expect(md).toContain(`\`${c.name}\``);
  });

  it('tells an agent in a custom vault to ask rather than invent a folder', () => {
    const md = generateAgentsMd(DEFAULTS, 'custom');
    expect(md).toMatch(/Do not invent a new top-level folder/);
  });

  it('says a new subfolder is fine, because a path is an address', () => {
    expect(generateAgentsMd(DEFAULTS, 'default')).toMatch(/A new subfolder is fine/);
  });

  it('renders the structure the vault declared, not a built-in default', async () => {
    const files = memoryFileStore();
    await init(files, clock, 'zettelkasten');
    expect(await files.read('/AGENTS.md')).toContain('Zettelkasten');
  });
});

/**
 * The invariant that catches a whole class of bug at once.
 *
 * `GEMINI.md` was indexed as a knowledge node and broke `reindex` idempotence
 * (BUG-008); adding `STRUCTURE.md` reproduced it within the hour. Both were the
 * same mistake — a generated vault file that nothing told the walker to ignore.
 * Rather than adding a literal each time, assert the property: **whatever engram
 * writes into an empty vault, that vault contains no knowledge.**
 */
describe('an empty vault has no knowledge in it, whatever engram wrote there', () => {
  it('reports zero nodes for every structure', async () => {
    for (const id of structureIds()) {
      const files = memoryFileStore();
      await init(files, clock, id);
      expect((await reindex(files, clock)).counts.nodes).toBe(0);
    }
  });

  it('and stays at zero on a second run — reindex never reads its own output', async () => {
    const files = memoryFileStore();
    await init(files, clock, 'para');
    await reindex(files, clock);
    expect((await reindex(files, clock)).counts.nodes).toBe(0);
  });
});

/**
 * BUG-009. `engram init --structure para` on an already-initialised vault did
 * nothing at all and said nothing about it: `config.json` existed, so it was
 * skipped as "exists, left alone", and the flag vanished. There was also no other
 * way to change a vault's structure short of hand-editing JSON.
 *
 * The cause was that `init` defaulted the parameter, making "no flag given"
 * indistinguishable from "asked for default".
 */
describe("changing a vault's structure after init", () => {
  const existing = () => memoryFileStore({ '/my-note.md': '# an existing note' });

  it('takes effect rather than being silently skipped', async () => {
    const files = existing();
    await init(files, clock);
    await init(files, clock, 'para');

    expect(await files.read('/.engram/config.json')).toContain('"structure": "para"');
  });

  it('re-renders the contract, so agents file the new way', async () => {
    const files = existing();
    await init(files, clock);
    await init(files, clock, 'para');

    const contract = (await files.read('/AGENTS.md'))!;
    expect(contract).toContain('PARA');
    expect(contract).toContain('1-projects');
  });

  it('says what changed and what it did not touch', async () => {
    const files = existing();
    await init(files, clock);
    const { notes } = await init(files, clock, 'para');

    expect(notes.join(' ')).toMatch(/structure changed: default → para/);
    expect(notes.join(' ')).toMatch(/Nothing on disk moved/);
  });

  it('leaves existing notes exactly where they are', async () => {
    const files = existing();
    await init(files, clock);
    await init(files, clock, 'para');

    expect(await files.read('/my-note.md')).toBe('# an existing note');
  });

  it("regenerates the guide when it is still engram's own words", async () => {
    const files = existing();
    await init(files, clock);
    await init(files, clock, 'zettelkasten');

    expect(await files.read('/STRUCTURE.md')).toContain('Zettelkasten');
  });

  /** Once you have edited it, it is yours — changing structure must not cost that. */
  it('never overwrites a guide the user has edited', async () => {
    const mine = '# My own convention\n\nEverything in one pile.';
    const files = existing();
    await init(files, clock);
    await files.write('/STRUCTURE.md', mine);

    const { notes } = await init(files, clock, 'para');
    expect(await files.read('/STRUCTURE.md')).toBe(mine);
    expect(notes.join(' ')).toMatch(/left alone because you have edited it/);
  });

  it('says so when the vault already uses what was asked for', async () => {
    const files = existing();
    await init(files, clock, 'para');
    const { notes } = await init(files, clock, 'para');

    expect(notes.join(' ')).toMatch(/already using the PARA structure/);
  });

  /** Re-running plain `init` must not silently reset a declared structure. */
  it('keeps the declared structure when no flag is given', async () => {
    const files = existing();
    await init(files, clock, 'zettelkasten');
    await init(files, clock);

    expect(await files.read('/.engram/config.json')).toContain('"structure": "zettelkasten"');
  });
});

/**
 * Choosing a structure and wanting its directories in a vault that already has
 * notes is a reasonable thing to want, and there was no way to say so.
 *
 * A flag rather than a prompt, deliberately: the same `init` runs over MCP where
 * there is no human on stdin, and a prompting `init` would hang an agent forever.
 */
describe('--scaffold: directories in a vault that already has notes', () => {
  const existing = () => memoryFileStore({ '/Daily Notes/2026-08-01.md': '# my note' });

  it('creates nothing by default — a vault with a shape keeps it', async () => {
    const { created } = await init(existing(), clock, 'para');
    expect(created.filter((p) => p.endsWith('/.gitkeep'))).toEqual([]);
  });

  it('names the flag rather than leaving you to guess', async () => {
    const { notes } = await init(existing(), clock, 'para');
    expect(notes.join(' ')).toMatch(/--scaffold/);
    expect(notes.join(' ')).toContain('1-projects/');
  });

  it('creates them when asked', async () => {
    const { created } = await init(existing(), clock, 'para', { scaffold: true });
    for (const dir of ['1-projects', '2-areas', '3-resources', '4-archive']) {
      expect(created).toContain(`/${dir}/.gitkeep`);
    }
  });

  it('creates raw/ too, so capture has somewhere to land', async () => {
    const { created } = await init(existing(), clock, 'para', { scaffold: true });
    expect(created).toContain('/raw/.gitkeep');
  });

  it('moves nothing — existing notes stay exactly where they are', async () => {
    const files = existing();
    await init(files, clock, 'para', { scaffold: true });
    expect(await files.read('/Daily Notes/2026-08-01.md')).toBe('# my note');
  });

  it('says the new folders are empty, so nothing looks migrated', async () => {
    const { notes } = await init(existing(), clock, 'para', { scaffold: true });
    expect(notes.join(' ')).toMatch(/Nothing was moved into them/);
  });

  it('is a no-op for custom, which declares no directories', async () => {
    const { created } = await init(existing(), clock, 'custom', { scaffold: true });
    expect(created.filter((p) => p.endsWith('/.gitkeep'))).toEqual(['/raw/.gitkeep']);
  });
});

/**
 * Obsidian refuses to show anything starting with a dot, and engram had put its
 * entire authoring surface behind that: you were told to edit `guardrails.md` and
 * write skills, in a folder your editor would not open.
 *
 * The split is by **who authors the file**, not by what it does. Engram's own two
 * skills stay inside engram — invocable, not editable, which is right for
 * something the tool provides. Yours are visible.
 */
describe('the files you author are visible; the files engram owns are not', () => {
  it('puts your skills and guardrails where Obsidian can open them', async () => {
    const files = memoryFileStore();
    await init(files, clock);

    for (const p of await files.list()) {
      if (p.includes('guardrails.md') || p.includes('/skills/')) {
        expect(p.startsWith('/engram/')).toBe(true);
      }
    }
  });

  it("keeps engram's own state hidden", async () => {
    const files = memoryFileStore();
    await init(files, clock);
    expect(await files.read('/.engram/config.json')).toContain('structure');
  });

  it('ships a worked example, so skills are discoverable at all', async () => {
    const files = memoryFileStore();
    await init(files, clock);

    const example = await files.read('/engram/skills/example-literature-review.md');
    expect(example).toContain('uses: [capture, format, link]');
    expect(example).toMatch(/edit it, rename it, or delete it/);
  });

  it('and that example is itself a valid skill', async () => {
    const files = memoryFileStore();
    await init(files, clock);

    const { skills, errors } = await discoverSkills(files);
    expect(errors).toEqual([]);
    expect(skills.map((s) => s.name)).toContain('example-literature-review');
  });

  /** The recurring bug: a generated file read back as knowledge. */
  it('never counts anything under engram/ as a note', async () => {
    const files = memoryFileStore();
    await init(files, clock);
    expect((await reindex(files, clock)).counts.nodes).toBe(0);
  });

  it('still reads a vault written by an earlier version', async () => {
    const files = memoryFileStore({
      '/.engram/guardrails.md': ['---', 'enabled: [no-delete]', '---', ''].join('\n'),
      '/.engram/skills/mine.md': [
        '---',
        'name: mine',
        'description: Older vault.',
        'uses: [format]',
        '---',
        '',
        '# Steps',
      ].join('\n'),
    });

    const { config } = await loadGuardrails(files);
    expect(config.enabled).toEqual(['no-delete']);

    const { skills } = await discoverSkills(files);
    expect(skills.map((s) => s.name)).toContain('mine');
  });
});
