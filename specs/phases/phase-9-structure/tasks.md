# Phase 9 — Tasks

> Legend: `[ ]` todo · `[/]` in progress · `[x]` done
> Execution: Group 0 → Group 1 → (Groups 2 + 3 parallel) → Group 4 → Group 5 → Group 6
> **TDD is on** (Rule 13) — the failing test comes first in every group.

## Group 0 — Register `part-of`, derived-state policy — blocks everything

- [x] Tests first (12 tests)
- [x] Register `part-of`: `invalidatesTarget: false`, meaning, detective form
- [x] Update the exactly-two-relations test to exactly-three, deliberately
- [x] Assert containment does **not** invalidate: reorganising a tree must not
      silently mark its contents superseded
- [x] `core/paths.ts` — reserved filenames, derived paths, root marker, ignored
      dirs, all in one place so walker and generators cannot drift
- [x] `.gitignore` fragment for derived state (ADR-0029)
- [x] Verify: `npx vitest run tests/core/` — 54 passed

## Group 1 — The walker

- [ ] Tests first
- [ ] Enumerate authored content under a root, via `FileStore`
- [ ] **TD-004**: detect a nested root on the explicit `.engram/` marker **only**
- [ ] Skip the nested subtree entirely — nothing under it is ever enumerated
- [ ] Return it as a reported finding, not a silent skip
- [ ] **Negative test**: an ordinary subdirectory is NOT skipped (a misfire here is
      worse than the disclosure it guards against)
- [ ] Reserved-file detection at any depth: `index.md`, `log.md`, `AGENTS.md`,
      `CLAUDE.md` — never authored content
- [ ] Enumeration-only counting: structure without reading bodies
- [ ] Verify: `npx vitest run tests/ops/walk.test.ts`

## Group 2 — View generation — parallel with 3

- [ ] Tests first
- [ ] `index.md` — projection of `part-of`
- [ ] `views/superseded.md` — from `supersedes` edges
- [ ] `views/recent.md` — from assertion stamps
- [ ] `views/orphans.md` — nodes with no edges
- [ ] **No generated file embeds a generation timestamp** (this is what makes
      `reindex` idempotent)
- [ ] Every generated file is deterministic for a given input set
- [ ] Verify: `npx vitest run tests/views/`

## Group 3 — `doctor` — parallel with 2

- [ ] Tests first
- [ ] Structural findings: slug collisions, path-as-identity, dangling edges
- [ ] Walker findings: nested roots, reserved-path content a generator did not write
- [ ] **Run every registered relation's detective form**, reported by name
- [ ] Obsidian link-format detection from `.obsidian/app.json` via `Detector`
- [ ] Derived-file conflict → report "regenerate, never merge"
- [ ] **Read-only** — no writes at all in this phase
- [ ] Exit non-zero on integrity **failures** only, never on warnings
- [ ] Verify: `npx vitest run tests/ops/doctor.test.ts`

## Group 4 — `reindex` and `init`

- [ ] Tests first
- [ ] `reindex` regenerates all derived state
- [ ] `reindex` is **idempotent** — a second run changes nothing
- [ ] `init` scaffolds ADR-0023's reference tree
- [ ] `init` writes the derived-state gitignore and runs a first `reindex`
- [ ] `init` is **non-destructive** — never overwrites an existing file
- [ ] `--structure` accepts `default` only; anything else exits 2 with the reason
- [ ] Verify: `npx vitest run tests/ops/reindex.test.ts`

## Group 5 — CLI wiring and e2e

- [ ] `engram init` · `engram reindex` · `engram doctor`
- [ ] e2e: `init` on an empty dir → `reindex` → `doctor`, all clean
- [ ] **e2e (load-bearing)**: delete every derived file, `reindex`, compare
      byte-for-byte. This is ADR-0029's safety claim under test
- [ ] e2e: a nested root is skipped and named in output
- [ ] Verify: `npx vitest run tests/e2e/`

## Group 6 — Verification

- [ ] Full `npm run check` exits 0 with fresh output
- [ ] Deliberate import violation re-proves both architecture rules fire
- [ ] Smoke-test the **built** binary, not just the source
- [ ] Acceptance sweep from `overview.md` — every box
- [ ] Capture output for `retrospective.md` § Verification Evidence (Rule 12)
- [ ] Write `retrospective.md`
- [ ] Close TD-004 in the backlog
- [ ] Run `/sync-docs` and `/complete-phase`
