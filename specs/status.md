# Project Status

> **Last Updated**: 2026-07-03
> **Current Phase**: Phase 1 — MVP Vault + Claude Code (`in-progress`) · roadmap running full-auto (Waves 1→2→3)
> **Latest Release**: v0.1.0 (Phase 0 — Foundation)
> **Health**: On Track

## Summary

Engram is an open-source, OKF-native knowledge base that agents and humans read
and write together — durable, cross-project memory. It is the sibling of
`momentum` (**momentum is motion; Engram is memory**): it reuses momentum's
engine (scaffold, adapters, hooks) but swaps the primitive — an evergreen
**Concept** replaces a terminal **Phase**. A distributable npm CLI scaffolds and
auto-maintains an OKF v0.1 vault, enables progressive-disclosure retrieval, and
stays free across Mac + Android.

## Completed Phases

| Phase | Name | Status | Released |
|-------|------|--------|---------|
| 0 | Foundation | Complete | v0.1.0 |

## Ad-hoc / Patch Releases

> Releases NOT tied to a numbered phase — hotfixes, patch/audit releases,
> chores. Keep these out of the Completed Phases table. Work records live in
> `specs/adhoc/`. See Rule 14 for when ad-hoc work must become a phase instead.

| Version | Date | Type | Summary |
|---------|------|------|---------|
| _(none yet)_ | | | |

## Active Phase

> One row per active lane (Rule 15, ADR-0001). Each session's phase is the
> one bound to its branch; this table is the cross-lane overview and the
> fallback for branches that don't resolve. Lanes touch only their own row.

| Phase | Branch | Status | Progress |
|-------|--------|--------|----------|
| Phase 1 — MVP Vault | phase-1-mvp-vault | in-progress | 0/9 groups — started (Wave 1) |

## Upcoming Phases

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| Phase 1 | MVP Vault + Claude Code | planned | `engram init`; `/capture` `/refine` `/link` `/reindex`; write-hook; Obsidian setup doc |
| Phase 2 | Progressive-Disclosure Retrieval | planned | `/recall` structural nav; `AGENTS.md` contract; bounded-read measurement |
| Phase 3 | Sync + Multi-Device | planned | git-spine; Remotely Save→S3 & Obsidian Git recipes; Mac↔Android round-trip |
| Phase 4 | Ecosystem | planned | Codex/Antigravity adapters; `/promote` bridge from momentum |
| Phase 5 (optional) | Semantic Layer | planned | embeddings index + MCP `recall`; hybrid navigate+retrieve |

## Blockers

| ID | Description | Severity |
|----|-------------|----------|
| _(none)_ | | |

## Critical Items (P0)

| ID | Type | Description |
|----|------|-------------|
| _(none)_ | | |

## Next Actions

1. Run `/complete-phase` to verify and release Phase 0 — Foundation (merge `phase-0-foundation`, tag v0.1.0).

## Key Decisions Made

- ADR-0001 — Separate product, shared engine (not a momentum feature)
- ADR-0002 — OKF v0.1 as the format
- ADR-0003 — Standard markdown links, not wikilinks
- ADR-0004 — Git as source of truth; cloud-drive is a mobile leg
- ADR-0005 — Navigate-first retrieval; RAG optional
- ADR-0006 — Auto-generated indexes
- ADR-0007 — TypeScript single-package MVP; vendor the engine, extract later

## Recent Changes

- 2026-07-03 — Project scaffolded from the Engram PRD: vision, roadmap (Phase 0 + PRD Phases 1–5), 7 ADRs, Phase 0 planned, backlog seeded.
