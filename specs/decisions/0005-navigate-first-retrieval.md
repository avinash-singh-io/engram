# 0005 — Navigate-first retrieval; RAG optional

> **Status**: accepted
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

## Context

The flagship requirement: an agent MUST be able to answer from the vault by
reading only relevant files. Loading the whole base is prohibited by design
(context rot, lost-in-the-middle, token burn). Two ways to make retrieval cheap:
structural navigation, or semantic (embeddings/RAG) retrieval.

## Options Considered

### Option A — RAG-first (embeddings index, semantic search default)
**Pros:** handles conceptual queries whose keywords don't match; scales to huge
bases.
**Cons:** infra (index, embeddings, a service/MCP); non-deterministic ("maybe
relevant"); hard to debug; overkill at personal scale; a build/index step that
can go stale.

### Option B — Navigate-first (structural), RAG optional later
**Pros:** deterministic, explainable, zero infra; Claude Code does it natively
(grep/glob/read); works via index.md manifests + tags + links + frontmatter
grep. Progressive disclosure mirrors Anthropic Skills' three-level descent.
**Cons:** may miss conceptual queries where words don't match; relies on good
descriptions/tags and fresh indexes.

## Decision

**Navigate-first is the default retrieval strategy.** Three-level progressive
descent:
1. **Map (cheap, always first):** read root `index.md` + frontmatter
   (`type`/`title`/`description`/`tags`) — "what exists / what each is about."
2. **Descend:** root index → subdirectory index → candidate concept, narrowing
   by description/tags/headings.
3. **Full content only when needed:** open the specific concept file(s).

Mechanisms the tool provides/enforces: auto-generated `index.md` at every level
([ADR-0006](0006-auto-generated-indexes.md)); mandatory one-sentence
`description`; consistent `type` + `tags` (grep the YAML without opening bodies);
a root `AGENTS.md` traversal contract; atomic concept files with structural
headings.

**RAG is an optional later layer** (Phase 5), added only if/when structural
navigation stops finding things. RAG is one *implementation* of progressive
disclosure, not a replacement for the index.

## Consequences

- MVP retrieval needs zero infra and is debuggable at personal scale.
- Retrieval cost must be **sublinear / bounded** regardless of vault size (M3),
  measured in Phase 2 — never a whole-vault load (M6).
- If Phase 5 adds embeddings, the structural path remains the default and the
  fallback.
