/** TIER 3 — implements `core/ports.ts`. */
import type { Clock } from '../core/ports.js';

/** Wall clock. The only place in the system that reads real time. */
export function systemClock(): Clock {
  return { now: () => new Date().toISOString() };
}

/** A frozen instant — what every test uses, so nothing flakes on time. */
export function fixedClock(instant: string): Clock {
  return { now: () => instant };
}
