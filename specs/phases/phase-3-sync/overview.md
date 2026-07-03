# Phase 3 — Sync + Multi-Device

> **Status**: verified — awaiting `/sync-docs` + `/complete-phase`
> **Branch**: `phase-3-sync`
> **Target release**: v0.4.0 (lands after Phase 2, per parallel-execution-plan)
> **Design source**: parallel brainstorm 2026-07-03 (`specs/planning/parallel-execution-plan.md`); design brief `design-p3.json`

## Goal

Deliver the documented free sync recipes and a machine-checkable verification
path so a concept an agent writes on Mac appears, OKF-valid, in Obsidian on
Android (metric **M5**) — with **git as the durable source of truth** and the
phone as a **read-mostly** leg (ADR-0004).

## Approach

Phase 3 ships sync **recipes** plus a **verification instrument**, **never a sync
engine** — Engram stays sync-agnostic (ADR-0004). The only new code is `engram
doctor`, a read-only command that reuses the shipped format core
(`validateConcept`) and indexer (`reindex --check`) and adds sync-health checks.
A CI round-trip test freezes the transport protocol; a documented real-device
procedure closes M5.

## Scope

### In
- **Git-spine doc** (`docs/sync/git-spine.md`) — private remote options, Mac =
  write node, commit cadence, revert workflow (NFR-4), PAT/SSH auth, read-mostly
  discipline; plus `assets/vault.gitignore` and `assets/s3-iam-policy.json`.
- **Obsidian Git (Android) recipe** (`docs/sync/obsidian-git.md`) — the
  **canonical zero-cost verified path** for M5 (ADR-0010).
- **Remotely Save → S3 recipe** (`docs/sync/remotely-save-s3.md`) — AWS-native
  alternative; E2E encryption + out-of-band key management; scheduled sync;
  labelled *not free past the AWS free tier*.
- **`engram doctor`** (`src/commands/doctor.ts`) — read-only vault-wide OKF
  validity + sync-health check (conflict markers, CRLF/BOM, case-fold collisions,
  index staleness, git presence); wired via one registry entry.
- **Automated round-trip fidelity test** (`tests/round-trip.test.ts` +
  `tests/fixtures/sync/`) — byte-faithful + OKF-valid through simulated
  git-clone and S3-copy transports, incl. adversarial CRLF/BOM/unicode.
- **Verified round-trip procedure** (`docs/sync/round-trip.md`) + M5 evidence
  scaffold (`evidence/`).

### Out
- No sync engine, scheduler, or conflict resolver (ADR-0004).
- No real-time sync (CouchDB + LiveSync) — deferred to ENH-001.
- No hosted service / account / proprietary store (Non-Goal N2).
- No new OKF rules or validator changes — reuse the Phase 0 format core as-is.
- No mutation of the locked v1 fixtures corpus (Rule 11) — sync fixtures live
  under `tests/fixtures/sync/`.
- No change to Phase 1 `engram init` — the vault `.gitignore` is documented and
  handed off, not implemented here.

## Key decisions (→ ADRs)
- **ADR-0010** — Canonical free sync path = Obsidian Git + free private GitHub
  repo (M5 proven against this); Remotely Save → S3 is the AWS-native alternative.
- **ADR-0011** — `engram doctor` (read-only checker, reuses the format core) +
  the frozen round-trip protocol (byte-fidelity + OKF-validity through git-clone
  and S3-copy transports + a real-device eyeball) as the locked M5 evaluator
  (Rule 11).

## Acceptance criteria (Rule 12 — evidence required)
- [x] `docs/sync/{git-spine,obsidian-git,remotely-save-s3,round-trip}.md` present + assets.
- [x] `engram doctor <vault>` validates every concept, exits 0 clean, exits
      non-zero on an OKF-invalid concept or a VCS conflict marker — fresh CLI
      output captured this session.
- [x] `tests/round-trip.test.ts` green (byte-faithful + OKF-valid through
      git-clone and S3-copy transports, incl. CRLF/BOM/unicode cases).
- [x] `npm run check` exits 0 with fresh output this session (65 tests).
- [x] Locked v1 fixtures corpus unchanged; sync fixtures under `tests/fixtures/sync/`.
- [ ] M5 real-device Android screenshots captured (PENDING — no device in this
      headless lane; procedure documented, machine-checkable half proven).

## Risks (see design brief `design-p3.json`)
- Two channels (git + S3) off one folder can diverge → read-mostly + doctor
  conflict-marker detection.
- Remotely Save → S3 not free past the AWS free tier → Obsidian Git is the named
  canonical free path (ADR-0010).
- Android plugin auth / scoped storage is fiddly and version-sensitive → pin
  versions, capture dated screenshots.
- Line-ending/BOM/unicode mangling can corrupt frontmatter → round-trip test
  asserts fidelity; `parseFrontmatter` tolerates CRLF/BOM as defense-in-depth.
- `doctor` edits the shared `registry.ts` (also touched by Phases 2/4/5) →
  serialize the registry edit per the Rule 6 landing order.
