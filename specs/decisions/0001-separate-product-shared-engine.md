# 0001 — Separate product, shared engine (not a momentum feature)

> **Status**: accepted
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

## Context

Engram (durable knowledge memory) and momentum (project work-in-motion) overlap
in mechanism — both scaffold a spec/knowledge layer, both drive multi-agent
adapters, both use rules + hooks. The question: build Engram *inside* momentum as
a feature, or as a separate product?

Three mismatches surfaced in design analysis:

- **Lifecycle (decisive):** a momentum *phase* has a terminal state
  (Planned→InProgress→Verified→Released). A *concept* has none — it is evergreen
  and compounds. momentum closes loops; Engram accumulates.
- **Scope:** momentum is project-scoped (state lives in the repo). Engram is
  life-scoped (knowledge spans all projects, belongs to none).
- **Git-machinery:** momentum ties phase boundaries to git boundaries (branches,
  PRs, tags, publish). Notes have no releases; that apparatus is pure friction.

## Options Considered

### Option A — Engram as a momentum feature/mode
**Pros:** one codebase; shared release cadence; no duplication.
**Cons:** forces the phase/release lifecycle onto evergreen knowledge; conflates
two scopes (project vs life); the git-boundary machinery becomes dead weight.

### Option B — Separate product, shared engine
**Pros:** each product keeps its own primitive and lifecycle; reuse the proven
engine (scaffold, adapters, hooks) without coupling; interoperate via OKF.
**Cons:** some duplicated surface; an engine-extraction decision deferred (see
[TD-001], [ADR-0007](0007-typescript-single-package.md)).

## Decision

**Share the engine, separate the primitives.** Engram is a standalone product
that reuses momentum's engine (init/scaffold, multi-agent adapters, rules +
hooks) but swaps the primitives:

| momentum (motion) | Engram (memory) |
|---|---|
| Phase — ships, terminal | Concept — evergreen, never ships |
| Backlog — not-now work | Inbox — raw capture queue |
| History — append-only *why* | log.md — verbatim change log |
| ADR — structural decision | Reference / MOC — hub note |
| `/brainstorm → start → complete` | `/capture → /refine → /link` (no release gate) |

The two interoperate through OKF; no shared codebase, no runtime coupling.

## Consequences

- Engram never inherits a release gate on knowledge (Non-Goal N1 holds).
- A bridge is possible and cheap: a momentum ADR/learning can be **promoted**
  into Engram as an OKF concept ([ADR-0007], Phase 4 `/promote`).
- Whether to physically extract a shared "engine" library (vs vendor the pattern)
  is deferred — see [ADR-0007](0007-typescript-single-package.md) and TD-001.
