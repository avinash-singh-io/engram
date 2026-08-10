#!/usr/bin/env node
/**
 * gate1 adjudication worksheet — the blind human sample (ADR-0037 §5).
 *
 * BLIND IS LOAD-BEARING. This deliberately does not read labels-machine.tsv, so
 * the worksheet cannot leak the machine's answer. Seeing it first would anchor the
 * human rater and turn kappa into a measure of suggestibility rather than
 * agreement.
 *
 * Writes two files:
 *   adjudication.md        the worksheet to read and fill in
 *   labels-human.tsv       a stub with blank labels, to complete
 *
 *   node tools/gate1/adjudicate.js --fraction 0.2 --seed 20260810
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
}

const fraction = Number(arg('--fraction', '0.2'));
const seed = String(arg('--seed', '20260810'));
const dir = arg('--dir', join(process.cwd(), '.gate1'));

const sample = readFileSync(join(dir, 'sample.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));

// A different salt from sample.js, so this is not a prefix of the same ordering.
const keyed = sample.map((item, index) => ({
  index,
  item,
  key: createHash('sha256').update(`adjudicate:${seed}:${item.id}`).digest('hex'),
}));
keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

const picked = keyed.slice(0, Math.round(sample.length * fraction));
picked.sort((a, b) => a.index - b.index);

const worksheetPath = join(dir, 'adjudication.md');
if (
  existsSync(worksheetPath) &&
  /^ANSWER:\s*[NLSnls]\s*$/m.test(readFileSync(worksheetPath, 'utf8'))
) {
  console.error(`${worksheetPath} already has answers — refusing to overwrite your work.`);
  process.exit(1);
}

const lines = [
  `# Gate 1 — blind adjudication worksheet (gate1-v2)`,
  ``,
  `${picked.length} items, drawn deterministically (seed ${seed}).`,
  `Machine labels are deliberately NOT shown — seeing them would anchor you and`,
  `turn kappa into a measure of suggestibility rather than agreement.`,
  ``,
  `**Edit this file.** Put one letter after each \`ANSWER:\` below — \`N\`, \`L\`, or \`S\`.`,
  `Nothing else to open; the report reads this same file.`,
  ``,
  `| label | meaning | test |`,
  `|---|---|---|`,
  `| \`N\` | not-a-kb-question | asking for something to be *done*, not *recalled*. Ambiguous → N. |`,
  `| \`L\` | lookup | seeks recorded information; one hop; text match would find it |`,
  `| \`S\` | structural | needs relations, time or provenance — \`rg\` could not tell the current answer from a superseded one |`,
  ``,
  `Full definitions and edge cases: \`tests/benchmarks/gate1-v2/rubric.md\`.`,
  ``,
  `Then run: \`node tools/gate1/report.js\``,
  ``,
  `---`,
  ``,
];

for (const { index, item } of picked) {
  const text = item.text.replace(/\s+/g, ' ').trim();
  const shown = text.length > 600 ? `${text.slice(0, 600)} …[+${text.length - 600} chars]` : text;
  lines.push(`### ${index}`, ``, `> ${shown}`, ``, `ANSWER:`, ``);
}

writeFileSync(worksheetPath, lines.join('\n'));

console.log(`blind sample: ${picked.length} of ${sample.length} (${fraction * 100}%)`);
console.log(`\nwrote ${worksheetPath}`);
console.log(`\nEdit that one file — put N, L or S after each ANSWER:`);
console.log(`Then run: node tools/gate1/report.js`);
