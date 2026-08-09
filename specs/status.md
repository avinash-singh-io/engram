# Project Status

> **Last Updated**: 2026-08-09
> **Current Phase**: **v2 architecture adopted** (ADR-0018 … ADR-0031, branch `feat/v2-architecture`). v1 line closed at v0.6.8. Next: Phase 7 — Evidence (Gate 1).
> **Latest Release**: v0.6.8 (BUG-002 — OIDC trusted-publishing release; no functional change)
> **Health**: On Track — design settled, awaiting Gate 1 measurement before any v2 code

## Summary

Engram is a **notes system for humans where the organizing work is done by an
agent**, on plain files the human owns. You write however you think — scratchpad,
pasted links, half-finished thought — and the agent formats it to OKF, resolves
references, works out relations and supersession, and files it.

It is explicitly **not** agent memory (Mem0/Zep/Letta store what you told an agent,
for the agent), **not** a context-window fix, and **not** a better Obsidian. See
[problem-statement-v2](vision/problem-statement-v2.md) — the canonical framing as
of 2026-08-09.

**v1 (v0.1.0 – v0.6.8) shipped and is now superseded.** The v2 architecture
replaces the primitive (Node + Edge, not a single Concept), the format (OKF v0.2),
the identity model (slug, not path), and the capture policy (never reject). `src/`
is rewritten clean-room rather than patched.

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
| v0.6.6 | 2026-07-04 | release-infra (BUG-002) | OIDC publish attempt — **failed to publish** (npm < 11.5.1 via setup-node@v4/Node22 ignored OIDC → E404). Git tag exists; never on npm. Superseded by v0.6.7. |
| v0.6.7 | 2026-07-04 | release-infra (BUG-002) | OIDC attempt — **failed E404**: setup-node's `registry-url` injected a dummy `_authToken`, so npm used a bogus token and skipped OIDC. Git tag exists; never on npm. Superseded by v0.6.8. |
| v0.6.8 | 2026-07-05 | release-infra (BUG-002) | OIDC trusted-publishing release with `registry-url` removed (tokenless, auto-provenance). No functional/package change vs 0.6.5. |

## Active Phase

> One row per active lane (Rule 15, ADR-0001). Each session's phase is the
> one bound to its branch; this table is the cross-lane overview and the
> fallback for branches that don't resolve. Lanes touch only their own row.

| Phase | Branch | Status | Progress |
|-------|--------|--------|----------|
| _(none — Wave 2 landed; Wave 3 not yet started)_ | | | |

## Upcoming Phases — the v2 line

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| Phase 7 | Evidence & Observation | **next** | Append-only event log; lookup-vs-structural classification; locked evaluator. **Dual purpose — also the foundation of the intelligence layer.** **GATE 1 — can end the project** |
| Phase 8 | Core | planned | Clean-room `src/`: `core/model.ts` + `format/` codec registry (ADR-0032); narrow ports; identity; relations in frontmatter; capture never rejected |
| Phase 9 | Structure, views & health | planned | `init --structure=<x>`; view generation; derived state gitignored; `doctor` + Obsidian link-format detection |
| Phase 10 | Agent surface | planned | `format(content, hints)` — no capture prerequisite (ADR-0033); write-time extraction; write gate + guardrails; skills; adapters; MCP. **GATE 2 — edge accuracy** |
| Phase 11 | Retrieval | planned | Traversal; validity filter; trust weighting. Must beat the Phase 7 baseline on the locked evaluator |
| Phase 12 | Intelligence I | planned | Distillation: events → proposed patterns; **gaps** and **re-derivation** — the two that need a log, not a model |
| Phase 13 | Intelligence II | planned | `contradicts`; staleness × intent; dead weight; proactive surfacing — opt-in, evidence-cited, rate-limited |
| Phase 14 | Obsidian surface | planned | Community plugin; agent inside Obsidian. **Independent lane — can move earlier** |
| ~~Phase 5~~ | ~~Semantic Layer~~ | **cancelled** | Superseded by Phase 11; revisit only if structural traversal proves insufficient |

