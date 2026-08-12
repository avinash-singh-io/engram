/**
 * `reindex` — regenerate all derived state.
 *
 * Derived state is never merged, only regenerated (ADR-0029). That makes this the
 * correct resolution for any conflict in a generated file, and it is why
 * idempotence matters: a `reindex` that produced different bytes each run would
 * make "regenerate, never merge" a permanent source of spurious diffs.
 */

import type { Edge, Node } from '../core/model.js';
import type { Clock, FileStore } from '../core/ports.js';
import { DEFAULT_GUARDRAILS } from './doctor.js';
import { readNode } from '../format/registry.js';
import { generateAgentsMd } from '../surface/agents-md.js';
import { generateAll } from '../views/generate.js';
import { walk, type WalkFinding } from './walk.js';

export interface ReindexResult {
  written: string[];
  counts: { nodes: number; edges: number };
  findings: WalkFinding[];
  /** Read warnings surfaced while parsing, e.g. a node with no slug. */
  warnings: string[];
}

export async function reindex(files: FileStore, clock: Clock): Promise<ReindexResult> {
  const walked = await walk(files);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const warnings: string[] = [];

  for (const path of walked.paths) {
    const raw = await files.read(path);
    if (raw === null) continue;
    const result = readNode(raw, path);
    nodes.push(result.node);
    edges.push(...result.edges);
    for (const w of result.warnings) warnings.push(`${path}: ${w}`);
  }

  const written: string[] = [];
  for (const file of generateAll(nodes, edges, clock.now())) {
    await files.write(file.path, file.content);
    written.push(file.path);
  }

  // AGENTS.md is generated but NOT gitignored — see the phase history. It is the
  // entry contract, and an agent arriving at a fresh clone needs it before it can
  // run anything, including `reindex`.
  await files.write('/AGENTS.md', generateAgentsMd(DEFAULT_GUARDRAILS));
  written.push('/AGENTS.md');

  return {
    written,
    counts: { nodes: nodes.length, edges: edges.length },
    findings: walked.findings,
    warnings,
  };
}
