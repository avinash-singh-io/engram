import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The refusal is the safety mechanism, so it is tested rather than asserted.
 * ADR-0040: Gate 2 measures the AGENT's accuracy, and only a human can say whether
 * an arrow points the right way.
 */
const REPORT = join(__dirname, '..', '..', 'tools', 'gate2', 'report.js');

function fixture(judgements?: { direction: string; predicate: string }[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'gate2-'));
  const n = judgements?.length ?? 50;
  const sample = Array.from({ length: n }, (_, i) => ({
    from: `a${i}`,
    kind: 'supersedes',
    to: `b${i}`,
    context: 'some content',
  }));
  writeFileSync(join(dir, 'sample.jsonl'), sample.map((e) => JSON.stringify(e)).join('\n') + '\n');
  if (judgements) {
    const lines = judgements.flatMap((j, i) => [
      `### ${i}`,
      '',
      `DIRECTION: ${j.direction}`,
      `PREDICATE: ${j.predicate}`,
      '',
    ]);
    writeFileSync(join(dir, 'adjudication.md'), lines.join('\n'));
  }
  return dir;
}

const run = (dir: string) => execFileSync('node', [REPORT, '--dir', dir], { encoding: 'utf8' });
const many = (n: number, direction: string, predicate: string) =>
  Array.from({ length: n }, () => ({ direction, predicate }));

describe('the report refuses a verdict without human judgements', () => {
  it('emits PROVISIONAL when the worksheet is absent', () => {
    const out = run(fixture());
    expect(out).toContain('PROVISIONAL — NOT A GATE DECISION');
    expect(out).not.toContain('VERDICT: PASS');
  });

  it('says why only a human can judge it', () => {
    expect(run(fixture())).toMatch(/only a human can say whether an/);
  });
});

describe('the two-bar rule (ADR-0040)', () => {
  it('PASSES when both bars are met', () => {
    expect(run(fixture(many(50, 'correct', 'correct')))).toContain('VERDICT: PASS');
  });

  it('FAILS on directionality alone, even with perfect predicates', () => {
    // The exact case a single combined bar would have let through.
    const j = [...many(40, 'correct', 'correct'), ...many(10, 'reversed', 'correct')];
    const out = run(fixture(j));
    expect(out).toContain('VERDICT: FAIL');
    expect(out).toContain('directionality below bar');
  });

  it('FAILS on predicate alone, even with perfect directionality', () => {
    const j = [...many(40, 'correct', 'correct'), ...many(10, 'correct', 'wrong-kind')];
    const out = run(fixture(j));
    expect(out).toContain('VERDICT: FAIL');
    expect(out).toContain('predicate below bar');
  });

  it('names ADR-0031 fallback on failure, not just the number', () => {
    const out = run(fixture(many(50, 'reversed', 'spurious')));
    expect(out).toMatch(/nodes plus untyped links/);
    expect(out).toMatch(/statement about the MODEL, not engram/);
  });
});

describe('scoring follows the rubric exactly', () => {
  it('excludes n/a from directionality', () => {
    const j = [...many(45, 'correct', 'correct'), ...many(5, 'n/a', 'correct')];
    expect(run(fixture(j))).toContain('(45/45)');
  });

  it('does NOT exclude n/a from predicate — the worst errors must not vanish', () => {
    const j = [...many(45, 'correct', 'correct'), ...many(5, 'n/a', 'spurious')];
    expect(run(fixture(j))).toMatch(/predicate\s+90\.0%\s+\(45\/50\)/);
  });

  it('reports the predicate breakdown so the error mix is visible', () => {
    const j = [...many(40, 'correct', 'correct'), ...many(10, 'correct', 'should-be-untyped')];
    expect(run(fixture(j))).toMatch(/should-be-untyped/);
  });

  it('always states the synthetic-trigger limitation', () => {
    expect(run(fixture(many(50, 'correct', 'correct')))).toMatch(/trigger is synthetic/);
  });
});
