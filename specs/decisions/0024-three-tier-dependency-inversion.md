# 0024 — Three-tier architecture; adapters may only add affordances

> **Status**: accepted
> **Date**: 2026-08-09
> **Deciders**: Avinash Kumar Singh
> **Extends**: [ADR-0011](0011-adapters-converge-on-agents-md.md), [ADR-0015](0015-editor-adapters.md)

## Context

Engram must work across a wide spread of environments — a plain local folder, a
git repo, a Drive-synced directory; Obsidian, a CLI, an MCP client, eventually its
own UI; Claude Code, Codex, Antigravity, or an agent engram ships. It must also
support many organisational philosophies (ADR-0023) and, later, skills and
guardrails layered on the agent.

Without an explicit dependency rule, each of these becomes a branch in the core,
and six binary options become sixty-four products.

## Options Considered

### Option A — Configuration flags
`storage: git|drive|local`, `obsidian: true|false`, and so on.
**Pros:** appears to make everything supportable.
**Cons:** configuration cannot *grant* a capability — a `storage` flag does not
create git history on a Drive folder, it only announces what is missing. So the
core must work without history regardless, and the flag buys nothing on the core
path. Worse, every flag forks the contract an agent must reason about. See
[ADR-0025](0025-detection-over-configuration.md).

### Option B — Layered architecture with an explicit dependency direction
Identify the dimensions, tier them, and require that all dependencies point inward.
**Pros:** the core has one behavior; variance is bounded to the edges; new
surfaces and substrates cost nothing structurally.
**Cons:** requires settling the core before anything above it can be built —
front-loads the hard decisions.

## Decision

**Option B.** A dimension is real only if it can vary while every other one is held
fixed. By that test there are ten, in three tiers:

**Tier 1 — CORE. Invariant. One answer for everyone.**

| Dimension | Question | Decided in |
|---|---|---|
| Identity | what is this thing, stably? | ADR-0021 |
| Relation | how do things connect? | ADR-0022 |
| Time | when was it true; when did it stop? | ADR-0020 |
| Provenance | who asserted it, on what basis? | ADR-0020 |

These are invariant **because retrieval behavior depends on them**. Make any of
them configurable and nothing above can rely on anything.

**Tier 2 — POLICY. Pluggable. The user's taste.**
Structure · Lifecycle · Derivation · Agency · Surface

**Tier 3 — DETAIL. Pluggable. The environment supplies it.**
Substrate · Boundary

**The rule: every dependency points inward.** Policy above and detail below both
depend on the core; the core depends on neither.

**Adapters may only add affordances, never change what the core knows.** This
strengthens ADR-0011 and ADR-0015 from a pattern into a constraint: an adapter can
render, expose, or decorate; it can never grant the core a new capability or take
one away.

**The core must be designed for the floor, not the union.** The invariant across
every substrate is *a directory of files* — nothing else. History, authorship, and
atomic multi-file writes exist on git and not on Drive. Therefore everything the
core needs is **in-band, in the file**. This is what killed git-as-a-provenance-
ledger and independently justified frontmatter on first-principles grounds rather
than as an Obsidian inheritance.

## Consequences

- Obsidian is **Surface** (Tier 2). An Obsidian plugin with an agent inside can
  ship years later without redesigning a line of the core — that is the test that
  the tiering is real rather than decorative.
- Skills and guardrails are **Agency** (Tier 2). They already have a home; they add
  affordances over a core that does not know about them.
- Engram's own UI is Tier 2. Not a rewrite, an addition.
- Tier 1 must be settled first. Nothing above it can be designed until it is.
- Coupling to Obsidian is answered directionally rather than as yes/no:
  **engram depends on nothing above a directory of files; Obsidian can read what
  engram writes.** Legibility is not coupling. The test for any decision:
  *would this still work in a headless container, driven only by an agent?*
