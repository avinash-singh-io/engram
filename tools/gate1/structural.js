#!/usr/bin/env node
/**
 * Extract the questions labeled `structural` — the most valuable artifact this
 * phase produces for Phase 11.
 *
 * These are REAL structural questions from real sessions, which is exactly what a
 * retrieval evaluator needs and what `recall-v1` (synthetic, lookup-shaped) does
 * not have. They are NOT yet an evaluator: an evaluator needs an answer key, and
 * authoring one is human work — see the Group 3 note in the phase overview.
 *
 * Output is gitignored; it carries raw prompt text.
 *
 *   node tools/gate1/structural.js
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv.includes('--dir')
  ? process.argv[process.argv.indexOf('--dir') + 1]
  : join(process.cwd(), '.gate1');

const sample = readFileSync(join(dir, 'sample.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const structural = [];
for (const line of readFileSync(join(dir, 'labels-machine.tsv'), 'utf8').split('\n')) {
  if (line.trim() === '') continue;
  const [idx, label] = line.split('\t');
  if (label.trim() !== 'S') continue;
  const item = sample[Number(idx)];
  structural.push({
    index: Number(idx),
    root: item.root,
    ts: item.ts,
    text: item.text,
    expected: null, // <- the answer key. Human work. Phase 11 Group 0.
  });
}

writeFileSync(
  join(dir, 'structural-questions.jsonl'),
  structural.map((q) => JSON.stringify(q)).join('\n') + '\n',
);

console.log(`structural questions: ${structural.length}`);
console.log(`wrote ${join(dir, 'structural-questions.jsonl')}`);
console.log(`\nevery "expected" field is null — this is a question set, not an`);
console.log(`evaluator. Phase 11 must author the answer key before it can score.`);
