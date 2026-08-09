# 0018 — Engram is a human knowledge system with an agent co-pilot

> **Status**: accepted
> **Date**: 2026-08-09
> **Deciders**: Avinash Kumar Singh

## Context

Engram shipped through v0.6.8 as "durable cross-project memory that agents and
humans read and write together." That phrasing left scope undecided, and the
2026-08 design review found three candidate problem statements sitting under it,
only one of which survives scrutiny.

Zero external users. Willingness to scrap the existing implementation. So the
positioning decision is free to be made on merit rather than on sunk cost.

## Options Considered

### Option A — Agent memory
Compete with Mem0, Zep, Letta, Cognee: store what the user told an agent, for
the agent's benefit.
**Pros:** hot category; clear technical precedents (bi-temporal graphs, memory tiers).
**Cons:** those systems are DB-backed and agent-owned; the artifact is not the
user's, not human-editable, and not portable past the vendor. Competing on their
terms with none of their funding. Wrong owner for a 20-year artifact.

### Option B — General personal knowledge management
A better Obsidian/Notion.
**Pros:** large, obvious market.
**Cons:** no wedge. The PKM field's own conclusion is that no universal structure
exists — shipping one means shipping someone else's taste. Competes on UI, which
is the one axis we will never win.

### Option C — A human knowledge system where the agent does the organizing
The human writes however they think — scratchpad, pasted links, half-finished
thoughts. The agent formats it to OKF, resolves references, works out relations
and supersession, and files it.
**Pros:** occupies a square nobody holds. Mem0/Zep/Letta are agent-owned and not
portable; Obsidian/Notion are human-owned and not agent-navigable; `AGENTS.md` is
both and does not scale. The organizing effort — the actual reason vaults die —
is removed rather than reduced.
**Cons:** broad surface. Needs an internal wedge to decide what gets the most care.

## Decision

**Option C.** Engram is a notes system for humans, in the full sense — thinking on
the page, journaling, learning, projects, planning, tracking. The differentiator is
that **the organizing work is performed by an agent**, on the human's own plain
files, so the human never has to think about structure.

Two explicit non-goals:

- **Not agent memory.** Engram stores what *the user* knows, in files the user
  owns. Any agent (Claude Code, Codex, Antigravity, or one engram ships) is a
  co-pilot over those files, not the owner of them.
- **Not a fix for context windows.** Models, windows, and routing change. Not a
  problem worth designing around.

**The wedge inside the broad surface:** split stored knowledge by whether a model
can regenerate it.

| Kind | Example | Regenerable |
|---|---|---|
| Semantic | How Graph RAG works | Yes — better than your notes |
| Episodic | We tried it in March; too slow; moved to hybrid | Never |
| Procedural | How *our* cert rotation actually works | Never |

All three belong in the vault. The last two are what nothing else in the world
holds, and they get the design's care — which is why supersession and provenance
are core (ADR-0020, ADR-0022) while topic taxonomy is not (ADR-0023).

## Consequences

- Retrieval quality, not filing convenience, is the thing to be excellent at.
- The agent is a first-class writer of the vault, which makes write-time relation
  extraction viable (ADR-0027) and makes typed structure affordable for the first
  time — the authoring burden that killed the Semantic Web is now near zero.
- Feature requests that only serve conversation memory (session scoping, recency
  decay of chat turns, per-agent stores) are out of scope by definition.
- A UI is not the product. Obsidian is the first human surface; engram's own UI is
  a Tier-2 concern (ADR-0024) that can arrive years later without redesign.
- Competing on breadth against Obsidian/Notion is explicitly declined. Engram
  earns its place on what happens to knowledge *after* it is written.
