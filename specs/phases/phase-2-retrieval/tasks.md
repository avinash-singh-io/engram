# Phase 2 — Tasks

## G1 — Read-instrumentation + vault access
- [x] `types.ts` — ReadTier/ReadReport/RecallResult stable types
- [x] `reader.ts` — ReadLedger single choke point, tiered + byte accounting
- [x] `vault-root.ts` — resolveVaultRoot (--vault) + countConcepts
- [x] `index.ts` barrel
- [x] Tests: `reader.test.ts`, `vault-root.test.ts`

## G2 — Index parsing + frontmatter scan/grep
- [x] `index-parse.ts` — sections → bullets, descent vs concept, flat-tolerant
- [x] `scan.ts` — grepFrontmatter fallback, bounded output, ledger-routed
- [x] Tests: `index-parse.test.ts`, `scan.test.ts`

## G3 — Scoring + navigator
- [x] `score.ts` — deterministic tokenizer + weighted scorer + why-trail
- [x] `navigate.ts` — three-level descent, budget guard, links, grep fallback
- [x] References-by-default; body tier only for `--sections`/`--hops`
- [x] Tests: `score.test.ts`, `navigate.test.ts`

## G4 — AGENTS.md traversal contract
- [x] Enrich `assets/vault/AGENTS.md` additively (read budget + recall)
- [x] `agents-contract.ts` — render + idempotent write
- [x] Tests: `agents-contract.test.ts`

## G5 — Auto-index quality
- [x] `index-quality.ts` — descriptions/sections/child-links + flat detection
- [x] Tests: `index-quality.test.ts`

## G6 — CLI wiring
- [x] `commands/recall.ts` — action + all flags + exit codes 0/1/2
- [x] `registry.ts` — set `register` on `recall` (only shared edit)
- [x] `tests/cli.test.ts` stub guard updated (only `promote` remains a stub)
- [x] Tests: `recall-cli.test.ts`

## G7 — Locked measurement harness (Rule 11 + Rule 12)
- [x] `tests/benchmarks/recall-v1/vault/` — 126-concept nested vault (frozen)
- [x] `tests/benchmarks/recall-v1/eval.json` — locked query set + scalar
- [x] `tests/benchmarks/recall-v1/README.md` — freeze/provenance note
- [x] `recall-bounded.test.ts` — recall@K + M3/M6 bounds
- [x] `metric-integrity.test.ts` — zero fs outside the ledger
- [x] Rule 12: `npm run check` exits 0 + live `recall --json` evidence captured

## Cross-cutting
- [x] ADR-0010 — bounded-read metric + recall output contract (resolves FEAT-002)
- [x] `src/index.ts` — export retrieval layer (stable RecallResult for Phase 5)
- [x] Backlog: TD-003 filed (dedupe vault-root discovery)
