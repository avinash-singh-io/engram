/**
 * Scaffold a real vault with the BUILT binary and check the opencode surface a
 * person would actually see — skills flat in `.opencode/skills/`, commands in
 * `.opencode/commands/`.
 *
 * Same reason as smoke-skills: the suite cannot see the gap between "the function
 * works" and "a person can use it", so this runs the built binary and looks at
 * the files. Phase 19's whole premise was a surface that existed for Claude Code
 * and silently not for opencode; this smoke is what keeps that gap visible.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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

const engram = (args, cwd) => {
  try {
    return execFileSync('node', [built, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
};

const OPS = ['init', 'capture', 'format', 'link', 'reindex', 'doctor'];

const vault = mkdtempSync(join(tmpdir(), 'engram-opencode-'));
engram(['init'], vault);

// A skill the user wrote, so the unprefixed render is exercised against the
// built binary too, not only in the suite.
mkdirSync(join(vault, 'engram/skills/literature-review'), { recursive: true });
writeFileSync(
  join(vault, 'engram/skills/literature-review/SKILL.md'),
  [
    '---',
    'name: literature-review',
    'description: Read several sources and emit one synthesis.',
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

// ------------------------------------------------------------------- the skills

for (const op of OPS) {
  const path = join(vault, `.opencode/skills/engram-${op}/SKILL.md`);
  if (existsSync(path)) {
    const raw = readFileSync(path, 'utf8');
    // The standard requires name to match the directory — the prefix must be in
    // both or the rendered skill is invalid rather than merely oddly named.
    if (raw.includes(`name: engram-${op}`)) {
      pass(`operation skill renders flat as .opencode/skills/engram-${op}/`);
    } else {
      fail(`engram-${op} renders with a name that does not match its directory`);
    }
  } else {
    fail(`no skill render for ${op} — an agent session will never see it`);
  }
}

if (existsSync(join(vault, '.opencode/skills/literature-review/SKILL.md'))) {
  pass('a skill you wrote renders unprefixed beside them');
} else {
  fail('your own skill was not rendered into .opencode/skills/');
}

// ------------------------------------------------------------------ the commands

for (const op of OPS) {
  const path = join(vault, `.opencode/commands/engram-${op}.md`);
  if (!existsSync(path)) {
    fail(`no command render for ${op} — /engram-${op} cannot exist`);
    continue;
  }
  const raw = readFileSync(path, 'utf8');
  const problems = [];
  if (!raw.startsWith('---\ndescription: ')) problems.push('no description frontmatter');
  if (!raw.includes('$ARGUMENTS')) problems.push('no $ARGUMENTS passthrough');
  if (!raw.includes('engram-managed')) problems.push('no provenance marker');
  if (problems.length === 0) pass(`/engram-${op} renders with description, \$ARGUMENTS, marker`);
  else fail(`/engram-${op}: ${problems.join('; ')}`);
}

// ------------------------------------------------------------------- idempotence

const nodes = (out) => (out.match(/(\d+) node/) ?? [])[1];
if (nodes(first) !== undefined && nodes(first) === nodes(second)) {
  pass(`reindex is idempotent with opencode renders present (${nodes(first)} nodes both runs)`);
} else {
  fail(`reindex node count changed between runs: ${nodes(first)} then ${nodes(second)}`);
}

const index = readFileSync(join(vault, 'index.md'), 'utf8');
if (!index.includes('.opencode') && !index.includes('engram-capture')) {
  pass('no rendered command or skill is indexed as a note');
} else {
  fail("a rendered opencode file was indexed as knowledge — BUG-008's shape again");
}

// -------------------------------------------------------------------- gitignore

const ignore = readFileSync(join(vault, '.gitignore'), 'utf8');
if (ignore.includes('/.opencode/commands/engram-*.md')) {
  pass('the managed gitignore block covers rendered commands');
} else {
  fail('rendered commands are not gitignored — derived state would be committed');
}

// ---------------------------------------------------------------- doctor quiet

const health = engram(['doctor'], vault);
const noise = health.split('\n').filter((l) => l.toLowerCase().includes('opencode'));
if (!noise.some((l) => l.includes('[warn') || l.includes('[fail'))) {
  pass('doctor reports no opencode problems on a freshly rendered vault');
} else {
  fail(`doctor complains about a vault it just rendered:\n    ${noise.join('\n    ')}`);
}

console.log(
  failed
    ? '\nopencode smoke FAILED'
    : '\nopencode smoke passed — the rendered opencode surface is what a person would see.' +
        '\nStill manual: a real `opencode` TUI session listing the skills and /engram-* commands' +
        ' (phase-19 G4 records it).',
);
if (failed) process.exitCode = 1;
