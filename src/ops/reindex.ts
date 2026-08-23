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
import { loadGuardrails, loadStructureId } from '../policy/config.js';
import { readNode } from '../format/registry.js';
import { generateAgentsMd } from '../surface/agents-md.js';
import { writeContracts, type AdapterResult } from '../surface/adapters.js';
import {
  renderSkills,
  skillIgnoreLines,
  spliceIgnore,
  type SkillRenderResult,
} from '../surface/render-skills.js';
import { discoverSkills } from '../policy/skills.js';
import { generateAll } from '../views/generate.js';
import { walk, type WalkFinding } from './walk.js';

export interface ReindexResult {
  /** Which agent contract files were rewritten, and which were merged into. */
  contracts: AdapterResult;
  /** Which skills were rendered, left alone, or orphaned. */
  skills: SkillRenderResult;
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
  // The contract must describe the rules actually in force. Rendering the
  // built-in defaults meant AGENTS.md never mentioned a vault's propose-only
  // paths — which read as "there are none" rather than "engram cannot see them".
  const { config: guardrails } = await loadGuardrails(files);
  const contract = generateAgentsMd(guardrails, await loadStructureId(files));
  await files.write('/AGENTS.md', contract);
  // ADR-0017: every agent reads only its own file, so each gets the contract in
  // full — regenerated here from the one source, so no copy can drift.
  const contracts = await writeContracts(files, contract);
  written.push('/AGENTS.md', ...contracts.written, ...contracts.merged);

  // Skills reach an agent the same way the contract does: rendered into the file it
  // actually reads. A skill only engram can see is a skill nobody can run — which is
  // what FEAT-009 reported.
  const discovered = await discoverSkills(files);
  for (const e of discovered.errors) warnings.push(`skill ${e.name}: ${e.reason}`);
  const skills = await renderSkills(files, discovered.skills);
  written.push(...skills.written);

  // Derived state is never committed (ADR-0029). The block is delimited so engram
  // owns what is between the markers and nothing else — `.claude/` also holds
  // settings and commands that are the user's.
  const gitignore = (await files.read('/.gitignore')) ?? '';
  const merged = spliceIgnore(gitignore, skillIgnoreLines(discovered.skills));
  if (merged !== gitignore) {
    await files.write('/.gitignore', merged);
    written.push('/.gitignore');
  }

  return {
    written,
    contracts,
    skills,
    counts: { nodes: nodes.length, edges: edges.length },
    findings: walked.findings,
    warnings,
  };
}
