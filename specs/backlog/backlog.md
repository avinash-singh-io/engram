# Backlog

> **Last Updated**: 2026-08-09

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
| BUG-002 | CI publish workflow fails `ENEEDAUTH` — npm auto-publish broken | **P0** | **open** | ad-hoc | Converted `publish.yml` to **OIDC trusted publishing** (tokenless). v0.6.6 first attempt then failed `E404` — setup-node@v4/Node 22 shipped npm 10.9 (< 11.5.1) which ignores OIDC and used setup-node's empty-token `.npmrc`. Corrected (branch `fix/oidc-publish-config`) to the official config: setup-node@v6 + Node 24 (npm ≥ 11.5.1), `package-manager-cache: false`. Trusted publisher registered on npmjs.com. **STILL OPEN — reopened 2026-08-12 against registry evidence.** `npm view @avinash-singh-io/engram versions` returns `[0.5.0 … 0.6.5]`; `latest` is **0.6.5**. **v0.6.6, v0.6.7, v0.6.8, v0.7.0 and v0.8.0 all have git tags and none reached npm.** v0.6.8 was recorded as a successful OIDC release and was not; the row was then marked `resolved` on 2026-08-12 on the strength of that record rather than the registry — a verification failure, corrected here. Workflow config is correct and has been re-verified: `id-token: write` present, npm 12.0.2 (≥ 11.5.1), no `registry-url`, `npm publish --access public`. It still fails `ENEEDAUTH`, which means the registry is not accepting the OIDC token. **Remaining cause is on the npmjs.com side and needs the package owner**: Settings → Trusted Publisher must name org `avinash-singh-io`, repo `engram`, workflow `publish.yml`, environment blank. Raised to P0 — every release since v0.6.5 is a tag pointing at nothing. |

