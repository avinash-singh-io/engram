# Phase 4 — Tasks

> `[ ]` todo · `[/]` in-progress · `[x]` done (only after fresh passing verification — Rule 12).

## G1 — Adapter seam + shared command definitions ✅
- [x] Extend `AdapterFile` with inline `content?` (reuse shipped seam)
- [x] `src/adapters/commands.ts` — `CommandDefinition` + `COMMAND_DEFINITIONS` (incl. promote)
- [x] Rewrite `src/adapters/claude.ts` to render from shared definitions
- [x] `src/commands/init.ts` prefers inline `content`; `--agent all` + validation
- [x] Remove redundant `assets/claude/commands/*.md`
- [x] `tests/adapters/interface.test.ts` (6 tests)

## G2 — Codex + Antigravity adapters ✅
- [x] `src/adapters/codex.ts` (`.codex/prompts/`)
- [x] `src/adapters/antigravity.ts` (`.antigravity/commands/`)
- [x] Register both in `src/adapters/index.ts`
- [x] Golden fixtures `tests/fixtures/adapters/` (v1) + `tests/adapters/{codex,antigravity}.test.ts`

## G3 — Promote core library ✅
- [x] `src/promote/parse-momentum.ts` (ADR + learning heuristic parser)
- [x] `src/promote/to-concept.ts` (map + `# Source` + standard-link rewrite)
- [x] `src/promote/promote.ts` (validate hard gate)
- [x] `src/promote/index.ts` (+ exported from `src/index.ts`)
- [x] Locked golden corpus `tests/fixtures/promote/` (v1) + `tests/promote/*.test.ts` (19 tests)

## G4 — Promote CLI wiring + vault placement ✅
- [x] `src/commands/promote.ts` handler (`--type --tags --description --to --dry-run --force`)
- [x] `src/commands/registry.ts` — bind `registerPromote` (dispatch loop untouched)
- [x] Update `tests/cli.test.ts` stub guard (promote no longer a stub)
- [x] `tests/cli-promote.test.ts` (4 tests: success, learning, dry-run, reject)

## G5 — E2E, golden lock, docs, tracking ✅
- [x] `tests/e2e/promote.test.ts` (2) + `tests/e2e/adapters.test.ts` (5)
- [x] `docs/adapters.md` + `docs/promote.md`
- [x] ADR-0011, ADR-0012 + decisions index + impact-map topics
- [x] `npm run check` exit 0 (94 tests, fresh evidence) + built-binary smoke; tasks/history updated
