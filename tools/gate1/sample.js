#!/usr/bin/env node
/**
 * gate1 sampler — draw a deterministic random sample from the extracted corpus.
 *
 * Rule 11: N and SEED are arguments, fixed and recorded in phase history BEFORE
 * any prompt text is read. Re-running with the same seed reproduces the same
 * sample exactly, so the sample is auditable rather than convenient.
 *
 * A census of the full corpus buys almost nothing statistically: at the sample
 * sizes here the Wilson interval is already tight, and the sample is what the
 * human blind-labels 20% of.
 *
 *   node tools/gate1/sample.js --n 400 --seed 20260810
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
}

const n = Number(arg('--n', '400'));
const seed = String(arg('--seed', '20260810'));
const dir = arg('--dir', join(process.cwd(), '.gate1'));

const corpus = readFileSync(join(dir, 'corpus.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));

/** Deterministic key per item: hash(seed + id). Sorting by it is a seeded shuffle. */
const keyed = corpus.map((item) => ({
  item,
  key: createHash('sha256').update(`${seed}:${item.id}`).digest('hex'),
}));
keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

const sample = keyed.slice(0, Math.min(n, keyed.length)).map((k) => k.item);

writeFileSync(join(dir, 'sample.jsonl'), sample.map((p) => JSON.stringify(p)).join('\n') + '\n');

const byRoot = {};
for (const p of sample) byRoot[p.root] = (byRoot[p.root] ?? 0) + 1;

console.log(`corpus:  ${corpus.length}`);
console.log(`sample:  ${sample.length}  (seed ${seed})`);
console.log(`roots represented: ${Object.keys(byRoot).length}`);
console.log(`\nwrote ${join(dir, 'sample.jsonl')}`);
