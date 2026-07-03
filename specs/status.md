# Project Status

> **Last Updated**: 2026-07-04
> **Current Phase**: Phase 6 (Onboarding & OKF Migration) verified — awaiting merge (v0.6.0). Phase 5 (Semantic Layer) still deferred (optional).
> **Latest Release**: v0.6.5 (BUG-001 — CommonMark-safe link encoding)
> **Health**: On Track — published on npm (@avinash-singh-io/engram)

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
| 1 | MVP Vault + Claude Code | Complete | v0.2.0 |
| 2 | Progressive-Disclosure Retrieval | Complete | v0.3.0 |
| 4 | Ecosystem | Complete | v0.4.0 |
| 3 | Sync + Multi-Device | Complete | v0.5.0 |
| 6 | Onboarding & OKF Migration | Complete | v0.6.0 |

## Ad-hoc / Patch Releases

> Releases NOT tied to a numbered phase — hotfixes, patch/audit releases,
> chores. Keep these out of the Completed Phases table. Work records live in
> `specs/adhoc/`. See Rule 14 for when ad-hoc work must become a phase instead.

| Version | Date | Type | Summary |
|---------|------|------|---------|
| v0.6.5 | 2026-07-04 | quick-task (BUG-001) | Percent-encode markdown link targets (CommonMark §6.3) — fixes broken links on spaced filenames + engram's own dropped index bullets. `specs/adhoc/BUG-001/` |

## Active Phase

> One row per active lane (Rule 15, ADR-0001). Each session's phase is the
> one bound to its branch; this table is the cross-lane overview and the
> fallback for branches that don't resolve. Lanes touch only their own row.

| Phase | Branch | Status | Progress |
|-------|--------|--------|----------|
| _(none — Wave 2 landed; Wave 3 not yet started)_ | | | |

## Upcoming Phases

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| Phase 5 (optional) | Semantic Layer | planned (Wave 3) | embeddings index + MCP `recall`; hybrid navigate+retrieve |

## Blockers

| ID | Description | Severity |
|----|-------------|----------|
| _(none)_ | | |

## Critical Items (P0)

| ID | Type | Description |
|----|------|-------------|
| _(none)_ | | |

## Next Actions

1. _(optional)_ Open Wave 3 — Phase 5 (Semantic Layer) when wanted — needs Phase 2's `RecallResult`; design in `specs/planning/parallel-execution-plan.md`.
2. Capture M5 real-device Android round-trip evidence (Phase 3 shipped the automated proof; device screenshots pending — see `phase-3-sync/evidence/`).
3. _(optional)_ `npm publish` when ready to distribute (deferred through the core build).

## Key Decisions Made

- ADR-0001 — Separate product, shared engine (not a momentum feature)
- ADR-0002 — OKF v0.1 as the format
- ADR-0003 — Standard markdown links, not wikilinks
- ADR-0004 — Git as source of truth; cloud-drive is a mobile leg
- ADR-0005 — Navigate-first retrieval; RAG optional
- ADR-0006 — Auto-generated indexes
- ADR-0007 — TypeScript single-package MVP; vendor the engine, extract later
- ADR-0008 — Write-hook as a hidden subcommand driven by PostToolUse
- ADR-0009 — `.engram/` tooling sidecar directory
- ADR-0010 — Bounded-read metric + `/recall` output contract
- ADR-0011 — Multi-agent adapters converge on AGENTS.md; a new agent is a descriptor
- ADR-0012 — `/promote` imports momentum artifacts as one-way Reference snapshots
- ADR-0013 — Canonical free sync path: Obsidian Git + free private GitHub repo
- ADR-0014 — `engram doctor` + locked round-trip protocol as the M5 verification instrument
- ADR-0015 — Editor adapters (engram is editor-agnostic; Obsidian first)
- ADR-0016 — OKF migration (`engram migrate`) — deterministic best-effort adoption

## Recent Changes

- 2026-07-03 — Released v0.5.0 (Phase 3 — Sync + Multi-Device): `engram doctor`, sync recipes, round-trip test. **Wave 2 complete** — 3 lanes built in parallel, landed 2 → 4 → 3.
- 2026-07-03 — Released v0.4.0 (Phase 4 — Ecosystem): Codex + Antigravity adapters, `/promote` bridge. Rebased onto main; ADRs renumbered 0011/0012 (0010 taken by Phase 2).
- 2026-07-03 — Released v0.3.0 (Phase 2 — Retrieval); Wave 2 built in 3 parallel lanes.
- 2026-07-03 — Released v0.2.0 (Phase 1); v0.1.0 (Phase 0).
