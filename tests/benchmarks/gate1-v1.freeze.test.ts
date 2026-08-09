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
const LOCKED_DIR = join(__dirname, 'gate1-v1');
const MANIFEST = join(LOCKED_DIR, 'MANIFEST.sha256');

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readManifest(): Map<string, string> {
  const entries = new Map<string, string>();
  for (const line of readFileSync(MANIFEST, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const [hash, ...nameParts] = trimmed.split(/\s+/);
    entries.set(nameParts.join(' '), hash);
  }
  return entries;
}

describe('gate1-v1 evaluator is frozen (Rule 11)', () => {
  const manifest = readManifest();
  const onDisk = readdirSync(LOCKED_DIR)
    .filter((name) => name !== 'MANIFEST.sha256')
    .sort();

  it('manifest is non-empty', () => {
    expect(manifest.size).toBeGreaterThan(0);
  });

  it('no locked file has been added or removed', () => {
    expect(onDisk).toEqual([...manifest.keys()].sort());
  });

  it.each([...manifest.entries()])('%s is unmodified', (name, expected) => {
    expect(sha256(join(LOCKED_DIR, name))).toBe(expected);
  });
});
