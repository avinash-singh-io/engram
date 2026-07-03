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
