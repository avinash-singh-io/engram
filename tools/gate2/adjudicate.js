#!/usr/bin/env node
/**
 * gate2 adjudication worksheet — one file to read and fill in.
 *
 * Shows the edge and the content it was drawn from, because you cannot judge
 * whether an arrow points the right way without seeing what it was claiming about.
 * Machine judgements are never shown: seeing them would anchor the rater and
 * measure suggestibility rather than accuracy.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv.includes('--dir')
  ? process.argv[process.argv.indexOf('--dir') + 1]
  : join(process.cwd(), '.gate2');

const path = join(dir, 'adjudication.md');
if (existsSync(path) && /^(DIRECTION|PREDICATE):\s*\S/m.test(readFileSync(path, 'utf8'))) {
  console.error(`${path} already has judgements — refusing to overwrite your work.`);
  process.exit(1);
}

const sample = readFileSync(join(dir, 'sample.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const lines = [
  '# Gate 2 — blind edge adjudication (gate2-v1)',
  '',
  `${sample.length} edges. Machine judgements are deliberately NOT shown.`,
  '',
  '**Edit this file.** Fill in both lines under each edge.',
  '',
  '| DIRECTION | meaning |',
  '|---|---|',
  '| `correct` | the arrow points as the content supports |',
  '| `reversed` | right relation, wrong way round |',
  '| `n/a` | direction is meaningless here |',
  '',
  '| PREDICATE | meaning |',
  '|---|---|',
  '| `correct` | the kind matches what the content asserts |',
  '| `wrong-kind` | a different registered kind was meant |',
  '| `should-be-untyped` | mere association; no closed relation is supported |',
  '| `spurious` | no relation at all is supported |',
  '',
  'Full definitions: `tests/benchmarks/gate2-v1/rubric.md`.',
  '',
  'Then run: `node tools/gate2/report.js`',
  '',
  '---',
  '',
];

sample.forEach((e, i) => {
  const excerpt = (e.context ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);
  lines.push(
    `### ${i}`,
    '',
    `\`${e.from}\` **--${e.kind}-->** \`${e.to}\``,
    '',
    `> ${excerpt || '_(no content captured)_'}`,
    '',
    'DIRECTION:',
    'PREDICATE:',
    '',
  );
});

writeFileSync(path, lines.join('\n'));
console.log(`wrote ${path}`);
console.log(`\nFill in DIRECTION and PREDICATE for each of ${sample.length} edges.`);
console.log(`Then run: node tools/gate2/report.js`);
