import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateConcept } from '../src/format';
import { runInit } from '../src/commands/init';
import { runPromote } from '../src/commands/promote';
import { CliError } from '../src/commands/util';

const FIXTURES = join(import.meta.dirname, 'fixtures', 'promote', 'sources');

function newVault(): string {
  const dir = mkdtempSync(join(tmpdir(), 'engram-promote-'));
  runInit({ dir });
  return dir;
}

function stubStdout(): { output: () => string; restore: () => void } {
  let buf = '';
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    buf += String(chunk);
    return true;
  });
  return { output: () => buf, restore: () => spy.mockRestore() };
}

describe('engram promote (CLI)', () => {
  let out: ReturnType<typeof stubStdout>;
  beforeEach(() => {
    out = stubStdout();
  });
  afterEach(() => out.restore());

  it('promotes a momentum ADR into a valid, indexed, logged concept', () => {
    const root = newVault();
    const src = join(FIXTURES, 'adr-shared-engine.md');

    const res = runPromote(src, { cwd: root, to: 'references' });
    out.restore();

    expect(res.written).toBe(true);
    expect(res.targetPath).toBe('references/adr-shared-engine.md');

    const abs = join(root, res.targetPath);
    expect(existsSync(abs)).toBe(true);
    const text = readFileSync(abs, 'utf8');
    expect(validateConcept(text, res.targetPath).ok).toBe(true);
    expect(text).toContain('type: Reference');
    expect(text).toContain('# Source');
    // Linked: an absolute bundle-relative internal link exists in the body.
    expect(text).toMatch(/\]\(\/[^)]+\.md\)/);

    // Indexed as a bullet in the target directory index.
    const idx = readFileSync(join(root, 'references', 'index.md'), 'utf8');
    expect(idx).toContain('](/references/adr-shared-engine.md)');
    // Logged, newest-first.
    expect(readFileSync(join(root, 'log.md'), 'utf8')).toContain('**Promoted**');
  });

  it('promotes a momentum learning entry using a title-derived filename', () => {
    const root = newVault();
    const res = runPromote(join(FIXTURES, 'learning-entry.md'), { cwd: root });
    out.restore();
    expect(res.targetPath).toBe('references/lock-the-evaluator-before-the-optimization-loop.md');
    expect(existsSync(join(root, res.targetPath))).toBe(true);
  });

  it('--dry-run prints the concept + plan and writes nothing', () => {
    const root = newVault();
    const before = readdirSync(root);
    const res = runPromote(join(FIXTURES, 'adr-shared-engine.md'), { cwd: root, dryRun: true });
    const printed = out.output();
    out.restore();

    expect(res.written).toBe(false);
    expect(printed).toContain('type: Reference');
    expect(printed).toContain('dry-run');
    expect(existsSync(join(root, 'references'))).toBe(false);
    expect(readdirSync(root)).toEqual(before);
  });

  it('rejects a non-conformant mapping (malformed date) and writes no file', () => {
    const root = newVault();
    const srcDir = mkdtempSync(join(tmpdir(), 'engram-momentum-'));
    const bad = join(srcDir, 'bad-adr.md');
    writeFileSync(
      bad,
      ['# 9 — Bad Date', '', '> **Date**: 2026-13-45', '', '## Decision', '', 'Ship it.'].join('\n'),
    );

    expect(() => runPromote(bad, { cwd: root })).toThrow(CliError);
    out.restore();
    expect(existsSync(join(root, 'references'))).toBe(false);
  });
});
