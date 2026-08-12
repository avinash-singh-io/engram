/**
 * gate2 statistics — Wilson interval, reused from gate1's tested implementation.
 *
 * ADR-0040 §5's principle carries over: a subtly wrong statistic corrupts the
 * decision silently, so the arithmetic is shared with an implementation already
 * checked against published values rather than rewritten.
 */
export { wilsonInterval, cohensKappa } from '../gate1/stats.js';
