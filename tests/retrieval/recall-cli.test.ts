import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildProgram } from '../../src/cli-program';
import { FIXTURE_VAULT } from './fixture';

interface CliRun {
  out: string;
  err: string;
  code: number;
}

const sink = (bucket: string[]) =>
  ((chunk: unknown): boolean => {
    bucket.push(String(chunk));
    return true;
  }) as unknown as typeof process.stdout.write;

async function runCli(args: string[]): Promise<CliRun> {
  const out: string[] = [];
  const err: string[] = [];
  const so = vi.spyOn(process.stdout, 'write').mockImplementation(sink(out));
  const se = vi.spyOn(process.stderr, 'write').mockImplementation(sink(err));
  const prev = process.exitCode;
  process.exitCode = 0;
  try {
    await buildProgram().parseAsync(['node', 'engram', ...args]);
  } finally {
    so.mockRestore();
    se.mockRestore();
  }
  const code = Number(process.exitCode ?? 0);
  process.exitCode = prev;
  return { out: out.join(''), err: err.join(''), code };
}

describe('recall CLI', () => {
  it('prints ranked references and exits 0', async () => {
    const { out, code } = await runCli(['recall', 'raft consensus', '--vault', FIXTURE_VAULT]);
    expect(code).toBe(0);
    expect(out).toContain('raft-consensus');
    expect(out).toContain('reference');
  });

  it('--json emits a ReadReport with all four tiers and no body reads', async () => {
    const { out, code } = await runCli(['recall', 'raft', '--vault', FIXTURE_VAULT, '--json']);
    const parsed = JSON.parse(out) as {
      results: { id: string }[];
      report: { byTier: Record<string, unknown>; bodyReads: number; conceptCount: number };
    };
    expect(parsed.report.byTier).toHaveProperty('index');
    expect(parsed.report.byTier).toHaveProperty('frontmatter');
    expect(parsed.report.byTier).toHaveProperty('grep');
    expect(parsed.report.byTier).toHaveProperty('body');
    expect(parsed.report.bodyReads).toBe(0);
    expect(parsed.report.conceptCount).toBe(126);
    expect(parsed.results[0]?.id).toBe('distributed-systems/consensus/raft-consensus');
    expect(code).toBe(0);
  });

  it('--explain shows per-tier read counts', async () => {
    const { out } = await runCli(['recall', 'raft', '--vault', FIXTURE_VAULT, '--explain']);
    expect(out).toContain('reads: index=');
  });

  it('--sections includes matched headings', async () => {
    const { out } = await runCli([
      'recall',
      'distributed tracing',
      '--vault',
      FIXTURE_VAULT,
      '--sections',
      '--max',
      '3',
    ]);
    expect(out).toContain('sections:');
  });

  it('exits 1 with suggestions when nothing matches', async () => {
    const { err, code } = await runCli(['recall', 'zzzz flibberflabber', '--vault', FIXTURE_VAULT]);
    expect(code).toBe(1);
    expect(err).toContain('no concept above threshold');
  });

  it('exits 2 on a usage error (no query and no mode flag)', async () => {
    const { code } = await runCli(['recall', '--vault', FIXTURE_VAULT]);
    expect(code).toBe(2);
  });

  it('exits 2 when the --vault path is not a vault', async () => {
    const { code } = await runCli(['recall', 'raft', '--vault', '/no-such-engram-vault-xyz']);
    expect(code).toBe(2);
  });

  it('--check-index passes on the navigation-grade fixture', async () => {
    const { out, code } = await runCli(['recall', '--vault', FIXTURE_VAULT, '--check-index']);
    expect(code).toBe(0);
    expect(out).toContain('navigation-grade');
  });

  it('--emit-contract writes an idempotent AGENTS.md', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'engram-emit-cli-'));
    writeFileSync(join(dir, 'index.md'), '# vault\n');
    const first = await runCli(['recall', '--vault', dir, '--emit-contract']);
    expect(first.code).toBe(0);
    expect(first.out).toContain('wrote');
    const second = await runCli(['recall', '--vault', dir, '--emit-contract']);
    expect(second.out).toContain('already current');
  });
});
