#!/usr/bin/env node
/**
 * gate2 corpus builder — run real content through the real `format` path.
 *
 * The corpus is engram's own ADRs. They are real prose with genuine relationships
 * (some supersede, some refine, some merely cite) and, crucially, a human can check
 * every judgement against the document itself — which is what makes them
 * adjudicable at all.
 *
 * The relation calls in JUDGEMENTS are the AGENT's, made by reading each ADR. That
 * is exactly what Gate 2 measures. They go through `format` rather than being
 * written directly, so the edges are produced by the shipped write path.
 *
 * LIMITATION (gate2-v1 protocol): the trigger is synthetic. These were produced in
 * a batch over existing documents, not in the flow of live work.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { format } from '../../dist/index.js';
import { memoryFileStore, fixedClock } from '../../dist/index.js';

/** Agent judgements: for each ADR, what it contains and how it relates. */
const JUDGEMENTS = [
  { id: '0002', container: 'decisions', sources: [] },
  { id: '0003', container: 'decisions', sources: [] },
  { id: '0019', container: 'decisions', sources: [] },
  { id: '0020', container: 'decisions', supersedes: ['0002-okf-v01-format'], sources: [] },
  { id: '0021', container: 'decisions', sources: ['0019-node-edge-primitives'] },
  {
    id: '0022',
    container: 'decisions',
    supersedes: ['0003-standard-links-not-wikilinks'],
    sources: ['0019-node-edge-primitives'],
  },
  { id: '0023', container: 'decisions', sources: ['0006-auto-generated-indexes'] },
  { id: '0024', container: 'decisions', sources: [] },
  { id: '0025', container: 'decisions', sources: [] },
  { id: '0026', container: 'decisions', sources: ['0008-write-hook-mechanism'] },
  { id: '0027', container: 'decisions', sources: ['0022-relations-in-frontmatter'] },
  { id: '0028', container: 'decisions', sources: ['0021-identity-slug-path-aliases'] },
  { id: '0029', container: 'decisions', sources: ['0023-structure-tree-plus-views'] },
  { id: '0030', container: 'decisions', sources: [] },
  { id: '0031', container: 'decisions', sources: ['0027-write-time-extraction-only'] },
  {
    id: '0032',
    container: 'decisions',
    sources: ['0020-adopt-okf-v02', '0024-three-tier-dependency-inversion'],
  },
  { id: '0033', container: 'decisions', sources: ['0026-validation-gates-promotion'] },
  { id: '0034', container: 'decisions', sources: ['0030-boundaries-are-repos'] },
  {
    id: '0035',
    container: 'decisions',
    sources: ['0019-node-edge-primitives', '0024-three-tier-dependency-inversion'],
  },
  {
    id: '0036',
    container: 'decisions',
    sources: ['0035-user-memory-second-store', '0027-write-time-extraction-only'],
  },
  { id: '0037', container: 'decisions', sources: ['0031-evidence-gates-before-graph'] },
  {
    id: '0038',
    container: 'decisions',
    sources: ['0035-user-memory-second-store', '0036-intelligence-loop'],
  },
  { id: '0039', container: 'decisions', sources: ['0007-typescript-single-package'] },
  {
    id: '0040',
    container: 'decisions',
    sources: ['0031-evidence-gates-before-graph', '0034-encryption-is-a-substrate-concern'],
  },
];

const specsDir = join(process.cwd(), 'specs', 'decisions');
const outDir = join(process.cwd(), '.gate2');
mkdirSync(outDir, { recursive: true });

const { readdirSync } = await import('node:fs');
const files = readdirSync(specsDir).filter((f) => /^\d{4}-.*\.md$/.test(f));
const byNumber = new Map(files.map((f) => [f.slice(0, 4), f]));

const store = memoryFileStore();
const clock = fixedClock('2026-08-12T12:00:00.000Z');
const edges = [];

for (const j of JUDGEMENTS) {
  const file = byNumber.get(j.id);
  if (file === undefined) continue;
  const content = readFileSync(join(specsDir, file), 'utf8');
  const slug = file.replace(/\.md$/, '');

  const result = await format(
    content,
    {
      by: 'claude-opus-5',
      generated: true,
      id: slug,
      container: j.container,
      supersedes: j.supersedes ?? [],
      sources: j.sources ?? [],
    },
    { files: store, clock },
  );

  if (result.outcome !== 'applied') {
    console.error(`skipped ${file}: ${result.reason}`);
    continue;
  }
  // Context: the ADR's title and its Decision heading, which is what a human needs
  // to judge whether the relation is right.
  const title = content.split('\n')[0].replace(/^#\s*/, '');
  for (const e of result.edges) {
    edges.push({ from: e.from, kind: e.kind, to: e.to, context: title });
  }
}

writeFileSync(join(outDir, 'corpus.jsonl'), edges.map((e) => JSON.stringify(e)).join('\n') + '\n');
const byKind = {};
for (const e of edges) byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
console.log(`formatted ${JUDGEMENTS.length} ADRs through the real format path`);
console.log(`edges: ${edges.length}  ${JSON.stringify(byKind)}`);
console.log(`\nwrote ${join(outDir, 'corpus.jsonl')}`);
