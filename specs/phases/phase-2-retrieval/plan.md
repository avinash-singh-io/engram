# Phase 2 — Execution Plan

Seven groups. Each group is committed atomically with conventional commits.

## G1 — Read-instrumentation + vault access
- `src/retrieval/types.ts` — `ReadTier`, `ReadReport`, `RecallQuery`,
  `RecallReference`, `RecallResult` (stable exported contract).
- `src/retrieval/reader.ts` — `ReadLedger`, the single fs choke point; tiers +
  byte accounting; `readIndex`/`readIndexIfExists`/`readFrontmatter`/`readBody`.
- `src/retrieval/vault-root.ts` — `resolveVaultRoot` (`--vault` override, reuses
  `findVaultRoot`), `countConcepts` (enumeration-only denominator).

## G2 — Index parsing + frontmatter scan/grep
- `src/retrieval/index-parse.ts` — parse OKF `index.md` into sections → bullets;
  classify descent vs concept; flat/malformed tolerant.
- `src/retrieval/scan.ts` — `grepFrontmatter` fallback (grep tier, bounded output).

## G3 — Scoring + navigator (core)
- `src/retrieval/score.ts` — deterministic tokenizer + weighted scorer + why-trail.
- `src/retrieval/navigate.ts` — three-level BFS descent, ranking, tag/type
  confirmation, grep fallback, one-hop links, `--sections`, budget guard.

## G4 — AGENTS.md traversal contract
- `assets/vault/AGENTS.md` — enriched additively (read budget + `engram recall`).
- `src/retrieval/agents-contract.ts` — `renderAgentsContract` + idempotent
  `writeAgentsContract`.

## G5 — Auto-index quality
- `src/retrieval/index-quality.ts` — descriptions surfaced, sections grouped,
  parent → child descent links; flat-layout + missing-index detection.

## G6 — CLI wiring
- `src/commands/recall.ts` — action + flags (`--tag/--type/--max/--hops/--vault/
  --json/--explain/--sections/--emit-contract/--check-index`); exit 0/1/2.
- `src/commands/registry.ts` — set `register` on the `recall` entry (only edit).
- `tests/cli.test.ts` — stub guard updated (recall wired).

## G7 — Locked measurement harness (Rule 11 + Rule 12)
- `tests/benchmarks/recall-v1/vault/` — 126-concept nested OKF vault (frozen).
- `tests/benchmarks/recall-v1/eval.json` — locked query set + scalar.
- `tests/retrieval/recall-bounded.test.ts` — recall@K + M3/M6 assertions.
- `tests/retrieval/metric-integrity.test.ts` — zero-fs-outside-ledger.

## Notes
- `src/cli-program.ts` dispatch loop was NOT edited — Phase 1 already ships the
  `register?()` hook, so wiring `recall` is a one-entry registry change.
- `RecallResult` is re-exported from `src/index.ts` (public barrel) for Phase 5.
