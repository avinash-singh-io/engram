/**
 * gate1 statistics — Cohen's kappa and the Wilson score interval.
 *
 * ADR-0037 §5: both are unit-tested against known values. A subtly wrong kappa or
 * interval would corrupt the Gate 1 decision silently, which is the exact failure
 * ADR-0031 exists to prevent.
 */

const Z_95 = 1.959963984540054;

/**
 * Wilson score interval for a binomial proportion.
 *
 * Used instead of the normal approximation, which is poor at the proportions
 * (~0.2) and the moderate n this measurement will actually see.
 *
 * @param {number} successes
 * @param {number} total
 * @param {number} [z] critical value; defaults to 95%
 * @returns {{ point: number, lower: number, upper: number }}
 */
export function wilsonInterval(successes, total, z = Z_95) {
  if (!Number.isInteger(successes) || !Number.isInteger(total)) {
    throw new TypeError('successes and total must be integers');
  }
  if (total <= 0) throw new RangeError('total must be > 0');
  if (successes < 0 || successes > total) {
    throw new RangeError('successes must be within [0, total]');
  }

  const p = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denom;
  const half = (z / denom) * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total));

  return {
    point: p,
    lower: Math.max(0, center - half),
    upper: Math.min(1, center + half),
  };
}

/**
 * Cohen's kappa for two raters over any number of nominal categories.
 *
 * @param {string[]} a rater A's labels, aligned with b
 * @param {string[]} b rater B's labels, aligned with a
 * @returns {number} kappa in [-1, 1]
 */
export function cohensKappa(a, b) {
  if (a.length !== b.length) throw new RangeError('label arrays must be aligned');
  if (a.length === 0) throw new RangeError('need at least one labeled item');

  const n = a.length;
  let agreed = 0;
  const countsA = new Map();
  const countsB = new Map();

  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) agreed++;
    countsA.set(a[i], (countsA.get(a[i]) ?? 0) + 1);
    countsB.set(b[i], (countsB.get(b[i]) ?? 0) + 1);
  }

  const observed = agreed / n;

  let expected = 0;
  for (const [label, countA] of countsA) {
    const countB = countsB.get(label) ?? 0;
    expected += (countA / n) * (countB / n);
  }

  // Both raters used exactly one category, identically: agreement is total but
  // chance-corrected agreement is undefined (0/0). Report 1 for identical
  // labelings, 0 otherwise — never NaN into a gate decision.
  if (expected === 1) return observed === 1 ? 1 : 0;

  return (observed - expected) / (1 - expected);
}
