# 0035 — User memory is a second store with the same primitives

> **Status**: accepted
> **Date**: 2026-08-10
> **Deciders**: Avinash Kumar Singh

## Context

Storing, reading, and writing knowledge is a crowded, decade-old space. Roam,
Obsidian, Logseq, and Notion have shipped knowledge graphs and, latterly, "AI
features" — mostly counters presented as insight. *"You wrote 47 notes this week"*
changes nothing about how anyone works.

The reason those features stayed shallow is structural:

> **Their substrates never recorded enough to infer from.** Roam cannot tell you a
> note is stale, because it never knew *when it was true*. Obsidian cannot tell you
> two notes conflict, because its links are untyped. Notion cannot tell you a claim
> is unsupported, because it has no provenance.

Engram's Tier-1 core ([ADR-0024](0024-three-tier-dependency-inversion.md)) records
time, provenance, and typed relations. **Intelligence is downstream of that
metadata, not a module bolted beside it.**

But knowledge about *the world* and knowledge about *the user* are different
things, and conflating them would be a mistake.

| | Knowledge memory | User memory |
|---|---|---|
| About | the world, the work | **the user** |
| Written by | user + agent | **engram, from observation** |
| Deleting it costs | knowledge | only inference — **must be safe** |
| Shared with a team | yes | **never** |
| Synced | usually | user's choice |

## Options Considered

### Option A — One store; observations are ordinary nodes in the vault
**Pros:** no second concept; the graph is unified.
**Cons:** pollutes knowledge retrieval with telemetry; makes the vault
un-shareable, since observations are about a person; makes "delete my usage data"
indistinguishable from deleting knowledge.

### Option B — A separate database (SQLite) for observations
**Pros:** cheap appends; easy aggregation.
**Cons:** a second data model, a second query path, a second thing to migrate, and
patterns stop being auditable in the same way nodes are. Also breaks the
files-are-the-substrate property for exactly the data users are most sensitive about.

### Option C — A second store, reserved subtree, same primitives
**Pros:** no new primitives at all — an observation is a Node, a pattern is a Node
whose `sources` are the observations supporting it. Auditable, supersedable,
expirable using machinery that already exists.
**Cons:** markdown is a clumsy container for high-volume events; needs a compaction
strategy.

## Decision

**Option C.** User memory lives at **`.engram/memory/`** — a reserved subtree,
excluded from knowledge retrieval by default, deletable at any time with zero
damage to knowledge.

**It uses ADR-0019's primitives unchanged:**

- An **observation** is a node: `generated.by: engram`, append-only, cheap.
- A **pattern** is a node whose `sources` point at the observations supporting it.
  So *"why do you think that?"* is always answerable by following an edge.
- A rejected pattern gets `status: deprecated`; a better one `supersedes` it.
- A pattern not reinforced passes `stale_after` and expires.

That no new primitives are required is the strongest available evidence that
ADR-0019's reduction was correct.

**High-volume events are the exception.** Raw event capture uses a compact
append-only log (`.engram/memory/events/YYYY-MM.jsonl`); only *distilled*
observations and patterns become nodes. Markdown is the durable, auditable layer,
not the write-hot one.

**Never synced by default.** `.engram/memory/` is gitignored unless the user opts
in. A vault handed to a collaborator carries knowledge and no observation of anyone.

## Consequences

- Every inference is auditable back to evidence, using the same traversal as
  ordinary retrieval.
- "Forget everything you learned about me" is `rm -rf .engram/memory/` and is safe
  by construction — a property that has to be designed in, not added later.
- The store is portable across machines if the user wants it, and absent if they don't.
- Compaction is required: events accumulate. A retention policy belongs in
  [ADR-0036](0036-intelligence-loop.md)'s decay step.
- This is the substrate only. What is inferred, and how it reaches the user, is
  [ADR-0036](0036-intelligence-loop.md).
