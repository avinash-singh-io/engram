#!/usr/bin/env node
/**
 * gate1 report — fraction, Wilson interval, per-root slice, and the verdict.
 *
 * THE REFUSAL IS THE POINT. ADR-0037 §5 requires a validated classifier before
 * any number counts as a gate decision. Without a blind human-labeled sample and
 * a computed kappa, this tool emits PROVISIONAL and states no verdict — a rule
 * enforced in code rather than in prose, because a prose caveat gets skipped and
 * the number gets quoted.
 *
 *   node tools/gate1/report.js
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cohensKappa, wilsonInterval } from './stats.js';

const dir = process.argv.includes('--dir')
  ? process.argv[process.argv.indexOf('--dir') + 1]
  : join(process.cwd(), '.gate1');

const THRESHOLD = 0.2; // ADR-0031, unchanged
const KAPPA_FLOOR = 0.7; // ADR-0037 §5

const LABEL = { N: 'not-a-kb-question', L: 'lookup', S: 'structural' };

const sample = readFileSync(join(dir, 'sample.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));

function readLabels(file) {
  const path = join(dir, file);
  if (!existsSync(path)) return null;
  const map = new Map();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const [idx, label] = line.split('\t');
    map.set(Number(idx), label.trim());
  }
  return map;
}

/**
 * Human labels come from the single fill-in worksheet: lines of the form
 * `ANSWER: S` following a `### <index>` heading. One file to read and write, so
 * there is no index-matching by hand between two files.
 */
function readWorksheet(file) {
  const path = join(dir, file);
  if (!existsSync(path)) return null;
  const map = new Map();
  let current = null;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const heading = line.match(/^###\s+(\d+)\s*$/);
    if (heading) {
      current = Number(heading[1]);
      continue;
    }
    const answer = line.match(/^ANSWER:\s*([NLSnls])\s*$/);
    if (answer && current !== null) {
      map.set(current, answer[1].toUpperCase());
      current = null;
    }
  }
  return map.size > 0 ? map : null;
}

const machine = readLabels('labels-machine.tsv');
// Prefer the worksheet; fall back to the raw TSV so either form works.
const human = readWorksheet('adjudication.md') ?? readLabels('labels-human.tsv');

if (!machine) {
  console.error('no labels-machine.tsv — nothing to report');
  process.exit(1);
}

const counts = { N: 0, L: 0, S: 0 };
for (const label of machine.values()) counts[label]++;

const denominator = counts.L + counts.S;
const ci = wilsonInterval(counts.S, denominator);

// ---- classifier validation -------------------------------------------------
let kappa = null;
let overlap = 0;
if (human) {
  const idx = [...human.keys()].filter((k) => machine.has(k));
  overlap = idx.length;
  if (overlap > 0) {
    kappa = cohensKappa(
      idx.map((i) => machine.get(i)),
      idx.map((i) => human.get(i)),
    );
  }
}
const validated = kappa !== null && kappa >= KAPPA_FLOOR;

// ---- verdict ---------------------------------------------------------------
// Stage A cannot FAIL the gate: the retrospective corpus undercounts structural
// traffic by construction, so a low reading is uninterpretable (ADR-0037 §3).
let verdict;
if (!validated) {
  verdict = 'PROVISIONAL — NOT A GATE DECISION';
} else if (ci.lower >= THRESHOLD) {
  verdict = 'CLEAR — proceed to Phase 8';
} else {
  verdict = 'UNRESOLVED — proceed to Stage B (wondered journal)';
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;

console.log('# Gate 1 — Stage A report (gate1-v2)\n');
console.log(`sample                 ${sample.length}`);
console.log(`  not-a-kb-question    ${counts.N}`);
console.log(`  lookup               ${counts.L}`);
console.log(`  structural           ${counts.S}`);
console.log(
  `\ndenominator (L+S)      ${denominator}   (${pct(denominator / sample.length)} of sample)`,
);
console.log(`structural fraction    ${pct(ci.point)}`);
console.log(`Wilson 95% CI          [${pct(ci.lower)}, ${pct(ci.upper)}]`);
console.log(`threshold              ${pct(THRESHOLD)}`);

console.log(`\nclassifier validation`);
if (kappa === null) {
  console.log(`  labels-human.tsv     ABSENT`);
  console.log(`  Cohen's kappa        UNMEASURED`);
} else {
  console.log(`  blind overlap        ${overlap} items`);
  console.log(`  Cohen's kappa        ${kappa.toFixed(3)} (floor ${KAPPA_FLOOR})`);
}

console.log(`\nVERDICT: ${verdict}`);

if (!validated) {
  console.log(
    `\nThe classifier is a single unvalidated rater. ADR-0037 §5 requires a blind\n` +
      `human-labeled sample and kappa >= ${KAPPA_FLOOR} before any number is a gate decision.\n` +
      `Write .gate1/labels-human.tsv (index<TAB>N|L|S) and re-run.`,
  );
}

// ---- per-root slice (opaque ids only, ADR-0030) -----------------------------
const roots = new Map();
for (const [i, label] of machine) {
  const root = sample[i].root;
  if (!roots.has(root)) roots.set(root, { N: 0, L: 0, S: 0 });
  roots.get(root)[label]++;
}
console.log(`\nper-root slice (opaque ids)`);
for (const [root, c] of [...roots].sort((a, b) => b[1].S + b[1].L - (a[1].S + a[1].L))) {
  const d = c.L + c.S;
  if (d === 0) continue;
  console.log(`  ${root}  n=${c.N + d}  L=${c.L}  S=${c.S}  structural=${pct(c.S / d)}`);
}

console.log(
  `\nlabel key: ${Object.entries(LABEL)
    .map(([k, v]) => `${k}=${v}`)
    .join('  ')}`,
);
