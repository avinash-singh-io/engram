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
| BUG-001 | Emitted markdown link destinations use raw spaces (break CommonMark + engram's own index parse) | P1 | resolved | ad-hoc | Fixed in v0.6.5 — percent-encode link targets on write, decode on read. See `specs/adhoc/BUG-001/record.md`. Follow-ups: ENH-002, ENH-003 |
| BUG-002 | CI publish workflow fails `ENEEDAUTH` — npm auto-publish broken | P1 | in-progress | ad-hoc | Converted `publish.yml` to **OIDC trusted publishing** (tokenless). v0.6.6 first attempt then failed `E404` — setup-node@v4/Node 22 shipped npm 10.9 (< 11.5.1) which ignores OIDC and used setup-node's empty-token `.npmrc`. Corrected (branch `fix/oidc-publish-config`) to the official config: setup-node@v6 + Node 24 (npm ≥ 11.5.1), `package-manager-cache: false`. Trusted publisher registered on npmjs.com. Re-cut v0.6.6 to verify. |

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
| ENH-002 | `doctor` link-resolution check (`link-unresolved`) | P2 | open | future | Deferred from BUG-001. Flag any internal link whose decoded target doesn't resolve to a file — catches broken/stale links (doctor currently reports 0 errors on them) |
| ENH-003 | `reindex --rewrite-links` for legacy in-body links | P3 | open | future | Deferred from BUG-001. BUG-001 self-heals index.md/log.md on reindex, but pre-existing See-also/promoted-body links stay raw. A decode→encode rewrite pass would migrate them |
