/**
 * The approval queue — the gate's QUEUE outcome, made durable (ADR-0042).
 *
 * `propose-only` defers a change instead of refusing it; this is where the deferred
 * change waits. Two properties carry the whole design:
 *
 * **Approve and reject are human-only.** Nothing here is exposed as an MCP tool.
 * An agent that could approve its own proposal has converted a refusal into a
 * retry, and every guardrail behind `propose-only` becomes advisory. Agents may
 * read the queue — being told what is pending is what makes the deferral legible
 * to the thing that was deferred.
 *
 * **A proposal is applied only against the vault it was proposed against.** It
 * carries the entire content it would write, so a target that moved on in the
 * meantime would be clobbered — ADR-0028's corruption failure, reintroduced by the
 * review mechanism. `basis` is the target's hash at propose time; approve
 * recomputes it and refuses on mismatch. **Engram refuses; it does not merge.**
 *
 * Entries are markdown with frontmatter, and resolved ones are **kept**, not
 * deleted: the queue doubles as the record of what an agent wanted to do and what
 * a human decided. Deleting them would also need a `delete` on the `FileStore`
 * port, which exists on purpose without one — the same instinct as the `no-delete`
 * guardrail.
 */

import type { Clock, FileStore } from '../core/ports.js';
import { parseFrontmatter, readNode, withTrailingNewline } from '../format/registry.js';
import { validate, type Change } from '../gate.js';
import type { GuardrailConfig } from '../policy/guardrails.js';

export const QUEUE_DIR = '/.engram/queue';

/** Recorded when the target did not exist at propose time. */
export const ABSENT = 'absent';

export type ProposalStatus = 'pending' | 'approved' | 'rejected';

export interface Proposal {
  id: string;
  /** Path the change would write. */
  target: string;
  /** The guardrail that deferred it. Approve satisfies exactly this one. */
  rule: string;
  reason: string;
  /** SHA-256 of the target at propose time, or `ABSENT`. */
  basis: string;
  by: string;
  at: string;
  status: ProposalStatus;
  /** Who resolved it, and when. */
  resolvedBy?: string;
  resolvedAt?: string;
  /** Why it was rejected, when a human said. */
  note?: string;
  /** Exactly what would be written. */
  content: string;
}

/**
 * SHA-256 via **Web Crypto**, not `node:crypto`.
 *
 * This runs inside the Obsidian plugin, including on mobile, where the node
 * builtin does not exist. `crypto.subtle` is a global in Node 20+ and in every
 * Obsidian webview.
 */
