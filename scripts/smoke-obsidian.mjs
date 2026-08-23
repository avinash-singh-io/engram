/**
 * Read frontmatter the way Obsidian actually writes it, through the BUILT binary.
 *
 * BUG-011 shipped in every v2 release and no test could see it, because every test
 * fed the parser frontmatter engram itself had written. The gap was between "the
 * parser handles our format" and "the parser handles the files a person's editor
 * produces" — and only a corpus taken from a real vault closes it.
 *
 * The fixtures below are verbatim: the reporting user's note as Obsidian left it
 * after they edited one property, and a tldraw note from the same vault.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'dist', 'cli.js');

let failed = false;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${label}${ok || detail === '' ? '' : `\n    ${detail}`}`);
  if (!ok) failed = true;
};

const vault = mkdtempSync(join(tmpdir(), 'engram-obsidian-'));
const run = (...args) =>
  execFileSync(process.execPath, [cli, '--vault', vault, ...args], { encoding: 'utf8' });

run('init');

/** The reporting user's file, exactly as Obsidian rewrote it. */
const GLOSSARY = `---
okf_version: 0.2
id: finance-glossary
timestamp: 2026-08-23T20:28:29.392Z
author: avinash
part-of:
  - finance
---

Terms that come up in the shop's books.
`;

/** Its parent, so the edge resolves and the graph is real rather than dangling. */
const FINANCE = `---
okf_version: 0.2
id: finance
timestamp: 2026-08-23T20:00:00.000Z
author: avinash
---

Money.
`;

/** A tldraw note — the second file the report showed failing. */
const TLDRAW = `---
tags:
  - tldraw
created: 2026-07-05
---

# Tldraw
`;

mkdirSync(join(vault, '3-resources', 'finance'), { recursive: true });
mkdirSync(join(vault, 'tldraw'), { recursive: true });
writeFileSync(join(vault, '3-resources', 'finance', 'finance-glossary.md'), GLOSSARY);
writeFileSync(join(vault, '3-resources', 'finance', 'finance.md'), FINANCE);
writeFileSync(join(vault, 'tldraw', 'Tldraw 2026-07-05 11.42PM.md'), TLDRAW);

// --- the bug itself -------------------------------------------------------

const report = run('doctor');

check(
  'a block sequence no longer reports a parse failure',
  !report.includes('frontmatter did not parse'),
  report.split('\n').filter((l) => l.includes('did not parse')).join('\n'),
);

// The distinction that matters, and one this smoke got wrong on its first run.
// The tldraw note has no `id` at all, so `[path-as-identity]` on it is correct
// behaviour under ADR-0021, not a defect. What must never appear is
// `[identity-lost]` — identity lost *to a parse failure*, which is BUG-011.
check(
  'no note loses its identity to a parse failure',
  !report.includes('[identity-lost]'),
  report.split('\n').filter((l) => l.includes('identity-lost')).join('\n'),
);

check(
  'the note that HAS an id keeps it',
  !report.includes('finance-glossary.md has no slug'),
  report.split('\n').filter((l) => l.includes('finance-glossary')).join('\n'),
);

check(
  'a note that never had an id is still reported, unchanged from ADR-0021',
  report.includes('[path-as-identity]'),
  'the tldraw note has no id; that warning is correct and must not be silenced',
);

check(
  'the part-of edge survives Obsidian having rewritten it',
  /edges: [1-9]/.test(report),
  report.split('\n').find((l) => l.startsWith('nodes:')) ?? '',
);

// --- style is given back, not imposed -------------------------------------

run('link', '3-resources/finance/finance-glossary.md', 'finance', 'part-of');
const after = execFileSync('cat', [join(vault, '3-resources', 'finance', 'finance-glossary.md')], {
  encoding: 'utf8',
});

check(
  'a file written in block style is still block style after engram touches it',
  after.includes('part-of:\n  - finance'),
  after.split('---')[1] ?? after,
);

check('engram did not rewrite it to flow', !after.includes('part-of: ['), after.split('---')[1] ?? '');

// --- idempotence ----------------------------------------------------------

const nodesIn = (out) => Number(/nodes: (\d+)/.exec(out)?.[1] ?? -1);
const first = nodesIn(run('doctor'));
const second = nodesIn(run('doctor'));
check(`node count is stable across runs (${first} then ${second})`, first === second && first > 0);

console.log(
  failed
    ? '\nobsidian smoke FAILED — engram cannot read what a real editor writes.'
    : '\nobsidian smoke passed — the frontmatter a real editor writes reads correctly.',
);
process.exit(failed ? 1 : 0);
