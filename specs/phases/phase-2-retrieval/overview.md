# Phase 2 — Progressive-Disclosure Retrieval

> **Status**: Implemented — green gate passing, awaiting landing (Wave 2, land order 2 → 4 → 3)
> **Branch**: `phase-2-retrieval`
> **Depends on**: Phase 0 (format core), Phase 1 (vault walker, indexer, registry)

## Goal

Ship `engram recall` as a structural, three-level navigator (root `index.md` →
subdirectory `index.md` → concept) that returns the **minimal relevant concept
set** from a 100+ concept vault while reading a **bounded, measured fraction of
files** and **never the whole vault** — plus the AGENTS.md traversal contract, an
index-quality checker, and a **locked** bounded-read measurement harness.

## Scope (in)

- `engram recall "<query>"` structural navigator (ADR-0005 three-level descent).
- `ReadLedger` read-instrumentation with tiers (`index`/`frontmatter`/`grep`/`body`)
  and a `ReadReport` emitted per recall.
- Deterministic lexical scoring (no embeddings) over title/description/tags/headings.
- One-hop link expansion (`--hops`) and bounded frontmatter-grep fallback.
- Minimal-set output contract (FEAT-002): ranked references (path + title +
  description + why-matched); `--sections` returns matched headings; not bodies.
- AGENTS.md traversal contract: enriched template + idempotent writer +
  `--emit-contract`.
- Index-quality checker + `--check-index` (descriptions surfaced, sections
  grouped, parent indexes link child indexes); graceful degradation on flat vaults.
- Locked `recall-v1` evaluator (fixture vault + query set) proving M3 (bounded
  fraction) and M6 (never whole-vault).

## Scope (out)

- Embeddings / semantic search / RAG / MCP recall (Phase 5).
- MOC auto-suggestion from tag clusters (FEAT-001, stays in backlog).
- Building the index generator / `reindex` / write-hook (Phase 1 owns; Phase 2
  only consumes + checks the format).
- Inlining tags into index bullets (would be an ADR-0006 amendment — deferred).

## Key deliverables

| Deliverable | Location |
|-------------|----------|
| Retrieval layer | `src/retrieval/*` (stable `RecallResult` export) |
| `recall` command | `src/commands/recall.ts` + registry `register` hook |
| AGENTS.md contract | `assets/vault/AGENTS.md` (enriched) + `agents-contract.ts` |
| Index-quality checker | `src/retrieval/index-quality.ts` |
| Locked evaluator | `tests/benchmarks/recall-v1/` (frozen, Rule 11) |
| ADR | `specs/decisions/0010-*.md` |

## Acceptance

1. `recall@K = 100%` on every `recall-v1` eval query (`recall-bounded.test.ts`).
2. Per query: `bodyReads < conceptCount`, `bodyReads <= maxBodyReads`,
   `filesTouched/conceptCount <= maxFilesFraction`, index tier dominates body.
3. A test asserts the navigator does zero fs reads outside the ledger.
4. `recall --json` prints a four-tier `ReadReport` (fresh Rule-12 evidence).
5. `recall --emit-contract` writes an idempotent OKF-passthrough AGENTS.md.
6. `recall --check-index` passes on the fixture and flags a degraded vault.
7. `engram --help` still lists all 7 commands; `tests/cli.test.ts` green.
8. `npm run check` exits 0.
