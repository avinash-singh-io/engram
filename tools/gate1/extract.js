#!/usr/bin/env node
/**
 * gate1 extractor — walk stored agent transcripts, emit the Gate 1 corpus.
 *
 * ADR-0037 §1: all roots, not filtered by working directory. Each root gets an
 * OPAQUE id (a hash of its directory name) so the corpus and every report slice
 * carry no `audience`, `kind`, or semantic root name — engram has no concept of
 * vault kinds (ADR-0030).
 *
 * Output is gitignored: it contains the user's raw prompt text.
 *
 *   node tools/gate1/extract.js [--projects <dir>] [--out <dir>]
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { extractFromLines } from './reader.js';

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
}

const projectsDir = arg('--projects', join(homedir(), '.claude', 'projects'));
const outDir = arg('--out', join(process.cwd(), '.gate1'));

if (!existsSync(projectsDir)) {
  console.error(`no transcript directory at ${projectsDir}`);
  process.exit(1);
}

/** Stable across runs and independent of which other roots exist. */
const opaqueId = (name) => `root-${createHash('sha256').update(name).digest('hex').slice(0, 6)}`;

const corpus = [];
const roots = [];
const seen = new Set();

for (const dirName of readdirSync(projectsDir).sort()) {
  const dir = join(projectsDir, dirName);
  let sessions;
  try {
    sessions = readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
  } catch {
    continue; // not a directory, or unreadable
  }
  if (sessions.length === 0) continue;

  const rootId = opaqueId(dirName);
  let prompts = 0;
  for (const file of sessions) {
    const lines = readFileSync(join(dir, file), 'utf8').split('\n');
    for (const p of extractFromLines(lines, { rootId })) {
      // A resumed or compacted session re-stores the same record in a second
      // file. Measured: 1715 records carried only 1194 distinct uuids. These are
      // storage duplicates, not a human re-asking, so they must not inflate n.
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      corpus.push(p);
      prompts++;
    }
  }
  roots.push({ rootId, dirName, sessions: sessions.length, prompts });
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'corpus.jsonl'), corpus.map((p) => JSON.stringify(p)).join('\n') + '\n');

// The rootId -> real directory map stays LOCAL. Reports cite opaque ids only.
writeFileSync(join(outDir, 'roots.local.json'), JSON.stringify(roots, null, 2));

const withPrompts = roots.filter((r) => r.prompts > 0);
console.log(`roots scanned:        ${roots.length}`);
console.log(`roots with prompts:   ${withPrompts.length}`);
console.log(`sessions:             ${roots.reduce((n, r) => n + r.sessions, 0)}`);
console.log(`human prompts (n):    ${corpus.length}`);
console.log(`\nwrote ${join(outDir, 'corpus.jsonl')}`);
console.log(`wrote ${join(outDir, 'roots.local.json')} (local only — never commit)`);
