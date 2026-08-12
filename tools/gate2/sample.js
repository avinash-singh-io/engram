#!/usr/bin/env node
/**
 * gate2 sampler — draw the edge sample from a formatted corpus.
 *
 * Selection is a seeded hash over the edge identity, deliberately **independent of
 * any label**. Sampling by the machine's own judgement would draw only where the
 * agent already agrees with itself — the exact defect that forced gate1-v1 to be
 * version-bumped.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
}

const n = Number(arg('--n', '50'));
const seed = String(arg('--seed', '20260812'));
const dir = arg('--dir', join(process.cwd(), '.gate2'));

const edges = readFileSync(join(dir, 'corpus.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const keyed = edges.map((edge) => ({
  edge,
  key: createHash('sha256').update(`${seed}:${edge.from}:${edge.kind}:${edge.to}`).digest('hex'),
}));
keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

const sample = keyed.slice(0, Math.min(n, keyed.length)).map((k) => k.edge);
writeFileSync(join(dir, 'sample.jsonl'), sample.map((e) => JSON.stringify(e)).join('\n') + '\n');

const byKind = {};
for (const e of sample) byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;

console.log(`corpus: ${edges.length} edges`);
console.log(`sample: ${sample.length}  (seed ${seed})`);
console.log(`by kind: ${JSON.stringify(byKind)}`);
console.log(`\nwrote ${join(dir, 'sample.jsonl')}`);
