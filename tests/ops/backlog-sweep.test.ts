/**
 * BUG-012, BUG-013 and ENH-002 — three small defects that had each survived because
 * nothing exercised the path they lived on.
 */

import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { main } from '../../src/cli.js';
import { link } from '../../src/ops/link.js';
import { doctor } from '../../src/ops/doctor.js';
import { memoryFileStore } from '../../src/substrate/fs.js';

const clock = { now: () => '2026-01-01T00:00:00.000Z' };
const detector = { has: async () => false };
const note = (id: string, body = 'x', fm = '') =>
  `---\nokf_version: 0.2\nid: ${id}\nauthor: me\ntimestamp: 2026-01-01T00:00:00.000Z\n${fm}---\n\n${body}\n`;

describe('BUG-012 — --help must not hang on the stdin-reading commands', () => {
  // A generous timeout rather than none: if this regresses the command blocks on
  // stdin forever, and a hanging suite is a worse signal than a failing one.
  it.each([
    ['format', '--help'],
    ['format', '-h'],
    ['capture', '--help'],
    ['capture', '-h'],
  ])('engram %s %s returns instead of reading stdin', { timeout: 5000 }, async (cmd, flag) => {
    expect(await main([cmd, flag])).toBe(0);
  });

  it('does not treat a positional word "help" as content-eating flag', async () => {
    // `engram capture "help me remember this"` must capture, not print usage — which
    // is why the check matches only the flag forms and not the `help` command word.
    const dir = mkdtempSync(join(tmpdir(), 'engram-help-'));
    expect(await main(['init', '--vault', dir])).toBe(0);
    expect(await main(['capture', 'help me remember this', '--vault', dir])).toBe(0);
    const raw = join(dir, 'raw');
    const captured = readdirSync(raw).map((f) => readFileSync(join(raw, f), 'utf8'));
    expect(captured.join('\n')).toContain('help me remember this');
  });
});

describe('BUG-013 — link must not append an edge that already exists', () => {
  const vault = () => memoryFileStore({ '/a.md': note('a', 'x', 'part-of: [b]\n') });

  it('adds nothing the second time', async () => {
    const files = vault();
    await link('/a.md', 'b', 'part-of', { files, clock, by: 'me' });
    expect((await files.read('/a.md'))!).toContain('part-of: [b]');
    expect((await files.read('/a.md'))!).not.toContain('[b, b]');
  });

  it('says the edge already exists rather than failing silently', async () => {
    // An agent calling this cannot see the file, so "already linked" is information
    // it needs — a silent no-op reads as success and teaches it nothing.
    const r = await link('/a.md', 'b', 'part-of', { files: vault(), clock, by: 'me' });
    expect(r.outcome).toBe('applied');
    expect(r.outcome === 'applied' && r.warnings.join(' ')).toContain('already exists');
  });

  it('still adds a genuinely new edge', async () => {
    const files = vault();
    await link('/a.md', 'c', 'part-of', { files, clock, by: 'me' });
    expect((await files.read('/a.md'))!).toContain('part-of: [b, c]');
  });

  it('treats a different relation kind to the same target as new', async () => {
    const files = vault();
    await link('/a.md', 'b', 'sources', { files, clock, by: 'me' });
    const out = (await files.read('/a.md'))!;
    expect(out).toContain('part-of: [b]');
    expect(out).toContain('sources: [b]');
  });
});

describe('ENH-002 — doctor reports links that resolve to nothing', () => {
  const run = (files: Record<string, string>) => doctor(memoryFileStore(files), detector);

  it('flags a link to a file that is not there', async () => {
    const r = await run({ '/a.md': note('a', 'See [gone](missing.md).') });
    expect(r.warnings.join('\n')).toContain('[link-unresolved]');
    expect(r.warnings.join('\n')).toContain('missing.md');
  });

  it('says nothing about a link that resolves', async () => {
    const r = await run({ '/a.md': note('a', 'See [b](b.md).'), '/b.md': note('b') });
    expect(r.warnings.join('\n')).not.toContain('[link-unresolved]');
  });

  it('ignores external URLs', async () => {
    const r = await run({ '/a.md': note('a', 'See [web](https://example.com/x).') });
    expect(r.warnings.join('\n')).not.toContain('[link-unresolved]');
  });

  it('ignores pure anchors', async () => {
    const r = await run({ '/a.md': note('a', 'See [top](#heading).') });
    expect(r.warnings.join('\n')).not.toContain('[link-unresolved]');
  });

  it('reports rather than repairs — ADR-0028 gives link rewriting to Obsidian', async () => {
    const files = memoryFileStore({ '/a.md': note('a', 'See [gone](missing.md).') });
    const before = await files.read('/a.md');
    await doctor(files, detector);
    expect(await files.read('/a.md')).toBe(before);
  });
});
