/**
 * `capture(content)` — persist raw content to `raw/`.
 *
 * **Never validates. Never fails.** A durability step, not a filing decision
 * (ADR-0026). It does *not* pass the write gate: `raw/` is a buffer, not the
 * vault (ADR-0033), so there is nothing yet to validate against.
 *
 * The failure this prevents is the one that killed v1's capture path — five
 * required fields meant a thought typed on a phone could be rejected, and a
 * notes system that can refuse a note is a notes system you stop trusting.
 */

import type { Clock, FileStore } from '../core/ports.js';
import { RAW_DIR } from '../core/paths.js';

export interface CaptureDeps {
  files: FileStore;
  clock: Clock;
}

export interface CaptureResult {
  path: string;
  bytes: number;
}

/**
 * Timestamped filename under `raw/`. Collisions get a counter, not an error.
 *
 * The directory was `inbox/` through v1 and the v2 rewrite inherited the name.
 * `raw/` says what is actually in there — unprocessed thoughts, pasted articles,
 * half-finished notes — where `inbox/` only says it arrived and implies a queue to
 * be drained. Nothing here is owed processing.
 */
async function freePath(files: FileStore, at: string): Promise<string> {
  const base = `${RAW_DIR}/${at.replace(/[:.]/g, '-')}`;
  if (!(await files.exists(`${base}.md`))) return `${base}.md`;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}.md`;
    if (!(await files.exists(candidate))) return candidate;
  }
}

/**
 * Persist whatever was handed over, unchanged.
 *
 * Accepts anything a string can hold — empty, enormous, lone surrogates, bytes
 * that are not valid UTF-8 text. None of it is a reason to lose a thought.
 */
export async function capture(content: string, deps: CaptureDeps): Promise<CaptureResult> {
  const at = deps.clock.now();
  const path = await freePath(deps.files, at);
  await deps.files.write(path, content);
  return { path, bytes: content.length };
}
