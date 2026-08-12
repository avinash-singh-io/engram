import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Rule 11 enforcement for the `gate1-v1` locked evaluator.
 *
 * The manifest is checked in. Any edit, deletion, or unlisted addition inside
 * `gate1-v1/` fails this test. Regenerating the manifest is deliberate and shows
 * up in the diff — the enforcement is review, not cryptography.
 *
 * Regenerate ONLY when adding a stage-2 artifact per ADR-0037 §6:
 *   node tools/gate1/freeze.js
 */
function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readManifest(dir: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const line of readFileSync(join(dir, 'MANIFEST.sha256'), 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const [hash, ...nameParts] = trimmed.split(/\s+/);
    entries.set(nameParts.join(' '), hash);
  }
  return entries;
}

/**
 * Every locked evaluator, every version. A superseded evaluator is still the record
 * of what was actually run, so it stays frozen rather than being deleted.
 */
const VERSIONS = readdirSync(__dirname)
  .filter((name) => /^gate\d+-v\d+$/.test(name))
  .sort();

describe('gate evaluators are frozen (Rule 11)', () => {
  it('finds at least one locked version', () => {
    expect(VERSIONS.length).toBeGreaterThan(0);
  });

  describe.each(VERSIONS)('%s', (version) => {
    const dir = join(__dirname, version);
    const manifest = readManifest(dir);
    const onDisk = readdirSync(dir)
      .filter((name) => name !== 'MANIFEST.sha256')
      .sort();

    it('manifest is non-empty', () => {
      expect(manifest.size).toBeGreaterThan(0);
    });

    it('no locked file has been added or removed', () => {
      expect(onDisk).toEqual([...manifest.keys()].sort());
    });

    it.each([...manifest.entries()])('%s is unmodified', (name, expected) => {
      expect(sha256(join(dir, name))).toBe(expected);
    });
  });
});

describe('gate1: the rubric is identical across versions', () => {
  it('v2 bumped the protocol only — no classification result can change', () => {
    const gate1 = VERSIONS.filter((v) => v.startsWith('gate1-'));
    const hashes = gate1.map((v) => sha256(join(__dirname, v, 'rubric.md')));
    expect(new Set(hashes).size).toBe(1);
  });
});

describe('every locked evaluator carries both a rubric and a protocol', () => {
  it.each(VERSIONS)('%s', (version) => {
    const files = readdirSync(join(__dirname, version));
    expect(files).toContain('rubric.md');
    expect(files).toContain('protocol.md');
  });
});
