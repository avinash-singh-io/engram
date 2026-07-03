# Phase 3 — Plan

> How the phase is built. Groups map to the design brief (`design-p3.json`).
> Reuse the shipped format/indexer/vault libs — never reimplement (Rule: REUSE).

## Guiding constraints
- **Sync-agnostic (ADR-0004).** Recipes + a read-only checker only. No engine.
- **Reuse the shared foundations.** `readVault` (canonical walker),
  `validateConcept`, `reindex --check`, the register-hook dispatch — all
  consumed, none forked.
- **Minimize the shared-surface diff.** `doctor` has a `register` function, so
  the single dispatch loop in `cli-program.ts` wires it automatically —
  `cli-program.ts` is **not** touched. Only `registry.ts` gets +1 import and +1
  entry. `tests/cli.test.ts` iterates `COMMANDS`, so doctor is covered without
  editing that test (the stub guard stays `['recall','promote']`).
- **Rule 11.** Freeze the round-trip protocol; put sync fixtures in a new path
  (`tests/fixtures/sync/`), never mutate the locked v1 corpus.

## Group plan

### G1 — Git-spine doc + vault assets (no src coupling)
`docs/sync/git-spine.md`, `docs/sync/assets/vault.gitignore`,
`docs/sync/assets/s3-iam-policy.json`. Private remote options, Mac = write node,
commit cadence, revert (NFR-4), auth, read-mostly discipline.

### G2 — Remotely Save → S3 recipe
`docs/sync/remotely-save-s3.md`. Bucket + least-privilege IAM (asset policy),
plugin config Mac+Android, E2E encryption + out-of-band key management, scheduled
sync, cost note (not free past the AWS free tier).

### G3 — Obsidian Git (Android) recipe
`docs/sync/obsidian-git.md`. Install, PAT auth, clone, pull schedule, scoped
storage, conflict avoidance; marked the canonical zero-cost verified path.

### G4 — `engram doctor` (the instrument)
`src/commands/doctor.ts` (`runDoctor` + `caseFoldCollisions` + `registerDoctor`);
one entry in `src/commands/registry.ts`. Reuses `readVault`, `validateConcept`,
`reindex`. Read-only. Non-zero exit on OKF error or conflict marker; CRLF/BOM/
stale-index/no-git are warnings. `tests/doctor.test.ts` over clean/invalid/
conflict/CRLF/BOM/case-collision/no-git/stale vaults. **No `src/vault/walk.ts`**
— Phase 1's walker exists, so we import it (design open-question resolved).

### G5 — Automated round-trip fidelity test
`tests/round-trip.test.ts` + `tests/fixtures/sync/mac-note.md`. Real git
init/commit/clone transport + S3 byte-copy transport; assert byte-faithful +
`validateConcept().ok`; adversarial CRLF/BOM/NFD; `engram doctor` clean on the
cloned checkout.

### G6 — Verified procedure + M5 evidence + tracking
`docs/sync/round-trip.md`; `evidence/README.md` (capture checklist + status);
ADR-0013, ADR-0014; phase `overview/plan/tasks/history`; own-row `status.md`;
append `changelog/2026-07.md`.

## Verification (Rule 12)
- `npm run check` exit 0 (fresh) — gate for the whole phase.
- Fresh CLI evidence of `engram doctor` exit codes on real vaults.
- Round-trip test green.
- Real-device Android screenshots deferred to a device run before sign-off.

## Landing (Rule 6 / Rule 15)
- Land order for Wave 2 is **2 → 4 → 3**; Phase 3 lands last, rebasing onto the
  updated `main` after Phases 2 and 4.
- Reconcile on landing: `src/commands/registry.ts` (import + entry) and any ADR
  number / `specs/decisions/README.md` row collision with Phases 2/4 (renumber
  0010/0011 if taken). `cli-program.ts` and `tests/cli.test.ts` are untouched.
