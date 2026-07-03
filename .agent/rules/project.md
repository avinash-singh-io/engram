# Project Rules

## Navigation (Where to Find Things)

| Question | File |
|----------|------|
| Current state / what phase? | `specs/status.md` |
| What's in the backlog? | `specs/backlog/backlog.md` |
| Phase tasks/progress? | `specs/phases/phase-N-*/tasks.md` |
| Why was X chosen? | `specs/decisions/NNNN-*.md` |
| Roadmap / timeline? | `specs/planning/roadmap.md` |

> **First file to read: ALWAYS `specs/status.md`.**

---

## Autonomous Behaviors (Always-On Rules)

### Rule 1: Always Orient First
Before ANY work, read `specs/status.md`.

### Rule 2: Auto-Update Tracking After Changes
After completing ANY meaningful work, automatically update:
1. Your phase's `tasks.md` (the phase bound to your branch — Rule 15) — `[x]` complete, `[/]` in-progress
2. `specs/status.md` — if phase progress, blockers, or P0 items changed (touch only your own lane's row — Rule 15)
3. `specs/changelog/YYYY-MM.md` — log what changed (one line per change, append-only)

**Red Flags (STOP and update now):**
- "I'll batch tracking at the end" — context fades; log now
- "Too small to log" — small changes accumulate into invisible drift
- "The diff makes it obvious" — diffs show *what*; logs explain *why*

### Rule 3: Auto-Track Discoveries
When you discover a bug, tech debt, or enhancement:
- Add it to `specs/backlog/backlog.md` immediately
- Mention it to the user

### Rule 4: Pre-Phase Bug Check
Before starting a new phase, scan backlog for P0/P1 bugs.

### Rule 5: Phase Boundary Awareness
When completing the last task: prompt user to run `/complete-phase`.

### Rule 6: Git Lifecycle
- Before ANY code change: check branch; auto-create feature branch if on main/staging
- Auto-commit after each logical unit with conventional commits (`feat`/`fix`/`docs`/`refactor`/`chore`/`infra`/`test`/`perf`/`build`/`ci`/`style`/`revert`)
- Never auto-merge to staging or main — always ask user
- Delete merged feature branches once confirmed merged
- **Enforced by installed git hooks** (not just convention): `commit-msg`
  validates the message; `pre-push` blocks direct pushes to main/staging without
  the single-use `.momentum/merge-approved` sentinel and blocks release tags
  lacking verification evidence. Emergency bypass: `MOMENTUM_SKIP_HOOKS=1`.

**Red Flags (STOP and switch branches):**
- "Just one commit to main" — branch first, decide later
- "I'll create the branch after these edits" — branch is non-optional
- "--no-verify just this once" — the hooks are real; use auditable `MOMENTUM_SKIP_HOOKS=1` only for genuine emergencies
- "Force push is fine" — `--force-with-lease` minimum

### Rule 7: Plan Before Implementing
For non-trivial work: use `/brainstorm-phase` first.

### Rule 8: Record Phase History
Append meaningful changes to the history.md of the phase bound to your branch — `specs/phases/<phase-bound-to-your-branch>/history.md` (Rule 15).

**Trigger → Entry type:**
- ADR created/changed → `[DECISION]`
- Scope added/reduced → `[SCOPE_CHANGE]`
- Backlog item added → `[DISCOVERY]`
- Feature added to plan → `[FEATURE]`
- Architecture pattern changed → `[ARCH_CHANGE]`
- Locked evaluator defined or changed → `[EVALUATOR]`
- Anything else worth a future reader's time → `[NOTE]`

After writing an entry: update `specs/decisions/impact-map.json` with new topics.

The hook script `scripts/check-history-reminder.sh` runs after edits as a safety net.

Format (APPEND ONLY):
```
### [TYPE] YYYY-MM-DD — Short title
Topics: topic-1, topic-2
Affects-phases: phase-N-name (or "none")
Affects-specs: path/to/file.md#section (or "none")
Detail: One to three sentences.

---
```

**Red Flags (STOP and log):**
- "I'll write history at phase end" — you won't remember the *why*
- "Not important enough to log" — log it or revert it
- "It's in the commit message" — history is canonical

### Rule 9: Doc Sync Protocol
- During a phase: record to history only. Do NOT update other specs.
- At phase completion: run `/sync-docs` BEFORE `/complete-phase`.

**Multi-repo projects only:** NEVER modify docs in another repo. If a history `Affects-specs:` path starts with `../`, leave that file alone and flag the cross-repo impact to the user with the exact path. Cross-repo doc ownership is structural — never quietly change docs you don't own.

### Rule 10: Architecture Specs Stability (monorepo only)
Files under `specs/architecture/` are constitutional documents.

**During phase implementation:** READ specs as stable reference; NEVER modify them; log gaps as `[ARCH_CHANGE]` with `Affects-specs:`.

**At phase completion (`/sync-docs`):**
- **Additive changes** (new fields, new ports, extending an existing design) → update specs directly, no ADR
- **Decisional changes** (approach changes, design direction shifts) → ADR amendment FIRST, then spec update

**Red Flags (STOP and route correctly):**
- "Just one field, not a real change" — additive: fine at completion, not now
- "Faster to fix the spec than log the gap" — catastrophic globally
- "Spec is wrong, code is right, update spec" — only after an ADR

### Rule 11: Evaluator Discipline — Lock Evaluators Before Loops
Before building any learning/optimization loop:
1. Define the evaluation set (fixed corpus with known-good outputs)
2. Define the scalar (single number that improves or doesn't)
3. Commit the evaluator to `tests/benchmarks/` with a version tag
4. Build the loop AFTER the evaluator is committed
5. NEVER change the evaluator while the loop is being optimized

**Red Flags (STOP and freeze):**
- "Just one tweak to the eval so this run looks better" — exactly the failure mode
- "Lock the evaluator after we know what works" — you can't know without a lock
- "The eval doesn't measure what we care about" — version-bump to v2; don't mutate v1

If the eval set or scorer needs changes mid-loop, version-bump the evaluator. Never mutate the locked version.

### Rule 12: Verify Before Claim
Before marking any task `[x]`, run the verification command (test, lint, typecheck, smoke, build) and read its output. Fresh evidence in this session — not confidence, not similar-earlier-tests, not "looks right" — is the only signal of completion.

**Red Flags (STOP and run the verification):**
- "I'm confident this works" — confidence is not evidence
- "The change is too small to test" — "small" is the most common regression predicate
- "I'll batch verifications at the end" — you won't know which change broke what
- "Unit tests pass" — unit tests miss wiring bugs; run the integration path too

**Anti-rationalization:**
- "The diff is obviously correct" — diffs lie when context is incomplete
- "Type checking passed" — types catch shape errors, not behavior
- "CI will catch it" — CI catches it AFTER you claimed done

If verification was not run in this session, the task is unverified — leave it `[/]` (in progress). If a command can't run in the current environment, say so explicitly — never silently downgrade to "looks correct".

### Rule 13: Test-Driven Development (TDD) (Opt-in)
If enabled in the project rules extensions (under `## Project Extensions` in this file or `AGENTS.md`), follow a strict test-first development loop:
1. **Red**: Write a unit or integration test that specifies the new behavior *before* writing any application code.
2. **Verify Failure**: Run the test runner and verify that the newly added test fails. Do not write any implementation code until you have seen the test fail.
3. **Green**: Write the minimal application code necessary to make the test pass.
4. **Refactor**: Clean up and optimize the code while keeping all tests green.

**Red Flags (STOP and write tests first):**
- "I will write the tests at the end" — writing tests post-facto is not TDD and leads to confirmation bias.
- "The change is too simple to warrant a test-first approach" — simple changes are excellent TDD candidates to establish correct wiring.

### Rule 14: Work-Type Escalation — Pick the Lightest Type That Fits
Not every change is a phase. Three work types (see `specs/adhoc/README.md`):
- `phase` — net-new features / cross-cutting / architectural work → `/brainstorm-phase` → `/start-phase` → … → `/complete-phase`.
- `quick-task` — a bounded bugfix / chore / audit / dep bump → `/hotfix`: an ad-hoc record (`specs/adhoc/<id>/record.md`) + the Rule 12 gate, no phase scaffold.
- `spike` — time-boxed throwaway exploration → `/hotfix --spike`: declared, gate-exempt, record what was learned.

**Pick the lightest type that fits; escalate only when scope/risk justifies it.** A quick-task MUST become a phase when it touches >~5 files of production code, modifies `specs/architecture/`, needs an ADR, changes a public contract, or displaces a planned phase.

**Red Flags:**
- "This `/hotfix` is growing" — if it now touches architecture or many files, escalate to a phase.
- "I'll spin up a whole phase for a one-line fix" — over-ceremony; a `/hotfix` quick-task is right.

### Rule 15: Concurrent Workstreams — Lanes
Multiple workstreams may be active in one repo at once (see ADR-0001 in `specs/decisions/`). A **lane** = one branch (usually in its own worktree) bound to one phase or ad-hoc record.
- Your phase is the phase bound to your branch: `phase-N-shortname` ↔ `specs/phases/phase-N-shortname/`. `specs/status.md`'s Active Phase table (one row per lane) is the fallback and the cross-lane overview — not the binding.
- Write only your own phase's artifacts (`tasks.md`, `history.md`, `evidence/`). Shared tracking files (`status.md`, `backlog.md`, `changelog/`) are append / own-row-touch only — never rewrite other lanes' entries.
- Landing order (Rule 6): lanes land on `main` one at a time; suite green on updated `main` between landings; remaining lanes rebase.
- Brainstorms and spikes are off-lane — they never touch the Active Phase table.

**Red Flags (STOP and re-scope to your lane):**
- "I'll fix that other lane's tasks.md while I'm here" — another lane's artifact; leave it and flag it.
- "Which phase am I on? I'll take status.md's first row" — your branch decides; status.md is the overview.
- "Both lanes are done, merge them together" — one at a time, suite green in between.

---

## Naming Conventions

Backlog IDs: `BUG-NNN` | `FEAT-NNN` | `TD-NNN` | `ENH-NNN`

Priorities (with SLA):
- P0 (critical, < 1 day)
- P1 (high, < 1 week)
- P2 (medium, < 1 phase)
- P3 (low, best-effort)

Branches: `phase-N-name` | `feat/desc` | `fix/desc` | `refactor/desc` | `infra/desc`

Commits: `feat:` | `fix:` | `docs:` | `refactor:` | `chore:` | `infra:` (CI/build/deploy/tooling) — plus `test:` `perf:` `build:` `ci:` `style:` `revert:` (all accepted by the `commit-msg` hook)

---

## Project Extensions

> Everything below this heading is preserved across `momentum upgrade`.
> Add project-specific agent rules here. Anything above is managed by momentum.
