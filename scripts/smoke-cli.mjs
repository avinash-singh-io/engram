/**
 * Run the BUILT CLI the way an installed user does — through a bin symlink whose
 * name is not `cli.js`.
 *
 * This is the exact case that shipped broken. The entry guard was
 * `argv[1].endsWith('cli.js')`, true when you run `node dist/cli.js` and false for
 * every real install, because npm puts a symlink named `engram` on the PATH. The
 * installed CLI ran nothing and exited 0. Every test passed, because tests import
 * `main()` directly and never invoke the binary.
 *
 * So this smoke does not call `main()`. It spawns a symlink.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const built = join(root, 'dist', 'cli.js');

let failed = false;
const fail = (m) => {
  console.error(`✖ ${m}`);
  failed = true;
};
const pass = (m) => console.log(`✓ ${m}`);

const run = (bin, args, cwd) => {
  try {
    return execFileSync('node', [bin, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
};

// The npm layout: a symlink named `engram`, not `cli.js`.
const binDir = mkdtempSync(join(tmpdir(), 'engram-bin-'));
const asInstalled = join(binDir, 'engram');
symlinkSync(built, asInstalled);

const help = run(asInstalled, ['--help']);
if (help.includes('usage:')) pass('the installed bin name runs and prints usage');
else fail('the installed bin name produced no output — the entry guard is wrong again');

const vault = mkdtempSync(join(tmpdir(), 'engram-vault-'));
if (run(asInstalled, ['init'], vault).includes('created')) pass('init works through the symlink');
else fail('init produced no output through the symlink');

const captured = run(asInstalled, ['capture', 'a thought'], vault);
if (captured.includes('captured')) pass('capture works through the symlink');
else fail('capture produced no output through the symlink');

if (run(asInstalled, ['doctor'], vault).includes('engram doctor')) pass('doctor works through the symlink');
else fail('doctor produced no output through the symlink');

if (run(asInstalled, ['queue'], vault).includes('nothing pending')) pass('queue works through the symlink');
else fail('queue produced no output through the symlink');

console.log(failed ? '\nCLI smoke FAILED' : '\nCLI smoke passed — the built binary works as installed.');
if (failed) process.exitCode = 1;
