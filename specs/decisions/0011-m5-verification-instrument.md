# 0011 — `engram doctor` + locked round-trip protocol as the M5 verification instrument

> **Status**: accepted
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

## Context

M5 — "a concept an agent writes on Mac appears, OKF-valid, in Obsidian on
Android" — needs a *checkable* proof, not an eyeball. Engram is sync-agnostic
([ADR-0004](0004-git-source-of-truth.md)): it must not ship a sync engine,
scheduler, or conflict resolver. But a documented recipe with no instrument
rots silently — line-ending/BOM/unicode mangling by a sync channel can corrupt
YAML frontmatter and make a concept OKF-invalid on the far side with no visible
signal. We need a read-only instrument and a *frozen* pass/fail protocol so
"the round-trip works" is an assertion, not a vibe.

## Options Considered

### Option A — Verification is test-only (a CI round-trip test), no new command
**Pros:** smallest CLI surface; no edit to the shared `registry.ts` / dispatch.
**Cons:** gives the user nothing to run against their *own* live vault after a
real device sync; M5 evidence stays manual.

### Option B — A `--check` mode bolted onto `reindex`
**Pros:** no new registry entry.
**Cons:** overloads reindex's single responsibility; index freshness is only one
of several sync-health signals (conflict markers, CRLF/BOM, case-fold collisions).

### Option C — A new read-only `engram doctor` command + a locked round-trip test
**Pros:** one thing the user runs on any checkout to prove health; reuses the
shipped format core (`validateConcept`) and indexer (`reindex --check`)
verbatim; the automated round-trip test freezes the pass/fail protocol.
**Cons:** adds one entry to the shared command registry (a known concurrent-lane
merge surface).

## Decision

**Option C.** Ship `engram doctor <dir>` — a **read-only** command that walks a
vault (reusing the canonical `readVault` walker), runs `validateConcept` over
every concept, and adds sync-health checks: unresolved VCS conflict markers,
CRLF/BOM anomalies, case-fold filename collisions, index staleness
(`reindex --check`), and git-spine presence. It exits **non-zero** on any OKF
error or conflict marker; CRLF/BOM/stale-index/no-git are **warnings** (exit 0)
because `parseFrontmatter` already tolerates CRLF/BOM, so they signal risk, not
corruption. It is explicitly **not** a sync engine.

The **M5 evaluator is frozen** (Rule 11) as: a concept written via the format
core is **byte-faithful AND OKF-valid** on the far side after **both** a
simulated git-clone transport and an S3 object-copy transport (including
adversarial CRLF/BOM/unicode-NFD cases), plus a real-device Obsidian eyeball via
the canonical free path ([ADR-0010](0010-canonical-free-sync-path.md)). This
protocol lives in `tests/round-trip.test.ts` + `tests/fixtures/sync/`. It is
version-bumped, never mutated, if it must change (Rule 11).

## Consequences

- M5 is provable by a command the user can rerun on any clean checkout, and by a
  green CI test — not a one-off manual check.
- `doctor` reuses the format/indexer libs with zero forking (single source of
  conformance truth).
- Adds one entry to `src/commands/registry.ts` (register-hook pattern) — a known
  merge surface shared with Phases 2/4/5; serialized per the Rule 6 landing order.
- The frozen protocol makes "does the round-trip still hold?" a regression test,
  so channel-mangling bugs surface in CI rather than on the phone.
