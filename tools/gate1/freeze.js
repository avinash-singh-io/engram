#!/usr/bin/env node
/**
 * Regenerate the Rule 11 freeze manifest for every tests/benchmarks/gate1-v* dir.
 *
 * Run this ONLY for a deliberate version bump — creating gate1-vN+1, never
 * "fixing" a failing freeze test. A failing freeze test means a locked file
 * changed, which is exactly the thing the lock exists to prevent.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const benchmarks = join(here, '..', '..', 'tests', 'benchmarks');

const versions = readdirSync(benchmarks)
  .filter((name) => /^gate1-v\d+$/.test(name))
  .sort();

for (const version of versions) {
  const dir = join(benchmarks, version);
  const files = readdirSync(dir)
    .filter((name) => name !== 'MANIFEST.sha256')
    .sort();

  const lines = files.map((name) => {
    const hash = createHash('sha256')
      .update(readFileSync(join(dir, name)))
      .digest('hex');
    return `${hash}  ${name}`;
  });

  writeFileSync(
    join(dir, 'MANIFEST.sha256'),
    `# ${version} locked evaluator — Rule 11 freeze manifest\n` +
      `# Regenerate ONLY for a deliberate version bump.\n` +
      `${lines.join('\n')}\n`,
  );

  console.log(`${version}: froze ${files.length} file(s) — ${files.join(', ')}`);
}