export async function digest(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** What the target hashes to right now — or `ABSENT` if there is no target yet. */
export async function basisOf(files: FileStore, target: string): Promise<string> {
  const current = await files.read(target);
  return current === null ? ABSENT : digest(current);
}

const slugOf = (target: string): string =>
  target
    .replace(/^\//, '')
    .replace(/\.md$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'proposal';

const pathOf = (id: string): string => `${QUEUE_DIR}/${id}.md`;

/**
 * Serialize a proposal.
 *
 * The body is the proposed content **verbatim**, including its own frontmatter.
 * `parseFrontmatter` closes on the first delimiter pair, so the nesting round-trips
 * — and the alternative, fencing it, would break on content containing a fence.
 */
function serialize(p: Proposal): string {
  const fm = [
    '---',
    `id: ${p.id}`,
    `target: ${p.target}`,
    `rule: ${p.rule}`,
    `reason: ${p.reason}`,
    `basis: ${p.basis}`,
    `by: ${p.by}`,
    `at: ${p.at}`,
    `status: ${p.status}`,
    ...(p.resolvedBy === undefined ? [] : [`resolvedBy: ${p.resolvedBy}`]),
    ...(p.resolvedAt === undefined ? [] : [`resolvedAt: ${p.resolvedAt}`]),
    ...(p.note === undefined ? [] : [`note: ${p.note}`]),
    '---',
    '',
  ].join('\n');
  return withTrailingNewline(fm + p.content);
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function deserialize(raw: string, fallbackId: string): Proposal | null {
  const parsed = parseFrontmatter(raw);
  if (parsed.frontmatter === null) return null;
  const fm = parsed.frontmatter;
  const status = str(fm.status);
  return {
    id: str(fm.id) || fallbackId,
    target: str(fm.target),
    rule: str(fm.rule),
    reason: str(fm.reason),
    basis: str(fm.basis),
    by: str(fm.by),
    at: str(fm.at),
    status: status === 'approved' || status === 'rejected' ? (status as ProposalStatus) : 'pending',
    ...(fm.resolvedBy === undefined ? {} : { resolvedBy: str(fm.resolvedBy) }),
    ...(fm.resolvedAt === undefined ? {} : { resolvedAt: str(fm.resolvedAt) }),
    ...(fm.note === undefined ? {} : { note: str(fm.note) }),
    // The reader strips one trailing newline and the writer adds one back; that
    // pairing is what makes the round-trip exact (the Phase 9 lesson).
    content: withTrailingNewline(parsed.body),
  };
}

export interface QueueDeps {
  files: FileStore;
  clock: Clock;
  by: string;
}

/** Hold a change for review. Writes nothing to the target. */
export async function propose(
  change: Change,
  fired: { rule: string; reason: string },
  deps: QueueDeps,
): Promise<Proposal> {
  const at = deps.clock.now();
  const basis = await basisOf(deps.files, change.path);
  const id = `${slugOf(change.path)}-${(await digest(`${at}${change.content}`)).slice(0, 8)}`;

  const proposal: Proposal = {
    id,
    target: change.path,
    rule: fired.rule,
    reason: fired.reason,
    basis,
    by: deps.by,
    at,
    status: 'pending',
    content: change.content,
  };

  await deps.files.write(pathOf(id), serialize(proposal));
  return proposal;
}

/** Every proposal, newest first. Pending only unless `all` is set. */
export async function listProposals(
  files: FileStore,
  options: { all?: boolean } = {},
): Promise<Proposal[]> {
  const out: Proposal[] = [];
  for (const path of await files.list()) {
    if (!path.startsWith(`${QUEUE_DIR}/`) || !path.endsWith('.md')) continue;
    const raw = await files.read(path);
    if (raw === null) continue;
    const p = deserialize(raw, path.slice(`${QUEUE_DIR}/`.length, -'.md'.length));
    if (p === null) continue;
    if (options.all !== true && p.status !== 'pending') continue;
    out.push(p);
  }
  return out.sort((a, b) => (a.at === b.at ? a.id.localeCompare(b.id) : b.at.localeCompare(a.at)));
}

export async function showProposal(files: FileStore, id: string): Promise<Proposal | null> {
  const raw = await files.read(pathOf(id));
  return raw === null ? null : deserialize(raw, id);
}

export type ApproveResult =
  | { outcome: 'applied'; proposal: Proposal }
  | { outcome: 'missing'; id: string }
  | { outcome: 'resolved'; proposal: Proposal }
  /** The target changed after the proposal was made. Nothing is written. */
  | { outcome: 'stale'; proposal: Proposal; expected: string; found: string }
  /** A rule other than the one that deferred it refuses. Still queued. */
  | { outcome: 'rejected'; proposal: Proposal; rule: string; reason: string };

/**
 * Apply a proposal, if the vault still looks the way it did when it was made.
 *
 * The change is replayed **through the gate**, not written directly — approving
 * satisfies the one rule that deferred it and nothing else. A proposal that also
 * trips `require-sources` is still refused, by design: the human approved a
 * deferral, not an exemption.
 */
export async function approve(
  id: string,
  guardrails: GuardrailConfig,
  deps: QueueDeps,
): Promise<ApproveResult> {
  const proposal = await showProposal(deps.files, id);
  if (proposal === null) return { outcome: 'missing', id };
  if (proposal.status !== 'pending') return { outcome: 'resolved', proposal };

  const found = await basisOf(deps.files, proposal.target);
  if (found !== proposal.basis) {
    return { outcome: 'stale', proposal, expected: proposal.basis, found };
  }

  const { node, edges } = readNode(proposal.content, proposal.target);
  const change: Change = {
    path: proposal.target,
    node,
    edges,
    content: proposal.content,
  };

  const verdict = validate(change, {
    // The rule that deferred it is the one the human just satisfied. Every other
    // rule still runs — approval is not a bypass.
    config: { ...guardrails, enabled: guardrails.enabled.filter((n) => n !== proposal.rule) },
    ctx: { existing: [], edges: [], writtenThisRun: 0 },
  });

  if (verdict.outcome !== 'apply') {
    return {
      outcome: 'rejected',
      proposal,
      rule: verdict.outcome === 'reject' ? verdict.rule : verdict.rule,
      reason: verdict.reason,
    };
  }

  await deps.files.write(proposal.target, proposal.content);

  const resolved: Proposal = {
    ...proposal,
    status: 'approved',
    resolvedBy: deps.by,
    resolvedAt: deps.clock.now(),
  };
  await deps.files.write(pathOf(id), serialize(resolved));
  return { outcome: 'applied', proposal: resolved };
}

export type RejectResult =
  | { outcome: 'rejected'; proposal: Proposal }
  | { outcome: 'missing'; id: string }
  | { outcome: 'resolved'; proposal: Proposal };

/** Discard a proposal, recording why. The target is never touched. */
export async function rejectProposal(
  id: string,
  note: string,
  deps: QueueDeps,
): Promise<RejectResult> {
  const proposal = await showProposal(deps.files, id);
  if (proposal === null) return { outcome: 'missing', id };
  if (proposal.status !== 'pending') return { outcome: 'resolved', proposal };

  const resolved: Proposal = {
    ...proposal,
    status: 'rejected',
    resolvedBy: deps.by,
    resolvedAt: deps.clock.now(),
    ...(note.trim() === '' ? {} : { note }),
  };
  await deps.files.write(pathOf(id), serialize(resolved));
  return { outcome: 'rejected', proposal: resolved };
}
