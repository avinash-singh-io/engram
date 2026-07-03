# Architecture Decision Records

> Lightweight ADRs — one file per decision, append-only once accepted.

## Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| [0000](0000-template.md) | ADR Template | template | — |
| [0001](0001-separate-product-shared-engine.md) | Separate product, shared engine (not a momentum feature) | accepted | 2026-07-03 |
| [0002](0002-okf-v01-format.md) | OKF v0.1 as the format | accepted | 2026-07-03 |
| [0003](0003-standard-links-not-wikilinks.md) | Standard markdown links, not wikilinks | accepted | 2026-07-03 |
| [0004](0004-git-source-of-truth.md) | Git as source of truth; cloud-drive is a mobile leg | accepted | 2026-07-03 |
| [0005](0005-navigate-first-retrieval.md) | Navigate-first retrieval; RAG optional | accepted | 2026-07-03 |
| [0006](0006-auto-generated-indexes.md) | Auto-generated indexes | accepted | 2026-07-03 |
| [0007](0007-typescript-single-package.md) | TypeScript single-package MVP; vendor the engine, extract later | accepted | 2026-07-03 |
| [0008](0008-write-hook-mechanism.md) | Write-hook as a hidden subcommand driven by PostToolUse | accepted | 2026-07-03 |
| [0009](0009-engram-config-sidecar.md) | `.engram/` tooling sidecar directory | accepted | 2026-07-03 |
| [0010](0010-bounded-read-metric-and-recall-contract.md) | Bounded-read metric + `/recall` output contract | accepted | 2026-07-03 |
| [0011](0011-adapters-converge-on-agents-md.md) | Multi-agent adapters converge on AGENTS.md; a new agent is a descriptor | accepted | 2026-07-03 |
| [0012](0012-promote-one-way-reference-snapshot.md) | /promote imports momentum artifacts as one-way Reference snapshots | accepted | 2026-07-03 |
| [0013](0013-canonical-free-sync-path.md) | Canonical free sync path: Obsidian Git + free private GitHub repo | accepted | 2026-07-03 |
| [0014](0014-m5-verification-instrument.md) | `engram doctor` + locked round-trip protocol as the M5 verification instrument | accepted | 2026-07-03 |
| [0015](0015-editor-adapters.md) | Editor adapters (engram is editor-agnostic) | accepted | 2026-07-03 |
| [0016](0016-okf-migration.md) | OKF migration (`engram migrate`) | accepted | 2026-07-03 |
| [0017](0017-agent-contract-files-full.md) | Agent contract files carry the full contract (not a pointer) — amends 0011 | accepted | 2026-07-03 |

## Process

1. Copy `0000-template.md` → `NNNN-short-title.md`
2. Fill in context, options, and decision
3. Add a row to the index above
4. Update `impact-map.json` with affected topics

## Status Values

| Status | Meaning |
|--------|---------|
| `proposed` | Under discussion |
| `accepted` | Decided, in effect |
| `superseded` | Replaced by a later ADR |
| `deprecated` | No longer applicable |
