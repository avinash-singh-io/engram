import { describe, expect, it } from 'vitest';
import { init } from '../../src/ops/init.js';
import { reindex } from '../../src/ops/reindex.js';
import { getStructure, guideFor, STRUCTURES, structureIds } from '../../src/policy/structures.js';
import { generateAgentsMd } from '../../src/surface/agents-md.js';
import { DEFAULTS } from '../../src/policy/config.js';
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
