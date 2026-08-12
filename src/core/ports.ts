/**
 * TIER 1 — the narrow interfaces the core needs (ADR-0032, interface segregation).
 *
 * `core/` names them; `substrate/` implements them. Three interfaces, not one:
 * the first sketch had a single fat `substrate` covering filesystem, environment
 * and time, which made every consumer depend on capabilities it does not use and
 * every test stub all three.
 *
 * | Port      | Used by              | Stubbed in tests as |
 * |-----------|----------------------|---------------------|
 * | FileStore | ops, views, memory   | an in-memory map    |
 * | Detector  | surface, doctor      | a fixed fact set    |
 * | Clock     | model stamps         | a fixed instant     |
 *
 * Because these are the only way out, the core is exercisable entirely in
 * memory — no temp directories, no fixtures, no clock flake.
 */

import type { Instant } from './model.js';

/** Content-addressed by path. Total: a missing file is `null`, never a throw. */
export interface FileStore {
  read(path: string): Promise<string | null>;
  write(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  list(): Promise<string[]>;
}

/** Environment facts — detection over configuration (ADR-0025). */
export interface Detector {
  /** An unknown fact is absent, not an error. */
  has(fact: string): Promise<boolean>;
}

/** Time. The core never reads a system clock directly. */
export interface Clock {
  now(): Instant;
}
