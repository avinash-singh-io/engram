/**
 * What the Obsidian commands actually do.
 *
 * Separated from `main.ts` so it is testable without Obsidian: every function here
 * takes a `FileStore` and a `Clock` and returns a string for the caller to show.
 * `main.ts` is then a shell that wires `app.vault.adapter` to these and turns the
 * strings into `Notice`s — which is the only part that cannot be tested here.
 *
 * There is no logic in this file that is not translation. The operations already
 * exist and are already tested; a plugin that reimplemented any of them would be
 * the second contract that drifts (ADR-0011's lesson, in a new place).
 */

import type { Clock, FileStore } from '../src/core/ports.js';
import { capture } from '../src/ops/capture.js';
import { format } from '../src/ops/format.js';
import {
  approve,
  basisOf,
  listProposals,
  rejectProposal,
  type Proposal,
} from '../src/ops/queue.js';
import { loadGuardrails } from '../src/policy/config.js';

export interface EngramDeps {
  files: FileStore;
  clock: Clock;
  /** Who is asserting. A human in Obsidian, so not `agent`. */
  by: string;
}

/**
 * Capture never rejects (ADR-0026), so this returns a message and never an error
 * shape. In an editor that matters more than anywhere else: the cost of losing a
 * half-formed thought to a validation failure is the thought.
 */
export async function captureCommand(content: string, deps: EngramDeps): Promise<string> {
  const { path, bytes } = await capture(content, deps);
  return `captured ${bytes} bytes → ${path}`;
}

export interface FormatOptions {
  title?: string;
  id?: string;
  container?: string;
  path?: string;
}

/** Format the selection or note into a validated node — or queue it for review. */
export async function formatCommand(
  content: string,
  options: FormatOptions,
  deps: EngramDeps,
): Promise<string> {
  const { config: guardrails } = await loadGuardrails(deps.files);
  const result = await format(
    content,
    { ...options, by: deps.by },
    { files: deps.files, clock: deps.clock, guardrails },
  );

  switch (result.outcome) {
    case 'applied':
      return `${result.node.id} → ${result.node.path}`;
    case 'queued':
      return `held for review by ${result.rule} — open the Engram queue to approve it`;
    default:
      return `rejected [${result.rule}]: ${result.reason}`;
  }
}

export interface QueueItem {
  proposal: Proposal;
  /** True when the target changed since the proposal was made — approve will refuse. */
  stale: boolean;
  /** What the target holds now, for the diff. `null` when it does not exist yet. */
  current: string | null;
}

/** Everything the panel needs to render, resolved in one pass. */
export async function pendingQueue(deps: EngramDeps): Promise<QueueItem[]> {
  const out: QueueItem[] = [];
  for (const proposal of await listProposals(deps.files)) {
    out.push({
      proposal,
      stale: (await basisOf(deps.files, proposal.target)) !== proposal.basis,
      current: await deps.files.read(proposal.target),
    });
  }
  return out;
}

/**
 * Approve a proposal from the panel.
 *
 * This is one of the two places in engram where approval exists at all — here and
 * the CLI (ADR-0042). It is a human clicking a button in their own editor, which
 * is exactly the act `propose-only` defers to.
 */
export async function approveCommand(id: string, deps: EngramDeps): Promise<string> {
  const { config: guardrails } = await loadGuardrails(deps.files);
  const result = await approve(id, guardrails, deps);

  switch (result.outcome) {
    case 'applied':
      return `applied → ${result.proposal.target}`;
    case 'stale':
      return `${result.proposal.target} changed since this was proposed. Engram will not merge — review the file and re-run the change.`;
    case 'rejected':
      return `still refused [${result.rule}]: ${result.reason}`;
    case 'resolved':
      return `already ${result.proposal.status}`;
    default:
      return `no such proposal: ${result.id}`;
  }
}

export async function rejectCommand(id: string, note: string, deps: EngramDeps): Promise<string> {
  const result = await rejectProposal(id, note, deps);
  switch (result.outcome) {
    case 'rejected':
      return `discarded — ${result.proposal.target} was not touched`;
    case 'resolved':
      return `already ${result.proposal.status}`;
    default:
      return `no such proposal: ${result.id}`;
  }
}
