# 0006 — Auto-generated indexes

> **Status**: accepted
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

## Context

Progressive-disclosure retrieval ([ADR-0005](0005-navigate-first-retrieval.md))
only works if the map — the per-directory `index.md` — is always fresh. A stale
index silently hides concepts from agents and humans alike. Who maintains it?

## Options Considered

### Option A — Humans maintain index.md by hand
**Pros:** no tooling; full control of wording/grouping.
**Cons:** humans won't do it reliably; the map drifts; drift breaks retrieval
invisibly. This is the exact failure the product exists to prevent.

### Option B — Tool auto-generates index.md from frontmatter
**Pros:** the map is never stale; deterministic and idempotent; `description`
frontmatter is the single source for index snippets.
**Cons:** generation logic to build and test; must be idempotent to avoid churn.

## Decision

**The tool auto-generates `index.md` at every directory level** from each file's
`description` frontmatter, regenerated on write (hook) and via `/reindex`.
Format: sections of `* [Title](/abs/path.md) - one-line description`. Root
`index.md` may carry `okf_version`; sub-indexes carry no frontmatter.

## Consequences

- Zero stale indexes (success metric M4); `/reindex` is idempotent — running it
  twice yields no diff (NFR-3).
- The mandatory one-sentence `description` is load-bearing: it *is* the index
  snippet and the agent's scan-to-decide-whether-to-open signal.
- Index generation is a Phase 0/1 deliverable (generator built in Phase 1 on the
  Phase 0 parser); the write-hook that keeps it fresh lands in Phase 1.
