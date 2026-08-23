# Architecture Decision Records

> Lightweight ADRs — one file per decision, append-only once accepted.

## Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| [0000](0000-template.md) | ADR Template | template | — |
| [0001](0001-separate-product-shared-engine.md) | Separate product, shared engine (not a momentum feature) | accepted | 2026-07-03 |
| [0002](0002-okf-v01-format.md) | OKF v0.1 as the format | superseded by [ADR-0020](0020-adopt-okf-v02.md) (2026-08-09) | 2026-07-03 |
| [0003](0003-standard-links-not-wikilinks.md) | Standard markdown links, not wikilinks | accepted, amended by [ADR-0022](0022-relations-in-frontmatter.md) (2026-08-09) | 2026-07-03 |
| [0004](0004-git-source-of-truth.md) | Git as source of truth; cloud-drive is a mobile leg | accepted | 2026-07-03 |
| [0005](0005-navigate-first-retrieval.md) | Navigate-first retrieval; RAG optional | accepted | 2026-07-03 |
| [0006](0006-auto-generated-indexes.md) | Auto-generated indexes | accepted, extended by [ADR-0023](0023-structure-tree-plus-views.md) and [ADR-0029](0029-derived-state-never-committed.md) (2026-08-09) | 2026-07-03 |
| [0007](0007-typescript-single-package.md) | TypeScript single-package MVP; vendor the engine, extract later | accepted | 2026-07-03 |
| [0008](0008-write-hook-mechanism.md) | Write-hook as a hidden subcommand driven by PostToolUse | accepted, amended by [ADR-0026](0026-validation-gates-promotion.md) (2026-08-09) | 2026-07-03 |
| [0009](0009-engram-config-sidecar.md) | `.engram/` tooling sidecar directory | accepted | 2026-07-03 |
| [0010](0010-bounded-read-metric-and-recall-contract.md) | Bounded-read metric = body-tier reads; recall returns references | accepted | 2026-07-03 |
| [0011](0011-adapters-converge-on-agents-md.md) | Multi-agent adapters converge on AGENTS.md; a new agent is a descriptor | accepted | 2026-07-03 |
| [0012](0012-promote-one-way-reference-snapshot.md) | /promote imports momentum artifacts as one-way Reference snapshots | accepted | 2026-07-03 |
| [0013](0013-canonical-free-sync-path.md) | Canonical free sync path: Obsidian Git + free private GitHub repo | accepted | 2026-07-03 |
| [0014](0014-m5-verification-instrument.md) | `engram doctor` + locked round-trip protocol as the M5 verification instrument | accepted | 2026-07-03 |
| [0015](0015-editor-adapters.md) | Editor adapters (engram is editor-agnostic) | accepted | 2026-07-03 |
| [0016](0016-okf-migration.md) | OKF migration (`engram migrate`) | accepted | 2026-07-03 |
| [0017](0017-agent-contract-files-full.md) | Agent contract files carry the full contract (not a pointer) | accepted · **Amends**: [ADR-0011](0011-adapters-converge-on-agents-md.md) | 2026-07-03 |
| [0018](0018-product-definition.md) | Engram is a human knowledge system with an agent co-pilot | accepted | 2026-08-09 |
| [0019](0019-node-edge-primitives.md) | Node and Edge are the only primitives | accepted | 2026-08-09 |
| [0020](0020-adopt-okf-v02.md) | Adopt OKF v0.2; do not invent time or provenance | accepted | 2026-08-09 |
| [0021](0021-identity-slug-path-aliases.md) | Identity is a slug; path is an address; aliases live in the file | accepted | 2026-08-09 |
| [0022](0022-relations-in-frontmatter.md) | Typed relations live in frontmatter; a closed type requires code | accepted | 2026-08-09 |
| [0023](0023-structure-tree-plus-views.md) | One human-chosen physical tree, plus generated views | accepted | 2026-08-09 |
| [0024](0024-three-tier-dependency-inversion.md) | Three-tier architecture; adapters may only add affordances | accepted | 2026-08-09 |
| [0025](0025-detection-over-configuration.md) | Detection over configuration | accepted | 2026-08-09 |
| [0026](0026-validation-gates-promotion.md) | Validation gates promotion, never capture | accepted | 2026-08-09 |
| [0027](0027-write-time-extraction-only.md) | Relations are extracted at write time, never post-hoc | accepted | 2026-08-09 |
| [0028](0028-obsidian-owns-link-rewriting.md) | Obsidian owns link rewriting; engram verifies only | accepted | 2026-08-09 |
| [0029](0029-derived-state-never-committed.md) | Derived state is never committed; regenerate, never merge | accepted | 2026-08-09 |
| [0030](0030-boundaries-are-repos.md) | Boundaries are repositories; one root is the whole world | accepted | 2026-08-09 |
| [0031](0031-evidence-gates-before-graph.md) | Evidence gates before graph investment | accepted | 2026-08-09 |
| [0032](0032-internal-model-versioned-codecs.md) | An internal model with versioned codecs, not a format-shaped core | accepted | 2026-08-10 |
| [0033](0033-format-takes-content.md) | `format` takes content, not a path; the inbox is a buffer | accepted | 2026-08-10 |
| [0034](0034-encryption-is-a-substrate-concern.md) | Encryption is a substrate concern; the agent is the egress path | accepted | 2026-08-10 |
| [0035](0035-user-memory-second-store.md) | User memory is a second store with the same primitives | accepted | 2026-08-10 |
| [0036](0036-intelligence-loop.md) | The intelligence loop: observe → distill → confirm → act → decay | accepted | 2026-08-10 |
| [0037](0037-gate1-measurement-protocol.md) | Gate 1 measurement protocol: retrospective corpus, interval decision | accepted | 2026-08-10 |
| [0038](0038-intelligence-deferred-post-v1.md) | Intelligence is deferred to post-v1.0, as an indivisible system | accepted | 2026-08-10 |
| [0039](0039-language-and-runtime-v2.md) | TypeScript is the language and runtime for v2 | accepted | 2026-08-10 |
| [0040](0040-gate2-thresholds-and-protocol.md) | Gate 2: two thresholds, fixed before sampling | accepted | 2026-08-12 |
| [0041](0041-mcp-surface-amends-trust-boundary.md) | The MCP surface amends the trust boundary | accepted | 2026-08-12 |
| [0042](0042-approval-queue-trust-boundary.md) | The approval queue's trust boundary | accepted | 2026-08-13 |
| [0043](0043-vault-declares-a-filing-convention.md) | A vault declares a filing convention; engram prefers none | accepted | 2026-08-22 |
| [0044](0044-adopt-the-agent-skills-standard.md) | Adopt the Agent Skills standard, and distribute skills to every agent | accepted | 2026-08-23 |
| [0045](0045-skills-namespaced-by-the-host.md) | Skills ship as a plugin, and the namespace is the differentiator | accepted | 2026-08-23 |
| [0046](0046-vault-root-discovery.md) | Find the vault root; do not assume the current directory is it | accepted | 2026-08-23 |
| [0047](0047-the-frontmatter-subset.md) | State the frontmatter subset, and degrade per key | accepted | 2026-08-23 |

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
