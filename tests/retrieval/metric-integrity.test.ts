import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { navigate } from '../../src/retrieval/navigate';
import { FIXTURE_VAULT, RETRIEVAL_SRC } from './fixture';

/**
 * Metric integrity: the M3/M6 numbers are only trustworthy if every content read
 * flows through the ReadLedger. These modules must therefore perform NO direct
 * filesystem access — all reads are delegated to `reader.ts` (content) and to
 * the shared enumerator (directory listing only).
 */
const LEDGER_ONLY = ['navigate.ts', 'scan.ts', 'index-parse.ts', 'score.ts'];

describe('metric integrity', () => {
  for (const file of LEDGER_ONLY) {
    it(`${file} imports no node:fs (reads route through the ReadLedger)`, () => {
      const src = readFileSync(join(RETRIEVAL_SRC, file), 'utf8');
      expect(src).not.toMatch(/from ['"]node:fs['"]/);
      expect(src).not.toMatch(/from ['"]fs['"]/);
      expect(src).not.toMatch(/require\(\s*['"](?:node:)?fs['"]\s*\)/);
    });
  }

  it('the emitted ReadReport is internally consistent', () => {
    const { report } = navigate(FIXTURE_VAULT, 'raft consensus determinism', { sections: true });
    const tierReads =
      report.byTier.index.reads +
      report.byTier.frontmatter.reads +
      report.byTier.grep.reads +
      report.byTier.body.reads;
    // Every touched file was read at least once; no read is unaccounted for.
    expect(tierReads).toBeGreaterThanOrEqual(report.filesTouched);
    expect(report.bodyReads).toBe(report.byTier.body.reads);
    expect(report.bytes).toBeGreaterThan(0);
  });
});
