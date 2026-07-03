# Phase 3 — Tasks

> `[ ]` todo · `[/]` in-progress · `[x]` done (only after fresh passing verification — Rule 12).

## G1 — Git-spine doc + vault assets ✅
- [x] `docs/sync/git-spine.md` (private remote options, Mac=write node, cadence, revert/NFR-4, auth, read-mostly)
- [x] `docs/sync/assets/vault.gitignore` (Obsidian workspace/plugin-secret/trash/OS/cred excludes)
- [x] `docs/sync/assets/s3-iam-policy.json` (least-privilege single-bucket policy)

## G2 — Remotely Save → S3 recipe ✅
- [x] `docs/sync/remotely-save-s3.md` (bucket + IAM, plugin config Mac+Android, E2E + out-of-band key mgmt, scheduled sync, cost note)

## G3 — Obsidian Git (Android) recipe ✅
- [x] `docs/sync/obsidian-git.md` (install, PAT auth, clone, pull schedule, scoped storage, conflict avoidance; canonical free path)

## G4 — `engram doctor` (read-only checker) ✅
- [x] `src/commands/doctor.ts` — `runDoctor` (validateConcept per concept + conflict/CRLF/BOM/case-fold/index-stale/git checks) + `caseFoldCollisions` + `registerDoctor`
- [x] Reuse `readVault`, `validateConcept`, `reindex` — no walker reimplementation; no `src/vault/walk.ts`
- [x] `src/commands/registry.ts` — +1 import, +1 entry (register-hook); `cli-program.ts` untouched
- [x] `tests/doctor.test.ts` (9 tests: clean/reserved/invalid/conflict/setext-no-false-positive/CRLF+BOM/case-fold/no-git/stale-index)
- [x] Fresh CLI evidence: clean → exit 0; missing-title → exit 1; conflict marker → exit 1

## G5 — Automated round-trip fidelity test ✅
- [x] `tests/fixtures/sync/mac-note.md` (new path — locked v1 corpus untouched, Rule 11)
- [x] `tests/round-trip.test.ts` (4 tests: git-clone byte-fidelity + doctor-clean; S3 copy; format-core byte-stable; adversarial CRLF/BOM/NFD)

## G6 — Verified procedure + M5 evidence + tracking ✅ (device screenshots pending)
- [x] `docs/sync/round-trip.md` (instrument table, automated proof, real-device procedure, frozen pass criteria)
- [x] `specs/phases/phase-3-sync/evidence/README.md` (capture checklist + status)
- [x] ADR-0013 (canonical free path) + ADR-0014 (M5 instrument) + decisions README + impact-map
- [x] `overview.md`, `plan.md`, `tasks.md`, `history.md`
- [x] own-row `status.md`; append `changelog/2026-07.md`
- [x] `npm run check` exit 0 — 65 tests; fresh evidence captured this session
- [ ] Real-device Android screenshots (PENDING — headless lane; capture before `/complete-phase`)
