#!/usr/bin/env node
/**
 * Regenerate tests/benchmarks/gate1-v1/MANIFEST.sha256.
 *
 * Rule 11: run this ONLY when deliberately adding a stage-2 artifact per
 * ADR-0037 §6 (i.e. seed.jsonl, after extraction and before the classifier
 * runs). Never run it to "fix" a failing freeze test — a failing freeze test
 * means a locked file changed, which is the thing the lock exists to prevent.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const lockedDir = join(here, '..', '..', 'tests', 'benchmarks', 'gate1-v1');

const files = readdirSync(lockedDir)
  .filter((name) => name !== 'MANIFEST.sha256')
  .sort();

const lines = files.map((name) => {
  const hash = createHash('sha256')
    .update(readFileSync(join(lockedDir, name)))
    .digest('hex');
  return `${hash}  ${name}`;
});

writeFileSync(
  join(lockedDir, 'MANIFEST.sha256'),
  `# gate1-v1 locked evaluator — Rule 11 freeze manifest\n` +
    `# Regenerate ONLY for a deliberate stage-2 addition (ADR-0037 §6).\n` +
    `${lines.join('\n')}\n`,
);

console.log(`froze ${files.length} file(s):\n  ${files.join('\n  ')}`);
