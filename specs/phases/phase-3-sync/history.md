# Phase 3 — History

> Append-only (Rule 8). Newest at the bottom.

### [NOTE] 2026-07-03 — Phase 3 opened as a Wave 2 lane
Topics: sync, tooling
Affects-phases: phase-3-sync
Affects-specs: specs/planning/parallel-execution-plan.md
Detail: Phase 3 (Sync + Multi-Device) started in an isolated worktree on branch
`phase-3-sync`, in parallel with Phases 2 and 4 (Rule 15). Design brief:
`design-p3.json`. Scope is recipes + a read-only verifier, NOT a sync engine —
Engram stays sync-agnostic (ADR-0004). Lands last of Wave 2 (order 2 → 4 → 3).

---

### [DECISION] 2026-07-03 — ADR-0010: canonical free sync path
Topics: sync
Affects-phases: phase-3-sync
Affects-specs: specs/decisions/0010-canonical-free-sync-path.md
Detail: ADR-0004 named two mobile legs without deciding which M5 is proven
against. Decided the **canonical free, verified path is Obsidian Git + a free
private GitHub repo** (zero cost, no expiry, git-native so diffs/revert reach the
phone). Remotely Save → S3 is documented as the AWS-native alternative but
labelled *not free past the AWS free tier*; on that leg the E2E password lives
out-of-band and git — not S3 — is the recovery source of truth.

---

### [DECISION] 2026-07-03 — ADR-0011: `engram doctor` + frozen round-trip protocol as the M5 instrument
Topics: sync-verification, tooling
Affects-phases: phase-3-sync
Affects-specs: specs/decisions/0011-m5-verification-instrument.md
Detail: M5 needed a checkable proof, not an eyeball. Shipped `engram doctor`, a
read-only command that reuses the shipped `validateConcept` + `reindex --check`
and adds sync-health checks (conflict markers, CRLF/BOM, case-fold collisions,
git presence) — explicitly not a sync engine. Froze the M5 evaluator (Rule 11):
byte-fidelity + OKF-validity through simulated git-clone and S3-copy transports
(+ adversarial CRLF/BOM/NFD) + a real-device Obsidian eyeball. Version-bump, never
mutate.

---

### [ARCH_CHANGE] 2026-07-03 — New `doctor` command on the shared CLI surface
Topics: tooling, sync-verification
Affects-phases: phase-3-sync
Affects-specs: specs/architecture/overview.md, src/commands/registry.ts
Detail: Added `engram doctor` as a data-driven registry entry (register-hook
pattern) — +1 import, +1 entry in `src/commands/registry.ts`; the single dispatch
loop in `cli-program.ts` wires it automatically, so `cli-program.ts` is untouched.
Additive extension of the Phase 1 command surface (Rule 10 — record now, sync
specs at completion). `tests/cli.test.ts` iterates `COMMANDS`, so the new command
is covered without editing it (stub guard stays `['recall','promote']`). Merge
surface shared with Phases 2/4/5 — serialize the registry edit per Rule 6.

---

### [DISCOVERY] 2026-07-03 — Case-insensitive host FS can't create a collision fixture
Topics: sync-verification
Affects-phases: phase-3-sync
Affects-specs: src/commands/doctor.ts
Detail: The doctor case-fold collision check can't be exercised via on-disk files
on a case-insensitive host (macOS) — writing `Note.md` then `note.md` yields one
file. Refactored the detection into a pure exported `caseFoldCollisions(paths)`
and unit-tested that directly, so the logic is deterministic on any platform.
The runDoctor path still catches collisions when a case-sensitive backend
(Linux/git) produces both paths. No backlog item — resolved in-lane.

---

### [NOTE] 2026-07-03 — Phase 3 verified (device screenshots pending)
Topics: sync, sync-verification, tooling
Affects-phases: phase-3-sync
Affects-specs: specs/phases/phase-3-sync/evidence/README.md
Detail: All six groups built and verified — `npm run check` exit 0, 65 tests
(52 baseline + 13 new). Fresh CLI evidence: `engram doctor` clean → exit 0,
OKF-invalid → exit 1, conflict marker → exit 1. Round-trip test green through
git-clone and S3-copy transports incl. adversarial cases. Real-device Android
screenshots are the one open item (headless lane, no device) — capture before
`/complete-phase`.

---
