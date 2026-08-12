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

- [x] Tests first (13 tests)
- [x] Enumerate authored content under a root, via `FileStore`
- [x] **TD-004**: detect a nested root on the explicit `.engram/` marker **only**
- [x] Skip the nested subtree entirely — asserted that no private path leaks
- [x] Return it as a reported finding, not a silent skip
- [x] **Negative tests ×3**: an ordinary subdirectory is NOT skipped; a
      similarly-named dir (`engram-notes/`, `my.engram.backup/`) is NOT a marker;
      the vault's OWN `.engram/` sidecar is NOT a nested root
- [x] Several nested roots at different depths all detected
- [x] Reserved-file detection at any depth — and `my-index.md` is not excluded
- [x] Derived state excluded from authored content
- [x] Enumeration-only counting; sorted output so generation is deterministic
- [x] An empty vault is not an error
- [x] Verify: `npx vitest run tests/ops/walk.test.ts` — 13 passed

## Group 2 — View generation — parallel with 3

- [x] Tests first (17 tests)
- [x] `index.md` — projection of `part-of`, with an `Unfiled` section for nodes
      that have no container
- [x] `views/superseded.md` — names what replaced each stale node
- [x] `views/recent.md` — most recent first, ties broken by id
- [x] `views/orphans.md` — nodes with no edges in either direction
- [x] **No generated file embeds a generation timestamp** — proven by generating
      twice with different clocks and comparing byte-for-byte
- [x] Deterministic regardless of input order
- [x] Every generated file declares itself generated and safe to delete
- [x] Spaced paths percent-encoded (BUG-001 holds downstream of the codec)
- [x] Verify: `npx vitest run tests/views/` — 17 passed

## Group 3 — `doctor` — parallel with 2

- [x] Tests first (14 tests)
- [x] Structural findings: slug collisions, path-as-identity, dangling edges
- [x] Walker findings: nested roots, derived paths engram did not write
- [x] **Run every registered relation's detective form**, reported by name
- [x] **Fixed a real gap the detective caught**: the v0.2 codec hardcoded its
      relation list, so `part-of` was registered but never serialized. The codec
      now reads the registry
- [x] Obsidian link-format detection via `Detector` (ADR-0025/0028)
- [x] Derived-file conflict → report "regenerate, never merge"
- [x] **Read-only** — asserted by comparing every file before and after
- [x] Warnings never fail: collisions, missing slugs, dangling edges, bad YAML
- [x] Verify: `npx vitest run tests/ops/doctor.test.ts` — 14 passed

## Group 4 — `reindex` and `init`

- [x] Tests first (14 tests)
- [x] `reindex` regenerates all derived state
- [x] `reindex` is **idempotent** — a second run changes nothing, and a run with a
      clock 73 years later still changes nothing
- [x] **Delete-and-rebuild restores byte-identical** — ADR-0029's safety claim
      under test, not asserted
- [x] `reindex` surfaces walker findings and read warnings rather than swallowing
- [x] `init` scaffolds ADR-0023's reference tree + AGENTS.md
- [x] `init` writes the derived-state gitignore, **appending** rather than clobbering
- [x] `init` is **non-destructive** — an existing AGENTS.md survives untouched
- [x] `init` is safe to run twice
- [x] `--structure` accepts `default` only; anything else errors naming what ships
- [x] Verify: `npx vitest run tests/ops/reindex.test.ts` — 14 passed

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
