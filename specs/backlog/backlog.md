# Backlog

> **Last Updated**: 2026-07-03

---

## Priority Levels

| Level | Meaning |
|-------|---------|
| **P0** | Critical — blocks current phase |
| **P1** | High — address in current/next phase |
| **P2** | Medium — within 2 phases |
| **P3** | Low — nice to have |

**Status**: `open` | `in-progress` | `resolved` | `deferred` | `deprecated`

---

## Bugs

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| _(none)_ | | | | | |

## Features

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| FEAT-001 | MOC auto-suggestion from tag clusters | P2 | open | Phase 2+ | PRD open-Q: auto-suggest hub notes vs purely manual |
| FEAT-002 | `/recall` output contract | P2 | resolved | Phase 2 | Resolved by ADR-0010: ranked references (path+title+description+why); `--sections` for headings, not bodies |

## Tech Debt

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| TD-001 | Engine extraction: single package vs shared lib | P2 | open | post-Phase 1 | Per ADR-0007 — revisit once Engram/momentum boundaries stabilize |
| TD-002 | ESM package vs momentum CJS git hooks | P3 | resolved | Phase 0 | Root `type: module` broke `.githooks/*.js` (CJS). Fixed via `.githooks/package.json` `{"type":"commonjs"}`. Re-verify after `momentum upgrade`. |
| TD-003 | Dedupe vault-root discovery entry points | P3 | open | Phase 2 | `resolveVaultRoot` (retrieval, `--vault` + exit-code) wraps `findVaultRoot` (vault/paths); dedupe once Phase 1/2/3 vault access stabilizes |

## Enhancements

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| ENH-001 | Real-time sync (self-hosted CouchDB + LiveSync) | P3 | open | post-Phase 3 | Only if heavy mobile writing is needed; not MVP (ADR-0004) |
