# 0042 — The approval queue's trust boundary

> **Status**: accepted
> **Date**: 2026-08-13
> **Deciders**: Avinash Kumar Singh
> **Builds on**: [ADR-0034](0034-encryption-is-a-substrate-concern.md),
> [ADR-0041](0041-mcp-surface-amends-trust-boundary.md) — the trust boundary this
> extends — and [ADR-0028](0028-obsidian-owns-link-rewriting.md), whose corruption
> failure mode the queue could otherwise reintroduce.

## Context

[v2-overview §5](../architecture/v2-overview.md) has always given the write gate
**three** outcomes — APPLY, QUEUE, REJECT. Phase 8 shipped two, and said so in
`gate.ts`'s own header:

> **a change is a proposed diff, not a file write.** That is what makes QUEUE
> possible later

Phase 10 then shipped the guardrail that was supposed to produce the third one, and
made it a refusal:

```
`${change.path} is propose-only — this change needs human review before it applies`
```

The message states that a human must review the change. The behaviour discards it.
There is nothing to review, nothing held anywhere, and §11's "approval queue panel"
has nothing to render.

Building the queue raises two questions that are not implementation details, because
getting either wrong makes the queue worse than not having one.

**Who may resolve a queued proposal?** The queue exists because a human must look at
the change. Engram's agent surface (MCP, ADR-0041) exposes operations as tools; if
approval were another tool, an agent blocked by `propose-only` would queue its change
and then approve it. That is not review — it is a refusal converted into a retry, and
every guardrail sitting behind `propose-only` would silently become advisory.

**What happens when the world moves?** A proposal carries the entire content it would
write. Between proposing and approving, the target may change — by a human in
Obsidian, by an agent with a shell, by a sync from another device. ADR-0028 ranked
exactly this class of collision as the most likely cause of real vault corruption,
and a review mechanism that blindly applies stale content would reintroduce it
through the front door.

## Options Considered

### Approval authority

**Option A — approval is an operation, available on every surface.**
**Pros:** uniform; every surface is a thin translation, which is §11's own principle.
**Cons:** an agent approves its own proposals. The mechanism defeats itself, and it
does so invisibly — the logs show a queue working exactly as designed.

**Option B — approval is human-only: CLI and the Obsidian panel, never MCP.**
**Pros:** the deferral means something. The agent can queue and can read, and the
resolution belongs to the person the deferral was addressed to.
**Cons:** breaks surface uniformity — the first operation-shaped thing that is not on
every surface. An agent genuinely acting for a human cannot complete the round trip
unattended.

**Option C — approval requires a token the human issues per proposal.**
**Pros:** an agent could complete an approved round trip.
**Cons:** an authentication system, in a tool whose security story is that it has
none (ADR-0034). The token would live in the same filesystem as everything it guards.

### Staleness

**Option D — apply the proposal as recorded.** Simple; clobbers newer work.
**Option E — merge the proposal with current content.** Engram would need a conflict
model, a merge algorithm, and an answer for when it fails. All three are large, and
git already owns this problem ([ADR-0004](0004-git-source-of-truth.md)).
**Option F — record what the target looked like; refuse if it changed.**

## Decision

**Option B for authority, Option F for staleness.**

### 1. Approve and reject are human-only

Available on the **CLI** and in the **Obsidian panel**. Not over MCP, not now and not
behind a flag.

Agents may **read** the queue — `engram_queue_list` and `engram_queue_show` exist,
because an agent that cannot see its own pending proposal will simply retry the write
and queue a duplicate. Reading is what makes the deferral legible to the thing that
was deferred.

This is asserted by a test over the real MCP tool list, not left to inspection. It is
the load-bearing property of the whole mechanism, and the cheapest possible way to
lose it is for someone to add the obvious missing tool in six months.

### 2. The queue is state, not an eighth operation

A queued item **is** a pending `format` or `link`. Approving it replays that change
through the gate, with the queueing rule now satisfied — never around the gate, and
never as a raw file write. `OPERATIONS` stays at six (seven when `recall` lands), and
`engram queue` is a management command over gate state rather than a new verb a skill
could sequence.

### 3. A proposal records a `basis`; approve refuses on drift

At propose time the queue records a SHA-256 of the target's current content, or an
explicit absent-marker when the target does not exist yet. At approve time it is
recomputed. On mismatch, **approve refuses**, naming the drift.

**Engram refuses; it does not merge.** The proposal remains queued, the target is
untouched, and the human resolves it with the tools that already own this problem —
their editor, and git. A knowledge base that silently reconciles two versions of a
note is a knowledge base that can lose a thought without telling anyone.

`crypto.subtle`, not `node:crypto`: this path runs inside the Obsidian plugin,
including on mobile, where the node builtin does not exist.

### 4. Queue entries are plain readable markdown

`.engram/queue/<id>.md`, with frontmatter for `target`, `rule`, `basis`, `by` and
`at`, and the proposed content as the body. [§12](../architecture/v2-overview.md)
promises that everything survives engram being uninstalled — `cat`, `rg`, git and
Obsidian keep working. A queue in a database or a binary format would be the single
exception, and it would be the exception precisely where someone most needs to see
what an agent wanted to do.

### What this does NOT solve

**Nothing authenticates the human.** Anyone with filesystem access can approve a
proposal, exactly as anyone with filesystem access can write the target file
directly and skip the queue entirely. The queue constrains the **agent** path, not
the human one, and it is not a permissions system. Stated here so it is a known
limit rather than a gap discovered later.

**An agent with a shell can still write the file.** ADR-0024 and `gate.ts` have said
from the start that the gate mediates two of four write paths. The queue is a
preventive control on the mediated paths; `doctor` remains the detective half. This
ADR does not change that ratio and does not claim to.

## Consequences

- **Surface uniformity is broken deliberately, once.** Approve and reject are the
  first gate-adjacent actions that are not on every surface. That asymmetry *is* the
  control, and it should be read as intentional wherever it looks inconsistent.
- **`propose-only` becomes useful.** Until now it was the harshest guardrail —
  refusing writes in exactly the paths that matter most, with no path forward except
  turning it off. It now does what its name always claimed.
- **Guardrail rules gain a `disposition`.** The gate maps a rule's declared
  disposition to an outcome and never names a rule; a rule that wants to defer says
  so. Special-casing `propose-only` by name would break the moment a second rule
  wanted the same behaviour, and would break silently, by rejecting.
- **The queue can grow stale.** Nothing expires a proposal, and drift makes older
  ones unapprovable. `doctor` reporting on queue age is a natural follow-up, not a
  requirement of this decision.
- **Reverting is cheap.** Removing the queue restores Phase 10's behaviour exactly:
  `propose-only` goes back to refusing. Nothing else depends on a proposal existing.
