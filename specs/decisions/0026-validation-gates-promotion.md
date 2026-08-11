# 0026 — Validation gates promotion, never capture

> **Status**: accepted
> **Date**: 2026-08-09
> **Deciders**: Avinash Kumar Singh
> **Supersedes**: the rejection behavior of [ADR-0008](0008-write-hook-mechanism.md)

## Context

Engram v0.6.x requires five frontmatter fields and the write-hook **rejects**
non-conformant files. OKF itself requires one (`type`) and preserves unknown keys
rather than rejecting.

The consequence is direct and self-inflicted: a note typed on Obsidian for Android
has no frontmatter, so engram refuses it. The stated goal of minimising daily
capture friction is defeated by engram's own validator.

The deeper diagnosis from the design review: an inbox that grows forever is **not
a friction problem**. Capture is already frictionless — that is *why* it fills. The
classic pipeline (capture → process → file) assumes a human performing a weekly
review, and the founding constraint is that no such human exists. It is a **queue
with no consumer**.

The inbox also holds two species needing opposite treatment:

| Species | What it is | What it needs |
|---|---|---|
| **Thoughts** | knowledge you already have | refinement — cheap, doable now |
| **Pointers** | an article, video, repo — knowledge you *don't* have yet | *reading the thing*; no tool removes that cost |

Mixing them guarantees the queue never clears, because every review session hits a
40-minute item and the whole list is abandoned.

## Options Considered

### Option A — Keep strict validation everywhere
**Pros:** the vault is always conformant; one class of file.
**Cons:** capture is blocked at the worst moment; mobile quick-capture is
impossible; the tool fights its own primary use case.

### Option B — Validate nothing
**Pros:** zero friction.
**Cons:** no conformance guarantee anywhere; retrieval degrades to grep.

### Option C — Two zones: raw capture, validated durable
**Pros:** friction removed where it hurts and enforcement kept where it pays.
**Cons:** two classes of file; something must move items between them.

## Decision

**Option C.**

> **Validation gates promotion, never capture.**

- `inbox/` is **raw**. No schema, no rejection, no frontmatter required. A file
  dropped there by any tool, on any device, is valid by definition.
- Validation applies at **promotion** — when a raw note becomes a durable node in
  the tree.
- A non-conformant file is **inbox**, not an error. `doctor` reports it as
  unpromoted, never as broken.

**Two consumers give the queue a trigger, and both share one property: the trigger
is something that was going to happen anyway.**

1. **Refine at retrieval** — `recall` searches the inbox too; a raw note earns
   structure only when it is actually used. Cold notes stay raw forever, at zero
   cost. JIT compilation applied to knowledge.
2. **Refine as a byproduct of work** — the agent files a note while it still has
   the task context, which is exactly when a one-sentence description is worth
   writing and a week later it is not.

**Pointers get an explicit drop path.** A pointer nobody consumed in N days is a
decision, not a backlog item. Surfaced in `views/unread-sources.md`.

## Consequences

- Mobile quick-capture works, which was the original requirement.
- The vault contains two classes of file by design; `doctor` distinguishes
  *unpromoted* from *malformed*.
- The write-hook (ADR-0008) survives as a mechanism but stops rejecting; it
  validates on promotion and reports on capture.
- The rejection cost was never a format problem — engram was stricter than the
  spec it claimed to conform to (ADR-0020).