## Features

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| FEAT-001 | MOC auto-suggestion from tag clusters | P2 | open | Phase 9 | Subsumed by view generation (ADR-0023) — a MOC is a projection of `part-of` edges |
| FEAT-002 | `/recall` output contract | P2 | resolved | Phase 2 | Resolved by ADR-0010: ranked references (path+title+description+why); `--sections` for headings, not bodies |
| FEAT-003 | Skills — packaged instruction sets for KB operations | P3 | in-progress | Phase 15 | Tier-2 *Agency* (ADR-0024). Literature review, connect-the-dots, weekly digest, PRD-from-sources. Vault-local so they travel with the vault. Adds affordances over a core that doesn't know about them — no debt from waiting |
| FEAT-004 | Guardrails — constraints on agent behavior | P3 | resolved | Phase 10 | Tier-2 *Agency*. Propose-don't-write, never-delete, require `verified` before X, rate limits on autonomous filing. The counterweight to write-time autonomy (ADR-0027). **RESOLVED in v0.9.0 (Phase 10)** — six rules shipped, each with a preventive half at the write gate *and* a detective half in `doctor`; the `Guardrail` type requires both, so a preventive-only rule does not compile. `tighten()` cannot loosen: `enabled` unions, `pathScope` intersects, `rateLimit` takes the minimum. 30 tests. **Verified against the shipped code, not a status document** — the row-versus-reality gap is exactly how BUG-002 stayed wrong. |
| FEAT-005 | Additional closed relation types (`depends-on`, `duplicate-of`) | P3 | open | post-v2 | Each gated by ADR-0022: no code behind it, no closed type. `contradicts` now lands in Phase 13 (ADR-0036 inference #3). `duplicate-of` becomes relevant once cloud-sync conflict copies are observed in practice |
| FEAT-006 | Connectors — calendar, events, external feeds | P3 | open | post-v2 | ⚠️ **Scope warning**: this is where engram becomes a productivity suite competing with Notion/Obsidian ecosystems. ADR-0036 ranks it inference #6 — least differentiated, demos best. Worth doing eventually; worth not doing accidentally |
| FEAT-007 | Local model for the private vault | P3 | open | post-v2 | The real answer to "the agent is a network egress path" (ADR-0034) once local quality permits. Architecture already permits it — engram has no opinion about which agent is used |
| FEAT-008 | Event-log compaction / retention policy | P2 | open | Phase 12 | `.engram/memory/events/*.jsonl` accumulates. ADR-0035 defers the retention policy to ADR-0036's decay step; needs a concrete rule before Intelligence I ships |

## Tech Debt

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| TD-007 | ADR index in `specs/decisions/README.md` stale by 25 entries | P3 | open | Phase 14 | The index table stops at [ADR-0017](../decisions/0017-agent-contract-files-full.md) (2026-07-03). ADRs 0018–0042 all exist as files and none has a row, so the index is now actively misleading rather than merely incomplete — it reads as the complete list. `impact-map.json` has stayed current, so `/sync-docs` still works; only the human-facing index rotted. Found while adding ADR-0042. Deliberately not fixed mid-phase (Rule 9 — during a phase, record to history; sync at completion). Fix is mechanical: one row per ADR, and worth doing in the same pass as a check for whether anything since 0018 should be `superseded`. |
| TD-006 | ADR-0015's `EditorAdapter` layer absent from v2 | P2 | open | Phase 14 | [ADR-0015](../decisions/0015-editor-adapters.md) (accepted) specifies `EditorAdapter { id, label, detect, setup }` under `src/editors/`, with `engram init` merging `.obsidian/app.json` to `useMarkdownLinks: true` + `newLinkFormat: "absolute"`, non-destructively and idempotently, for every detected editor. The v2 clean-room rewrite kept the **detect** half only (`substrate/detect.ts` knows `.obsidian` exists) and dropped the adapter layer entirely — engram now tells the human to change the setting by hand instead of offering to do it. Found while scoping Phase 14; deliberately left out of that phase's scope, which already carries the gate's QUEUE outcome plus a new build target. Restoring it is one module plus one registry entry per the ADR. |
| TD-005 | `commander` and `yaml` shipped as dead runtime dependencies | P2 | resolved | Phase 15 | Phase 8's clean-room rewrite hand-rolled both the CLI argument parsing and a small YAML subset (deliberately — OKF frontmatter is flat, so a full engine carried far more surface than the format uses). Neither package has been imported by any file since, but `package.json` kept shipping both to everyone installing engram. Found at Phase 15 start by grepping `src/` rather than trusting the manifest. Removed; engram now has **zero runtime dependencies**. |
| TD-001 | Engine extraction: single package vs shared lib | P2 | open | post-Phase 1 | Per ADR-0007 — revisit once Engram/momentum boundaries stabilize |
| TD-002 | ESM package vs momentum CJS git hooks | P3 | resolved | Phase 0 | Root `type: module` broke `.githooks/*.js` (CJS). Fixed via `.githooks/package.json` `{"type":"commonjs"}`. Re-verify after `momentum upgrade`. |
| TD-003 | Dedupe vault-root discovery entry points | P3 | resolved | Phase 8 | Resolved by the clean-room rewrite — ADR-0030 makes the invocation root the only root, so there is one discovery path by construction |
| TD-004 | Concept walker has no notion of a nested vault root | P2 | resolved | Phase 9 | `enumerateConceptFiles` (`src/vault/read.ts`) skips only dotdirs + `IGNORE_DIRS` (`src/vault/paths.ts:5`). A parent `reindex` descends into a nested vault and writes its titles + one-sentence descriptions into a shared, committed `index.md` — a real disclosure path. Not a shipped bug (nested roots were never supported) but the obvious thing a user tries when told to "keep private notes in a separate directory". ADR-0030 says the answer is a separate **repo**; the walker should still detect and refuse to descend. **RESOLVED in Phase 9 (v0.8.0)** — `src/ops/walk.ts` detects a nested root on the explicit `.engram/` marker, skips the subtree entirely, and reports the skip in both `reindex` and `doctor` output. Three negative tests guard against a misfire (an ordinary subdirectory, a similarly-named directory, and the vault's own sidecar are all not nested roots), because silently dropping authored content would be a worse failure than the disclosure. Verified against the built binary: private content never reaches the generated index. **Retagged Phase 8 → Phase 9 on 2026-08-12**: the cited code (`src/vault/read.ts`, `src/vault/paths.ts`) is deleted by the Phase 8 clean-room rewrite, and Phase 8 builds no enumeration walker — the walker arrives with `reindex` in Phase 9, which is where the detect-and-refuse behaviour must land. |

## Enhancements

| ID | Title | Priority | Status | Phase | Detail |
|----|-------|----------|--------|-------|--------|
| ENH-001 | Real-time sync (self-hosted CouchDB + LiveSync) | P3 | open | post-Phase 3 | Only if heavy mobile writing is needed; not MVP (ADR-0004) |
| ENH-002 | `doctor` link-resolution check (`link-unresolved`) | P2 | open | future | Deferred from BUG-001. Flag any internal link whose decoded target doesn't resolve to a file — catches broken/stale links (doctor currently reports 0 errors on them) |
| ENH-004 | `retroHasEvidence` exact-matches the `## Verification Evidence` heading | P3 | open | future | The pre-push release-tag gate (`.githooks/contract.js`) accepts the heading only when the line trims to exactly `## Verification Evidence`. A natural suffix — `## Verification Evidence (Rule 12)` — silently fails the match and blocks the tag with a message saying the section is missing when it is present. Hit while tagging v0.7.0 on 2026-08-12; both Phase 7 and Phase 8 retrospectives had the suffix. Suggest matching on a heading *prefix*, or naming the exact string in the error. Upstream momentum issue, not engram's. |
| ENH-003 | `reindex --rewrite-links` for legacy in-body links | P3 | open | future | Deferred from BUG-001. BUG-001 self-heals index.md/log.md on reindex, but pre-existing See-also/promoted-body links stay raw. A decode→encode rewrite pass would migrate them |