Post-v2 (Tier-2, no debt created by waiting): engram's own agent, engram's own UI,
**connectors (calendar/events)** — the last of which is where engram would become a
productivity suite, and is deliberately kept out of the core. See
[roadmap](planning/roadmap.md).

## Blockers

| ID | Description | Severity |
|----|-------------|----------|
| _(none)_ | | |

## Critical Items (P0)

| ID | Type | Description |
|----|------|-------------|
| _(none)_ | | |

## Next Actions

1. **Run Gate 1 (Phase 7).** Instrument real question traffic against the existing
   vault; classify lookup vs structural; log questions you *wanted* to ask but
   didn't bother. Threshold: **<20% structural → stop and ship a folder
   convention.** Cheapest item on the roadmap and it can end the project.
2. Lock the Phase 7 evaluator into `tests/benchmarks/` before any optimisation
   (Rule 11).
3. Set up the four audience repos (ADR-0030) — retires four originating
   requirements today, and produces the real corpus Gate 1 needs.
4. Capture M5 real-device Android round-trip evidence (Phase 3 shipped the
   automated proof; device screenshots pending — see `phase-3-sync/evidence/`).

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

### v2 architecture (2026-08-09)

- ADR-0018 — Engram is a human knowledge system with an agent co-pilot (not agent memory)
- ADR-0019 — Node + Edge are the only primitives; any structure composes from them
- ADR-0020 — **Adopt OKF v0.2** (supersedes ADR-0002); time + provenance come from the spec
- ADR-0021 — Identity is a slug; path is an address; `aliases` live in the file
- ADR-0022 — Typed relations in frontmatter; **no code, no closed type** (amends ADR-0003)
- ADR-0023 — One human-chosen tree + generated views (extends ADR-0006)
- ADR-0024 — Three-tier dependency inversion; adapters only add affordances
- ADR-0025 — Detection over configuration
- ADR-0026 — Validation gates promotion, never capture (amends ADR-0008)
- ADR-0027 — Relations extracted at write time only, never post-hoc
- ADR-0028 — Obsidian owns link rewriting; engram verifies only
- ADR-0029 — Derived state is never committed; regenerate, never merge
- ADR-0030 — Boundaries are repositories; one root is the whole world
- ADR-0031 — Evidence gates before graph investment; each can end the project

### Architecture + intelligence (2026-08-10)

- ADR-0032 — Internal model + versioned codecs; narrow ports (fixes OCP/DIP/ISP violations in the first sketch)
- ADR-0033 — `format` takes content, not a path; the inbox is a buffer, not a stage
- ADR-0034 — Encryption is a substrate concern; engram never transmits; **the agent is the egress path**
- ADR-0035 — User memory is a second store (`.engram/memory/`) with the same primitives
- ADR-0036 — The intelligence loop: observe → distill → confirm → act → decay

## Recent Changes

- 2026-08-10 — **Architecture + intelligence pass** — ADR-0032…0036. Fixed a real
  OCP/DIP violation (`core/okf.ts`), corrected the `format` signature, settled the
  security posture, and added the user-memory store and intelligence loop. Roadmap
  extended to Phase 14; Phase 7 is now dual-purpose (Gate 1 **and** the observation
  substrate).
- 2026-08-09 — **v2 design review** — 14 ADRs (0018–0031), new canonical problem
  statement, roadmap rewritten for Phases 7–12. Phase 5 cancelled. Branch
  `feat/v2-architecture`. No code changed; Gate 1 blocks all v2 implementation.
- 2026-07-03 — Released v0.5.0 (Phase 3 — Sync + Multi-Device): `engram doctor`, sync recipes, round-trip test. **Wave 2 complete** — 3 lanes built in parallel, landed 2 → 4 → 3.
- 2026-07-03 — Released v0.4.0 (Phase 4 — Ecosystem): Codex + Antigravity adapters, `/promote` bridge. Rebased onto main; ADRs renumbered 0011/0012 (0010 taken by Phase 2).
- 2026-07-03 — Released v0.3.0 (Phase 2 — Retrieval); Wave 2 built in 3 parallel lanes.
- 2026-07-03 — Released v0.2.0 (Phase 1); v0.1.0 (Phase 0).
