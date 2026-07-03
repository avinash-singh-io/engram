# 0004 — Git as source of truth; cloud-drive is a mobile leg

> **Status**: accepted
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

## Context

The vault must sync free across MacBook (write/curate with agents) and Android
(read-mostly), with no paid service. Agents edit the vault, so we need edit
history we can review and revert — the one property plain file-sync does not give.

## Options Considered

### Option A — Cloud drive (iCloud/Drive/Dropbox) as the spine
**Pros:** trivial setup; real-time-ish; mobile just works.
**Cons:** no reviewable diffs; crude "newer-wins" conflict handling corrupts on
true concurrent edits; agent mistakes are hard to revert.

### Option B — Git repo as source of truth; cloud-drive as a read-mostly mobile leg
**Pros:** agent edits become reviewable, revertable diffs; branch/history;
private and free (self-host or free tier). Mobile read via a cloud-drive or
Obsidian-Git leg sidesteps the conflict weakness (read-mostly on phone).
**Cons:** git on Android is clunkier; needs a documented sync recipe, not a
one-click toggle.

## Decision

**Git repo (private) is the source of truth.** Mac = write/curate + agents +
commit. The **mobile leg is read-mostly**, via one of:
- **Remotely Save → S3** (recommended for this user — already runs AWS; S3 is a
  free Remotely Save backend; supports E2E encryption + scheduled sync + Android), or
- **Obsidian Git plugin** on Android (pull the repo).

Engram itself is **sync-agnostic** — it operates on a local folder and ships
**setup recipes**, not a sync implementation.

## Consequences

- Every agent edit is a diff you can revert (NFR-4, non-destructive).
- Read-mostly-on-phone avoids the cloud-drive concurrent-edit failure mode.
- Optional real-time sync (self-hosted CouchDB + Obsidian LiveSync) is deferred
  to later and only if heavy mobile *writing* is needed — not MVP.
- Sync is Phase 3; it depends on a real vault (Phase 1) but not on retrieval.
