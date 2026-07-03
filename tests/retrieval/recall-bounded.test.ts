import { describe, expect, it } from 'vitest';
import { navigate } from '../../src/retrieval/navigate';
import { countConcepts } from '../../src/retrieval/vault-root';
import rawEval from '../benchmarks/recall-v1/eval.json';
import { FIXTURE_VAULT } from './fixture';

interface EvalQuery {
  id: string;
  query: string;
  tags?: string[];
  type?: string;
  max?: number;
  sections?: boolean;
  maxBodyReads?: number;
  maxFilesFraction?: number;
  expectedConceptIds: string[];
}

interface EvalSet {
  version: string;
  conceptCount: number;
  defaults: { maxBodyReads: number; maxFilesFraction: number; max: number };
  queries: EvalQuery[];
}

const evalSet = rawEval as unknown as EvalSet;

/**
 * The LOCKED recall-v1 harness (Rule 11) and the Rule-12 bounded-read evidence.
 * For each frozen query it asserts recall-correctness plus the M3/M6 read bounds
 * against a live ReadReport — the numbers that prove `/recall` reads the map,
 * not the whole vault.
 */
describe('recall-v1 bounded evaluator', () => {
  it('locks a 100+ concept nested vault', () => {
    expect(evalSet.version).toBe('recall-v1');
    expect(evalSet.conceptCount).toBeGreaterThanOrEqual(100);
    expect(countConcepts(FIXTURE_VAULT)).toBe(evalSet.conceptCount);
  });

  for (const q of evalSet.queries) {
    it(`[${q.id}] returns the expected concept within the bounded read budget`, () => {
      const maxBodyReads = q.maxBodyReads ?? evalSet.defaults.maxBodyReads;
      const maxFilesFraction = q.maxFilesFraction ?? evalSet.defaults.maxFilesFraction;
      const result = navigate(FIXTURE_VAULT, q.query, {
        tags: q.tags,
        type: q.type,
        max: q.max ?? evalSet.defaults.max,
        sections: q.sections,
      });
      const ids = result.results.map((r) => r.id);
      const report = result.report;

      // recall@K = 100%: every expected concept is in the returned minimal set.
      for (const expected of q.expectedConceptIds) expect(ids).toContain(expected);

      // conceptCount denominator comes from enumeration, not content reads.
      expect(report.conceptCount).toBe(evalSet.conceptCount);

      // M6 — never a whole-vault body load.
      expect(report.bodyReads).toBeLessThan(report.conceptCount);
      expect(report.bodyReads).toBeLessThanOrEqual(maxBodyReads);

      // M3 — a bounded, sublinear fraction of files touched.
      expect(report.filesTouched / report.conceptCount).toBeLessThanOrEqual(maxFilesFraction);

      // The map (index tier) dominates the body tier.
      expect(report.byTier.index.reads).toBeGreaterThanOrEqual(report.byTier.body.reads);
    });
  }
});
