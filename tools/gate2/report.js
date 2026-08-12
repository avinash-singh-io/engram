#!/usr/bin/env node
/**
 * gate2 report — apply ADR-0040's two-bar decision rule.
 *
 * **Refuses a verdict without blind human judgements.** Enforced here rather than
 * asserted in prose, for the same reason gate1's report does: a caveat in a document
 * gets skipped, a refusal in code does not.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { wilsonInterval } from './stats.js';

const DIR = process.argv.includes('--dir')
  ? process.argv[process.argv.indexOf('--dir') + 1]
  : join(process.cwd(), '.gate2');

const DIRECTIONALITY_BAR = 0.95;
const PREDICATE_BAR = 0.9;

const sample = readFileSync(join(DIR, 'sample.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));

/** Judgements from the fill-in worksheet: `DIRECTION: x` / `PREDICATE: y`. */
function readWorksheet() {
  const path = join(DIR, 'adjudication.md');
  if (!existsSync(path)) return null;
  const judged = new Map();
  let current = null;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const heading = line.match(/^###\s+(\d+)\s*$/);
    if (heading) {
      current = Number(heading[1]);
      continue;
    }
    if (current === null) continue;
    const dir = line.match(/^DIRECTION:\s*(correct|reversed|n\/a)\s*$/i);
    const pred = line.match(/^PREDICATE:\s*(correct|wrong-kind|should-be-untyped|spurious)\s*$/i);
    const entry = judged.get(current) ?? {};
    if (dir) entry.direction = dir[1].toLowerCase();
    if (pred) entry.predicate = pred[1].toLowerCase();
    if (dir || pred) judged.set(current, entry);
  }
  return judged.size > 0 ? judged : null;
}

const human = readWorksheet();
const out = [];
out.push('# Gate 2 — edge accuracy report (gate2-v1)', '');
out.push(`sample                 ${sample.length} edges`);

if (human === null) {
  out.push('', 'judgements             ABSENT', '');
  out.push('VERDICT: PROVISIONAL — NOT A GATE DECISION', '');
  out.push("Gate 2 measures the AGENT's accuracy, and only a human can say whether an");
  out.push('arrow points the right way. ADR-0040 requires blind judgements before any');
  out.push('number is a verdict.');
  out.push('');
  out.push(`Fill in .gate2/adjudication.md, then re-run.`);
  console.log(out.join('\n'));
  process.exit(0);
}

const complete = [...human.entries()].filter(([, v]) => v.direction && v.predicate);
const dirJudged = complete.filter(([, v]) => v.direction !== 'n/a');
const dirCorrect = dirJudged.filter(([, v]) => v.direction === 'correct').length;
const predCorrect = complete.filter(([, v]) => v.predicate === 'correct').length;

// ADR-0040: n/a is excluded from directionality only. NEVER from predicate --
// excluding a wrong-kind edge would make the worst errors vanish from the denominator.
const dirAcc = dirJudged.length === 0 ? 0 : dirCorrect / dirJudged.length;
const predAcc = complete.length === 0 ? 0 : predCorrect / complete.length;
const dirCi = wilsonInterval(dirCorrect, Math.max(dirJudged.length, 1));
const predCi = wilsonInterval(predCorrect, Math.max(complete.length, 1));

const pct = (x) => `${(x * 100).toFixed(1)}%`;
out.push(`judged                 ${complete.length} edges`, '');
out.push(
  `directionality         ${pct(dirAcc)}  (${dirCorrect}/${dirJudged.length})  95% CI [${pct(dirCi.lower)}, ${pct(dirCi.upper)}]   bar ${pct(DIRECTIONALITY_BAR)}`,
);
out.push(
  `predicate              ${pct(predAcc)}  (${predCorrect}/${complete.length})  95% CI [${pct(predCi.lower)}, ${pct(predCi.upper)}]   bar ${pct(PREDICATE_BAR)}`,
);
out.push('');

const breakdown = {};
for (const [, v] of complete) breakdown[v.predicate] = (breakdown[v.predicate] ?? 0) + 1;
out.push(`predicate breakdown    ${JSON.stringify(breakdown)}`);
out.push('');

const passes = dirAcc >= DIRECTIONALITY_BAR && predAcc >= PREDICATE_BAR;
if (passes) {
  out.push('VERDICT: PASS — traversal retrieval is justified; Phase 11 proceeds.');
} else {
  const missed = [];
  if (dirAcc < DIRECTIONALITY_BAR) missed.push('directionality');
  if (predAcc < PREDICATE_BAR) missed.push('predicate');
  out.push(`VERDICT: FAIL — ${missed.join(' and ')} below bar.`);
  out.push('');
  out.push('ADR-0031 fallback: stop at nodes plus untyped links. Capture, format,');
  out.push('views, structure and health all still stand; only the structural route is');
  out.push("withheld. This is a statement about the MODEL, not engram's code -- engram");
  out.push('does not extract. Re-measurable against this same locked evaluator whenever');
  out.push('the extraction prompt or the model changes.');
}
out.push('');
out.push('LIMITATION: the corpus trigger is synthetic. Edges were generated in a batch');
out.push('over existing notes rather than in the flow of live work (gate2-v1 protocol).');
console.log(out.join('\n'));
