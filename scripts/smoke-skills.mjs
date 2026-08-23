/**
 * Scaffold a real vault with the BUILT binary and check the skill surface a person
 * would actually see.
 *
 * Seven bugs in this project were invisible to the suite and obvious the moment
 * someone ran the artifact — BUG-004's installed binary that silently did nothing,
 * BUG-008's reindex that indexed its own output, BUG-009's flag that vanished. The
 * suite cannot see the gap between "the function works" and "a person can use it",
 * so this runs the binary and looks at the files.
 *
 * Where `claude` is on the PATH, the plugin is checked with the **official**
 * validator rather than engram's opinion of what a valid plugin looks like.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const built = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.js');

let failed = false;
const fail = (m) => {
  console.error(`✖ ${m}`);
  failed = true;
};
const pass = (m) => console.log(`✓ ${m}`);
const skip = (m) => console.log(`· ${m}`);

const engram = (args, cwd) => {
  try {
    return execFileSync('node', [built, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
};

const vault = mkdtempSync(join(tmpdir(), 'engram-skills-'));
engram(['init'], vault);

// A skill the user wrote, in the source directory that is theirs.
mkdirSync(join(vault, 'engram/skills/literature-review'), { recursive: true });
writeFileSync(
  join(vault, 'engram/skills/literature-review/SKILL.md'),
  [
    '---',
    'name: literature-review',
    'description: Read several sources and emit one synthesis. Use when the shape of an argument matters.',
    'metadata:',
    '  engram-uses: capture format link',
    '---',
    '',
    'Mine.',
    '',
  ].join('\n'),
);

const first = engram(['reindex'], vault);
const second = engram(['reindex'], vault);

const PLUGIN = join(vault, '.claude/skills/engram');

// ---------------------------------------------------------------- the plugin

if (existsSync(join(PLUGIN, '.claude-plugin/plugin.json'))) {
  pass('a plugin manifest is written where the host auto-loads it');
} else {
  fail('no plugin manifest — /engram:format cannot exist');
}

try {
  const manifest = JSON.parse(readFileSync(join(PLUGIN, '.claude-plugin/plugin.json'), 'utf8'));
  if (manifest.name === 'engram' && manifest.version && manifest.description) {
    pass('the manifest carries name, version and description');
  } else {
    fail(`the manifest is missing fields the validator asks for: ${JSON.stringify(manifest)}`);
  }
} catch (e) {
  fail(`the manifest is not valid JSON: ${e.message}`);
}

// The documented common mistake: skills belong at the plugin root, never inside
// .claude-plugin/, which holds plugin.json and nothing else.
if (existsSync(join(PLUGIN, 'skills/format/SKILL.md'))) {
  pass('operations render inside the plugin, so they namespace as /engram:<name>');
} else {
  fail('no operation skills in the plugin — the whole invocation path is missing');
}
if (!existsSync(join(PLUGIN, '.claude-plugin/skills'))) {
  pass('nothing but plugin.json is inside .claude-plugin/');
} else {
  fail('skills are inside .claude-plugin/ — the host will not load them');
}

// ------------------------------------------------------------ yours vs engram's

if (existsSync(join(vault, '.claude/skills/literature-review/SKILL.md'))) {
  pass('a skill you wrote renders unprefixed, beside the plugin');
} else {
  fail('your own skill was not rendered');
}
if (!existsSync(join(PLUGIN, 'skills/literature-review/SKILL.md'))) {
  pass("your skill is not swept into engram's namespace");
} else {
  fail("your skill was rendered inside engram's plugin — the distinction is lost");
}
if (existsSync(join(vault, '.gemini/skills/engram-format/SKILL.md'))) {
  pass('where a host has no plugin concept, engram prefixes its own instead');
} else {
  fail('no prefixed render for a host without plugins');
}

// ------------------------------------------------------------------ idempotence

const nodes = (out) => (out.match(/(\d+) node/) ?? [])[1];
if (nodes(first) !== undefined && nodes(first) === nodes(second)) {
  pass(`reindex is idempotent with skills present (${nodes(first)} nodes both runs)`);
} else {
  fail(`reindex node count changed between runs: ${nodes(first)} then ${nodes(second)}`);
}

const index = readFileSync(join(vault, 'index.md'), 'utf8');
if (!index.includes('SKILL.md') && !index.includes('literature-review')) {
  pass('no rendered skill is indexed as a note');
} else {
  fail('a rendered skill was indexed as knowledge — BUG-008, a third time');
}

// --------------------------------------------------------------- the contract

const contract = readFileSync(join(vault, 'AGENTS.md'), 'utf8');
if (contract.includes('## How to run these') && contract.includes('/engram:format')) {
  pass('the contract says how to invoke an operation, not just that it exists');
} else {
  fail('the contract still describes capabilities without saying how to reach them');
}

// ------------------------------------------------------------ doctor is quiet

const health = engram(['doctor'], vault);
const noise = health.split('\n').filter((l) => l.includes('[skill'));
if (noise.length === 0) {
  pass('doctor reports no skill problems on a freshly rendered vault');
} else {
  fail(`doctor complains about a vault it just rendered:\n    ${noise.join('\n    ')}`);
}

// --------------------------------------------- the host's own validator, if present

try {
  const out = execFileSync('claude', ['plugin', 'validate', PLUGIN], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (out.includes('Validation passed')) pass('`claude plugin validate` accepts the rendered plugin');
  else fail(`the official validator rejected the plugin:\n${out}`);
} catch (e) {
  const out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  if (out.includes('Validation passed')) {
    pass('`claude plugin validate` accepts the rendered plugin');
  } else if (e.code === 'ENOENT') {
    skip('claude is not on the PATH — skipped the official plugin validator');
  } else {
    fail(`the official validator rejected the plugin:\n${out}`);
  }
}

console.log(
  failed
    ? '\nskills smoke FAILED'
    : '\nskills smoke passed — the rendered skill surface is what a person would see.' +
        '\nStill manual: that an agent session actually lists /engram:format.',
);
if (failed) process.exitCode = 1;
