import { describe, expect, it } from 'vitest';
import { init, STRUCTURES } from '../../src/ops/init.js';
import { reindex } from '../../src/ops/reindex.js';
import { fixedClock, memoryFileStore } from '../../src/substrate/index.js';

const AT = '2026-01-01T00:00:00.000Z';
const clock = fixedClock('2026-08-12T09:00:00.000Z');
const note = (id: string, extra: string[] = []) =>
  ['---', 'okf_version: 0.2', `id: ${id}`, `timestamp: ${AT}`, ...extra, '---', `# ${id}`].join(
    '\n',
  );

const snapshot = async (files: Awaited<ReturnType<typeof memoryFileStore>>) => {
  const paths = (await files.list()).sort();
  const contents = await Promise.all(paths.map((p) => files.read(p)));
  return Object.fromEntries(paths.map((p, i) => [p, contents[i]]));
};

describe('reindex is idempotent (ADR-0029)', () => {
  it('a second run changes nothing', async () => {
    const files = memoryFileStore({ '/a.md': note('a', ['part-of: [b]']), '/b.md': note('b') });
    await reindex(files, clock);
    const first = await snapshot(files);
    await reindex(files, clock);
    expect(await snapshot(files)).toEqual(first);
  });

  it('a run with a different clock still changes nothing', async () => {
    // The proof that no generated file embeds a generation timestamp.
    const files = memoryFileStore({ '/a.md': note('a') });
    await reindex(files, clock);
    const first = await snapshot(files);
    await reindex(files, fixedClock('2099-12-31T23:59:59.000Z'));
    expect(await snapshot(files)).toEqual(first);
  });
});

describe('derived state is safe to delete (ADR-0029)', () => {
  it('deleting every derived file and rebuilding restores it byte-identical', async () => {
    const files = memoryFileStore({
      '/a.md': note('a', ['part-of: [container]', 'supersedes: [old]']),
      '/b.md': note('b'),
      '/old.md': note('old'),
      '/container.md': note('container'),
    });
    const { written } = await reindex(files, clock);
    const before = await snapshot(files);

    // "Deleting derived state must always be safe." Simulate it.
    const survivors = memoryFileStore(
      Object.fromEntries(
        Object.entries(before)
          .filter(([p]) => !written.includes(p))
          .map(([p, c]) => [p, c as string]),
      ),
    );
    await reindex(survivors, clock);

    expect(await snapshot(survivors)).toEqual(before);
  });
});

describe('reindex reports what the walker found', () => {
  it('surfaces a skipped nested root rather than swallowing it', async () => {
    const files = memoryFileStore({
      '/a.md': note('a'),
      '/private/.engram/c.json': '{}',
      '/private/secret.md': note('secret'),
    });
    const { findings, counts } = await reindex(files, clock);
    expect(findings.map((f) => f.code)).toContain('nested-root-skipped');
    expect(counts.nodes).toBe(1);
    const index = (await files.read('/index.md'))!;
    expect(index).not.toContain('secret');
  });

  it('surfaces read warnings, e.g. a node with no slug', async () => {
    const files = memoryFileStore({
      '/x.md': ['---', 'okf_version: 0.2', `timestamp: ${AT}`, '---', 'b'].join('\n'),
    });
    const { warnings } = await reindex(files, clock);
    expect(warnings.join(' ')).toMatch(/path-as-identity/);
  });

  it('an empty vault reindexes without error', async () => {
    const { written, counts } = await reindex(memoryFileStore(), clock);
    expect(written).toHaveLength(4);
    expect(counts.nodes).toBe(0);
  });
});

describe('init', () => {
  it('scaffolds ADR-0023 reference tree and reindexes', async () => {
    const files = memoryFileStore();
    const { created, reindexed } = await init(files, clock);
    expect(created).toContain('/AGENTS.md');
    expect(created).toContain('/.engram/config.json');
    expect(created).toContain('/concepts/.gitkeep');
    expect(reindexed).toContain('/index.md');
  });

  it('gitignores derived state (ADR-0029)', async () => {
    const files = memoryFileStore();
    await init(files, clock);
    const gitignore = (await files.read('/.gitignore'))!;
    expect(gitignore).toContain('/views/');
    expect(gitignore).toContain('/index.md');
  });

  it('appends to an existing gitignore rather than clobbering it', async () => {
    const files = memoryFileStore({ '/.gitignore': 'node_modules/\n.env\n' });
    await init(files, clock);
    const gitignore = (await files.read('/.gitignore'))!;
    expect(gitignore).toContain('node_modules/');
    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('/views/');
  });

  it('is non-destructive — never overwrites an existing file', async () => {
    const mine = '# my own AGENTS.md, hands off';
    const files = memoryFileStore({ '/AGENTS.md': mine });
    const { created, skipped } = await init(files, clock);
    expect(skipped).toContain('/AGENTS.md');
    expect(created).not.toContain('/AGENTS.md');
    expect(await files.read('/AGENTS.md')).toBe(mine);
  });

  it('is safe to run twice', async () => {
    const files = memoryFileStore();
    await init(files, clock);
    const first = await snapshot(files);
    const second = await init(files, clock);
    expect(second.created).toEqual([]);
    expect(await snapshot(files)).toEqual(first);
  });

  it('rejects an unknown structure, and says what it ships', async () => {
    await expect(init(memoryFileStore(), clock, 'para')).rejects.toThrow(/engram ships only/);
  });

  it('ships exactly one structure — presets are opinions engram does not hold', () => {
    expect([...STRUCTURES]).toEqual(['default']);
  });

  it('produces a vault the walker does not treat the sidecar as nested', async () => {
    const files = memoryFileStore();
    await init(files, clock);
    const { findings } = await reindex(files, clock);
    expect(findings).toEqual([]);
  });
});
