import { describe, expect, it } from 'vitest';
import { applyUpgrade, needsUpgrade, planUpgrade, versionSkew } from '../../src/ops/upgrade.js';
import { init } from '../../src/ops/init.js';
import { discoverSkills } from '../../src/policy/skills.js';
import { loadGuardrails, loadVaultConfig } from '../../src/policy/config.js';
import { isOlderSeries, series, VERSION } from '../../src/version.js';
import { fixedClock, memoryFileStore } from '../../src/substrate/index.js';

const clock = fixedClock('2026-08-23T09:00:00.000Z');

/** A vault as v0.11 would have written it: hidden authoring surface, no stamp. */
const legacyVault = () =>
  memoryFileStore({
    '/.engram/config.json': '{ "structure": "default" }',
    '/.engram/guardrails.md': [
      '---',
      'enabled: [no-delete]',
      'proposeOnly: [/decisions/]',
      '---',
    ].join('\n'),
    '/.engram/skills/mine.md': [
      '---',
      'name: mine',
      'description: Mine.',
      'uses: [format]',
      '---',
      '',
      '# Steps',
    ].join('\n'),
    '/inbox/old.md': '# an old raw note',
    '/concepts/raft.md':
      '---\nokf_version: 0.2\nid: raft\ntimestamp: 2026-01-01T00:00:00Z\n---\n# Raft',
  });

describe('version comparison', () => {
  it('compares by series, ignoring patch noise', () => {
    expect(isOlderSeries('0.11.0', '0.12.0')).toBe(true);
    expect(isOlderSeries('0.12.0', '0.12.9')).toBe(false);
    expect(isOlderSeries('0.12.0', '0.12.0')).toBe(false);
    expect(isOlderSeries('1.0.0', '0.12.0')).toBe(false);
    expect(series('0.12.1')).toBe('0.12');
  });

  it('never claims a malformed version is older', () => {
    expect(isOlderSeries('not-a-version', '0.12.0')).toBe(false);
  });
});

describe('planning an upgrade', () => {
  it('reads only — a plan changes nothing', async () => {
    const files = legacyVault();
    const before = (await files.list()).sort();
    await planUpgrade(files);
    expect((await files.list()).sort()).toEqual(before);
  });

  it('finds the authoring surface that should become visible', async () => {
    const plan = await planUpgrade(legacyVault());
    expect(plan.moves.map((m) => m.to)).toEqual([
      '/engram/guardrails.md',
      '/engram/skills/mine.md',
    ]);
  });

  /** These are the user's notes in a folder they chose. Engram does not move them. */
  it('reports inbox/ as yours to rename, and offers git mv to keep history', async () => {
    const plan = await planUpgrade(legacyVault());
    expect(plan.manual).toHaveLength(1);
    expect(plan.manual[0]!.command).toBe('git mv inbox raw');
    expect(plan.moves.some((m) => m.from.startsWith('/inbox/'))).toBe(false);
  });

  it('notices a vault that predates version stamping', async () => {
    const plan = await planUpgrade(legacyVault());
    expect(plan.createdWith).toBeNull();
    expect(plan.stampMissing).toBe(true);
  });

  it('has nothing to say about a vault this version created', async () => {
    const files = memoryFileStore();
    await init(files, clock);
    const plan = await planUpgrade(files);

    expect(plan.createdWith).toBe(VERSION);
    expect(needsUpgrade(plan)).toBe(false);
    expect(versionSkew(plan)).toBeNull();
  });

  it('does not move a file when the new location already holds one', async () => {
    const files = legacyVault();
    await files.write('/engram/guardrails.md', '---\nenabled: [rate-limit]\n---');
    const plan = await planUpgrade(files);
    expect(plan.moves.some((m) => m.to === '/engram/guardrails.md')).toBe(false);
  });
});

describe('applying an upgrade', () => {
  it('carries your guardrails across unchanged', async () => {
    const files = legacyVault();
    await applyUpgrade(files, await planUpgrade(files));

    const { config } = await loadGuardrails(files);
    expect(config.enabled).toEqual(['no-delete']);
    expect(config.proposeOnly).toEqual(['/decisions/']);
  });

  it('carries your skills across', async () => {
    const files = legacyVault();
    await applyUpgrade(files, await planUpgrade(files));
    expect(await files.read('/engram/skills/mine.md')).toContain('name: mine');

    const { skills } = await discoverSkills(files);
    expect(skills.map((s) => s.name)).toContain('mine');
  });

  /**
   * The `FileStore` port has four methods and removal is deliberately not one —
   * the same instinct as the `no-delete` guardrail. The CLI prints the exact
   * command instead, once you have seen the new files are right.
   */
  it('copies rather than deletes, and says what it left behind', async () => {
    const files = legacyVault();
    const result = await applyUpgrade(files, await planUpgrade(files));

    expect(result.leftBehind).toEqual(['/.engram/guardrails.md', '/.engram/skills/mine.md']);
    expect(await files.read('/.engram/guardrails.md')).not.toBeNull();
  });

  it('never touches your notes', async () => {
    const files = legacyVault();
    await applyUpgrade(files, await planUpgrade(files));

    expect(await files.read('/inbox/old.md')).toBe('# an old raw note');
    expect(await files.read('/concepts/raft.md')).toContain('id: raft');
  });

  it('records the version, so the next run knows what wrote this vault', async () => {
    const files = legacyVault();
    const result = await applyUpgrade(files, await planUpgrade(files));

    expect(result.stamped).toBe(true);
    expect((await loadVaultConfig(files)).createdWith).toBe(VERSION);
    // And the declared structure survives the rewrite.
    expect((await loadVaultConfig(files)).structure).toBe('default');
  });

  it('is safe to run twice', async () => {
    const files = legacyVault();
    await applyUpgrade(files, await planUpgrade(files));
    const second = await planUpgrade(files);

    expect(second.moves).toEqual([]);
    expect(second.stampMissing).toBe(false);
  });
});

describe('doctor tells you when a vault is behind', () => {
  it('says so when there is no stamp at all', async () => {
    const skew = versionSkew(await planUpgrade(legacyVault()));
    expect(skew).toMatch(/predates version stamping/);
    expect(skew).toMatch(/engram upgrade/);
  });

  it('reassures that notes are safe, because they carry their own format version', async () => {
    const files = memoryFileStore({
      '/.engram/config.json': '{"structure":"default","createdWith":"0.1.0"}',
    });
    const skew = versionSkew(await planUpgrade(files));
    expect(skew).toMatch(/Your notes are safe/);
    expect(skew).toContain('0.1.0');
  });
});
