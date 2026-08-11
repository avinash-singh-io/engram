import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The refusal is the safety mechanism, so it is tested rather than asserted.
 * ADR-0037 §5: no number is a gate decision until a blind human sample gives
 * kappa >= 0.7. A prose caveat gets skipped; a refusal in code does not.
 */
const REPORT = join(__dirname, '..', '..', 'tools', 'gate1', 'report.js');

function fixture(opts: { machine: string[]; human?: string[] }): string {
  const dir = mkdtempSync(join(tmpdir(), 'gate1-'));
  writeFileSync(
    join(dir, 'sample.jsonl'),
    opts.machine
      .map((_, i) =>
        JSON.stringify({ id: `u-${i}`, text: 'q', ts: 't', session: 's', root: 'root-aaa' }),
      )
      .join('\n') + '\n',
  );
  writeFileSync(
    join(dir, 'labels-machine.tsv'),
    opts.machine.map((l, i) => `${i}\t${l}`).join('\n') + '\n',
  );
  if (opts.human) {
    writeFileSync(
      join(dir, 'labels-human.tsv'),
      opts.human.map((l, i) => `${i}\t${l}`).join('\n') + '\n',
    );
  }
  return dir;
}

/** The single fill-in worksheet: `### <index>` headings with an `ANSWER:` line each. */
function worksheet(dir: string, labels: (string | null)[]): void {
  const lines: string[] = ['# worksheet', ''];
  labels.forEach((label, i) => {
    lines.push(`### ${i}`, '', '> some prompt text', '', `ANSWER:${label ? ` ${label}` : ''}`, '');
  });
  writeFileSync(join(dir, 'adjudication.md'), lines.join('\n'));
}

const run = (dir: string) => execFileSync('node', [REPORT, '--dir', dir], { encoding: 'utf8' });

// A clearly-structural corpus: any sane rule would call this CLEAR.
const STRONG = [...Array(40).fill('S'), ...Array(5).fill('L'), ...Array(55).fill('N')];

describe('report refuses a verdict without validated ground truth', () => {
  it('emits PROVISIONAL when no human labels exist, however strong the signal', () => {
    const out = run(fixture({ machine: STRONG }));
    expect(out).toContain('PROVISIONAL — NOT A GATE DECISION');
    expect(out).toContain('Cohen&apos;s kappa        UNMEASURED'.replace('&apos;', "'"));
    expect(out).not.toContain('CLEAR — proceed');
  });

  it('still refuses when human labels exist but agreement is below the floor', () => {
    // Human inverts the machine on the in-denominator items: kappa collapses.
    const human = STRONG.map((l) => (l === 'S' ? 'L' : l === 'L' ? 'S' : 'N'));
    const out = run(fixture({ machine: STRONG, human }));
    expect(out).toContain('PROVISIONAL — NOT A GATE DECISION');
    expect(out).not.toContain('CLEAR — proceed');
  });

  it('emits CLEAR once agreement passes the floor and the lower bound clears 20%', () => {
    const out = run(fixture({ machine: STRONG, human: STRONG }));
    expect(out).toContain('CLEAR — proceed to Phase 8');
    expect(out).toContain('Cohen');
  });

  it('emits UNRESOLVED — never FAIL — when validated but the bound is low', () => {
    // 5 structural of 45 in-denominator: well under the threshold.
    const weak = [...Array(5).fill('S'), ...Array(40).fill('L'), ...Array(55).fill('N')];
    const out = run(fixture({ machine: weak, human: weak }));
    expect(out).toContain('UNRESOLVED');
    expect(out).not.toContain('FAIL');
  });

  it('reports the denominator, not just the sample size', () => {
    const out = run(fixture({ machine: STRONG }));
    expect(out).toMatch(/denominator \(L\+S\)\s+45/);
  });
});

describe('the single fill-in worksheet is the label source', () => {
  it('reads ANSWER: lines from adjudication.md', () => {
    const dir = fixture({ machine: STRONG });
    worksheet(dir, STRONG);
    const out = run(dir);
    expect(out).toContain("Cohen's kappa        1.000");
    expect(out).not.toContain('PROVISIONAL');
  });

  it('accepts lowercase answers', () => {
    const dir = fixture({ machine: STRONG });
    worksheet(
      dir,
      STRONG.map((l) => l.toLowerCase()),
    );
    expect(run(dir)).toContain("Cohen's kappa        1.000");
  });

  it('an unfilled worksheet still refuses a verdict', () => {
    const dir = fixture({ machine: STRONG });
    worksheet(
      dir,
      STRONG.map(() => null),
    );
    expect(run(dir)).toContain('PROVISIONAL — NOT A GATE DECISION');
  });

  it('a partly-filled worksheet scores only the answered items', () => {
    const dir = fixture({ machine: STRONG });
    worksheet(
      dir,
      STRONG.map((l, i) => (i < 20 ? l : null)),
    );
    expect(run(dir)).toContain('blind overlap        20 items');
  });

  it('disagreement lowers kappa below the floor and blocks the verdict', () => {
    const dir = fixture({ machine: STRONG });
    // Flip every structural call to N: same marginals problem, real disagreement.
    worksheet(
      dir,
      STRONG.map((l) => (l === 'S' ? 'N' : l)),
    );
    const out = run(dir);
    expect(out).not.toContain('VERDICT: CLEAR');
  });
});
