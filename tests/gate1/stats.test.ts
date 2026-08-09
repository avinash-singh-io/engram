import { describe, expect, it } from 'vitest';
import { cohensKappa, wilsonInterval } from '../../tools/gate1/stats.js';

/**
 * ADR-0037 §5 — these two statistics decide Gate 1. Every case below is checked
 * against an independently published value, not against this implementation's
 * own output.
 */
describe('wilsonInterval — published reference values', () => {
  it('5/10 → [0.2366, 0.7634]', () => {
    const { point, lower, upper } = wilsonInterval(5, 10);
    expect(point).toBe(0.5);
    expect(lower).toBeCloseTo(0.2366, 4);
    expect(upper).toBeCloseTo(0.7634, 4);
  });

  it('20/100 → [0.1334, 0.2888] — the shape this gate will actually see', () => {
    const { lower, upper } = wilsonInterval(20, 100);
    expect(lower).toBeCloseTo(0.1334, 4);
    expect(upper).toBeCloseTo(0.2888, 4);
  });

  it('clamps to [0, 1] at the boundaries', () => {
    expect(wilsonInterval(0, 20).lower).toBe(0);
    expect(wilsonInterval(20, 20).upper).toBe(1);
  });

  it('narrows as n grows at a fixed proportion', () => {
    const small = wilsonInterval(20, 100);
    const large = wilsonInterval(200, 1000);
    expect(large.upper - large.lower).toBeLessThan(small.upper - small.lower);
  });

  it('rejects malformed input rather than returning a number', () => {
    expect(() => wilsonInterval(1, 0)).toThrow(RangeError);
    expect(() => wilsonInterval(5, 4)).toThrow(RangeError);
    expect(() => wilsonInterval(-1, 10)).toThrow(RangeError);
    expect(() => wilsonInterval(1.5, 10)).toThrow(TypeError);
  });
});

describe('cohensKappa — published reference values', () => {
  it('textbook 2x2 (20/15 agree, 5/10 disagree of 50) → 0.4', () => {
    const a = [
      ...Array(20).fill('yes'),
      ...Array(15).fill('no'),
      ...Array(5).fill('yes'),
      ...Array(10).fill('no'),
    ];
    const b = [
      ...Array(20).fill('yes'),
      ...Array(15).fill('no'),
      ...Array(5).fill('no'),
      ...Array(10).fill('yes'),
    ];
    expect(cohensKappa(a, b)).toBeCloseTo(0.4, 10);
  });

  it('perfect agreement across three labels → 1', () => {
    const labels = ['structural', 'lookup', 'not-a-kb-question', 'structural'];
    expect(cohensKappa(labels, labels)).toBe(1);
  });

  it('agreement no better than chance → 0', () => {
    // Marginals identical, agreement exactly at the chance rate.
    const a = ['x', 'x', 'y', 'y'];
    const b = ['x', 'y', 'x', 'y'];
    expect(cohensKappa(a, b)).toBeCloseTo(0, 10);
  });

  it('systematic disagreement is negative', () => {
    expect(cohensKappa(['x', 'y'], ['y', 'x'])).toBeLessThan(0);
  });

  it('handles the three-label case this rubric uses', () => {
    const machine = ['structural', 'structural', 'lookup', 'not-a-kb-question'];
    const human = ['structural', 'lookup', 'lookup', 'not-a-kb-question'];
    const k = cohensKappa(machine, human);
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThan(1);
  });

  it('never returns NaN when both raters used a single identical label', () => {
    expect(cohensKappa(['lookup', 'lookup'], ['lookup', 'lookup'])).toBe(1);
  });

  it('rejects misaligned or empty input', () => {
    expect(() => cohensKappa(['a'], ['a', 'b'])).toThrow(RangeError);
    expect(() => cohensKappa([], [])).toThrow(RangeError);
  });
});

describe('the gate decision rule (ADR-0037 §4)', () => {
  const THRESHOLD = 0.2;

  it('CLEAR requires the lower bound at or above 20%', () => {
    const { lower } = wilsonInterval(45, 100);
    expect(lower).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it('an observed 26% at n=150 straddles — the case a point estimate misreads', () => {
    const { point, lower, upper } = wilsonInterval(39, 150);
    expect(point).toBeGreaterThan(THRESHOLD); // a point rule would call this CLEAR
    expect(lower).toBeLessThan(THRESHOLD); // the interval says UNRESOLVED
    expect(upper).toBeGreaterThan(THRESHOLD);
  });
});
