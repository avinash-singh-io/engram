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
