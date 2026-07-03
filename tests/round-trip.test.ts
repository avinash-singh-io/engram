import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runDoctor } from '../src/commands/doctor';
import { parseFrontmatter, serializeConcept, validateConcept } from '../src/format';
import { reindex } from '../src/indexer/reindex';

// The locked v1 fixtures corpus is not touched — the round-trip source lives in
// a separate tests/fixtures/sync/ path (Rule 11).
const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(here, 'fixtures', 'sync', 'mac-note.md');
const REL = 'sync/round-trip-fidelity.md';

let tmp: string;
const dirs: string[] = [];

function tempDir(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(d);
  return d;
}

function git(cwd: string, ...args: string[]): void {
  // core.autocrlf=false so git never rewrites line endings under us — the point
  // of the test is that the transport is byte-transparent.
  execFileSync('git', ['-c', 'core.autocrlf=false', ...args], { cwd, stdio: 'pipe' });
}

function writeConcept(root: string, rel: string, content: string): void {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

/** Build a small, index-fresh, committed vault on the "Mac" side. */
function makeMacVault(content: string): string {
  const root = tempDir('engram-rt-mac-');
  writeFileSync(join(root, 'AGENTS.md'), '# Agents\n');
  writeConcept(root, REL, content);
  reindex(root); // generate index.md files so the far side is fresh
  git(root, 'init', '--quiet');
  git(root, 'config', 'user.email', 'test@engram.local');
  git(root, 'config', 'user.name', 'Engram Test');
  git(root, 'add', '-A');
  git(root, 'commit', '--quiet', '-m', 'concept');
  return root;
}

beforeEach(() => {
  tmp = tempDir('engram-rt-');
});

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('round-trip format fidelity', () => {
  it('survives a git-clone transport byte-faithfully and stays OKF-valid', () => {
    const source = readFileSync(FIXTURE); // Buffer — assert on exact bytes
    const mac = makeMacVault(source.toString('utf8'));

    const device = join(tmp, 'device');
    git(tmp, 'clone', '--quiet', '-c', 'core.autocrlf=false', mac, device);

    const farBytes = readFileSync(join(device, REL));
    expect(farBytes.equals(source)).toBe(true); // byte-for-byte
    expect(validateConcept(farBytes.toString('utf8'), REL).ok).toBe(true);

    // The cloned vault is a clean checkout — doctor must be green end-to-end.
    const report = runDoctor(device);
    expect(report.ok).toBe(true);
    expect(report.gitPresent).toBe(true);
  });

  it('survives an S3 object-copy transport byte-faithfully and stays OKF-valid', () => {
    const source = readFileSync(FIXTURE);
    // Simulate an S3 put/get: the object bytes are copied verbatim.
    const far = join(tmp, 'device-note.md');
    writeFileSync(far, source);
    const farBytes = readFileSync(far);
    expect(farBytes.equals(source)).toBe(true);
    expect(validateConcept(farBytes.toString('utf8'), REL).ok).toBe(true);
  });

  it('round-trips a format-core-authored concept byte-stably', () => {
    const built = serializeConcept(
      {
        type: 'Concept',
        title: 'Effectively Once',
        description: 'At-least-once delivery plus idempotent operations yields effectively-once.',
        tags: ['distributed-systems', 'reliability'],
        timestamp: '2026-07-03T00:00:00Z',
      },
      '# Model\n\nRetries are safe when operations are idempotent.',
    );
    const mac = makeMacVault(built);
    const device = join(tmp, 'device2');
    git(tmp, 'clone', '--quiet', '-c', 'core.autocrlf=false', mac, device);
    const far = readFileSync(join(device, REL), 'utf8');
    expect(far).toBe(built); // byte-stable
    expect(validateConcept(far, REL).ok).toBe(true);
  });

  it('stays OKF-valid through adversarial CRLF / BOM / unicode-NFD mangling', () => {
    const base = readFileSync(FIXTURE, 'utf8');
    const variants: Record<string, string> = {
      crlf: base.replace(/\n/g, '\r\n'),
      bom: `\uFEFF${base}`,
      bomCrlf: `\uFEFF${base.replace(/\n/g, '\r\n')}`,
      nfd: base.normalize('NFD'),
    };
    for (const [label, mangled] of Object.entries(variants)) {
      // Transport preserves the (already-mangled) bytes exactly.
      const far = join(tmp, `${label}.md`);
      writeFileSync(far, mangled);
      const round = readFileSync(far, 'utf8');
      expect(round).toBe(mangled);
      const result = validateConcept(round, REL);
      expect(result.ok, `${label} should stay OKF-valid`).toBe(true);
      // Frontmatter parses to the same fields despite the mangling.
      const fm = parseFrontmatter(round).frontmatter;
      expect(fm?.title).toBe('Round-Trip Fidelity');
    }
  });
});
