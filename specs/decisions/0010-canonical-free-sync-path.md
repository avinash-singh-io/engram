# 0010 — Canonical free sync path: Obsidian Git + free private GitHub repo

> **Status**: accepted
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

## Context

[ADR-0004](0004-git-source-of-truth.md) made git the source of truth and named
**two** candidate mobile legs — Remotely Save → S3, and the Obsidian Git plugin —
without deciding which one the Mac↔Android round-trip acceptance metric (**M5**)
is *proven against*. Phase 3 ships the recipes and must pick one canonical path
so "syncs free across Mac + Android" (success criterion) rests on a genuinely
zero-cost, reproducible procedure — not on a path that quietly incurs cost.

The forces:

- **Free must mean free indefinitely.** Remotely Save → S3 is free only within
  AWS's 12-month / 5 GB free tier; after expiry it bills per GB-month + requests.
- **Git-native is a property, not an accident.** Every agent edit must remain a
  reviewable, revertable diff (NFR-4). A leg that pulls the git repo preserves
  that; an object-store leg carries an opaque encrypted blob.
- **Android on-device auth is fiddly** for both plugins (PAT/SSH, scoped storage).

## Options Considered

### Option A — Obsidian Git plugin + free **private** GitHub repo
**Pros:** zero cost with no expiry; the phone pulls the same git history the Mac
writes (diffs/revert survive to the device); one spine, one mental model; PAT
auth is well-trodden.
**Cons:** Obsidian Git on Android is less polished; large binary vaults are
clunky; pulls are manual/scheduled, not instant.

### Option B — Remotely Save → S3 (E2E-encrypted, scheduled)
**Pros:** better Android UX; built-in scheduled sync; end-to-end encryption at
rest; native for a user already on AWS.
**Cons:** not free past the AWS free tier; the S3 object is an opaque encrypted
blob (no diffs on that leg); a lost E2E password makes the S3 copy unrecoverable.

## Decision

**Option A is the canonical free, verified path** that **M5 is proven against**:
Obsidian Git on Android pulling a **free private GitHub repository** whose write
node is the Mac. **Option B (Remotely Save → S3) is documented as the recommended
AWS-native alternative** — E2E-encrypted, scheduled, nicer Android UX — but is
explicitly labelled *not free past the AWS free tier*, so it is an alternative,
never the free bar.

Both legs keep the phone **read-mostly** (ADR-0004) to avoid the concurrent-edit
failure mode. On the S3 leg the E2E password lives **out-of-band** (never in the
repo); **git — not S3 — is the recovery source of truth** if the password is lost.

## Consequences

- The "free across Mac + Android" claim is anchored to a path with no expiry.
- The device holds real git history, so revert/audit (NFR-4) reaches the phone.
- Recipes ship for both legs (`docs/sync/obsidian-git.md`,
  `docs/sync/remotely-save-s3.md`); the S3 recipe carries an explicit cost note
  and out-of-band key-management guidance.
- Running both legs off one folder is a divergence risk if the phone writes;
  mitigated by read-mostly discipline and `engram doctor`'s conflict-marker check.
- Real-time sync (self-hosted CouchDB + LiveSync) stays deferred to ENH-001.
