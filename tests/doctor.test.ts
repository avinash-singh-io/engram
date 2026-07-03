import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { caseFoldCollisions, runDoctor, type DoctorReport } from '../src/commands/doctor';
import { serializeConcept } from '../src/format';

let root: string;

function concept(overrides: Record<string, unknown> = {}, body = '# Model\n\nA point.'): string {
  return serializeConcept(
    {
      type: 'Concept',
      title: 'Idempotency Patterns',
      description: 'At-least-once plus idempotent operations yields effectively-once.',
      tags: ['distributed-systems'],
      timestamp: '2026-07-03T00:00:00Z',
      ...overrides,
    },
    body,
  );
}

function write(rel: string, content: string): void {
  const abs = join(root, rel);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content);
}

function codes(report: DoctorReport, severity: 'error' | 'warning'): string[] {
  return report.findings.filter((f) => f.severity === severity).map((f) => f.code);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'engram-doctor-'));
  // Reserved files are never validated as concepts.
  writeFileSync(join(root, 'AGENTS.md'), '# Agents\n');
  writeFileSync(join(root, 'log.md'), '# Log\n');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('engram doctor', () => {
  it('validates every concept and reports no errors for a conformant vault', () => {
    write('system-design/idempotency.md', concept());
    const report = runDoctor(root);
    expect(report.conceptsChecked).toBe(1);
    expect(codes(report, 'error')).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('honors reserved files (index/log/AGENTS never validated as concepts)', () => {
    write('system-design/idempotency.md', concept());
    const report = runDoctor(root);
    // Only the one real concept is checked; reserved files are skipped.
    expect(report.conceptsChecked).toBe(1);
    expect(report.findings.some((f) => f.path === 'AGENTS.md')).toBe(false);
    expect(report.findings.some((f) => f.path === 'log.md')).toBe(false);
  });

  it('fails when a concept is OKF-invalid (missing required field)', () => {
    write('bad.md', concept({ title: undefined }));
    const report = runDoctor(root);
    expect(report.ok).toBe(false);
    expect(codes(report, 'error')).toContain('missing-field:title');
  });

  it('fails on an unresolved VCS conflict marker', () => {
    const conflicted = `${concept()}\n<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> feature\n`;
    write('conflicted.md', conflicted);
    const report = runDoctor(root);
    expect(report.ok).toBe(false);
    expect(codes(report, 'error')).toContain('sync-conflict-marker');
  });

  it('does not false-positive on setext headings or thematic rules', () => {
    write('setext.md', concept({}, 'Title\n=====\n\nBody with a rule.\n'));
    const report = runDoctor(root);
    expect(codes(report, 'error')).not.toContain('sync-conflict-marker');
  });

  it('warns (does not fail) on CRLF and BOM mangling', () => {
    write('crlf.md', concept().replace(/\n/g, '\r\n'));
    write('bom.md', `\uFEFF${concept()}`);
    const report = runDoctor(root);
    expect(report.ok).toBe(true);
    expect(codes(report, 'warning')).toContain('sync-crlf');
    expect(codes(report, 'warning')).toContain('sync-bom');
  });

  // The host filesystem (macOS) is case-insensitive, so two distinctly-cased
  // paths cannot coexist on disk to exercise runDoctor's enumeration here. The
  // collision *logic* fires when a case-sensitive backend (Linux, git) produces
  // both paths, so it is tested as a pure function.
  it('detects case-fold filename collisions (pure)', () => {
    expect(caseFoldCollisions(['a/Note.md', 'a/note.md', 'b/other.md'])).toEqual([
      ['a/Note.md', 'a/note.md'],
    ]);
    expect(caseFoldCollisions(['x.md', 'y.md'])).toEqual([]);
  });

  it('warns when no git spine is present', () => {
    write('system-design/idempotency.md', concept());
    const report = runDoctor(root);
    expect(report.gitPresent).toBe(false);
    expect(codes(report, 'warning')).toContain('sync-no-git');
  });

  it('warns on a stale index (does not fail)', () => {
    write('system-design/idempotency.md', concept());
    const report = runDoctor(root);
    // No generated indexes exist yet, so the indexer reports drift as a warning.
    expect(codes(report, 'warning')).toContain('index-stale');
    expect(report.ok).toBe(true);
  });
});
