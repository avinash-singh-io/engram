# Principles

> Guiding decisions throughout the project. When trade-offs arise, these resolve them.

## Core Principles

1. **Files on disk, no lock-in** — the vault is plain markdown, readable and
   editable with zero tooling (any editor, GitHub renders it). No account, no
   hosted dependency for core use.

2. **OKF-conformant by construction** — the tool enforces the Open Knowledge
   Format; conformance is not optional and files never silently diverge. When
   Obsidian convenience and OKF conformance conflict, conformance wins
   ([ADR-0003](../decisions/0003-standard-links-not-wikilinks.md)).

3. **Navigate, don't ingest** — progressive disclosure is the retrieval default.
   An agent answers by descending index → tags → link → file, pulling only what
   the task needs. **Loading the whole vault is prohibited by design**
   ([ADR-0005](../decisions/0005-navigate-first-retrieval.md)).

4. **Single source of truth, no build step** — agents and Obsidian edit the same
   OKF files. There is no generated/derived copy to keep in sync.

5. **Deterministic & idempotent** — index generation and navigation are
   reproducible; running them twice changes nothing
   ([ADR-0006](../decisions/0006-auto-generated-indexes.md)).

6. **Non-destructive** — the tool never hard-deletes user content; every edit is
   a git-tracked, revertable diff
   ([ADR-0004](../decisions/0004-git-source-of-truth.md)).

7. **Reuse the engine, separate the primitives** — Engram reuses momentum's
   scaffold/adapter/hook engine but swaps in a **Concept** (evergreen, never
   ships) for a **Phase** (terminal, ships). No release gate on knowledge
   ([ADR-0001](../decisions/0001-separate-product-shared-engine.md)).

8. **Broken-link tolerance** — a link to a not-yet-written concept is valid, not
   an error. Knowledge grows forward; tools must tolerate the gaps.

> Inherited from momentum: *simplicity first* — build the simplest thing that
> solves the problem; add structure only when it demonstrably helps.
