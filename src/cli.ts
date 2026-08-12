#!/usr/bin/env node
/**
 * engram CLI. Phase 8 ships `capture` and `link` (Group 6).
 * Until then this is a placeholder that keeps the build target valid.
 */
export function main(argv: string[] = process.argv.slice(2)): number {
  process.stdout.write(
    `engram: not yet reimplemented (Phase 8 in progress) — argv: ${argv.join(' ')}\n`,
  );
  return 0;
}
