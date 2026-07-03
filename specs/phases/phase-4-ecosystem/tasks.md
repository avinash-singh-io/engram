# Phase 4 — Tasks

> `[ ]` todo · `[/]` in-progress · `[x]` done (only after fresh passing verification — Rule 12).

## G1 — Adapter seam + shared command definitions
- [ ] Extend `AdapterFile` with inline `content?` (reuse shipped seam)
- [ ] `src/adapters/commands.ts` — `CommandDefinition` + `COMMAND_DEFINITIONS` (incl. promote)
- [ ] Rewrite `src/adapters/claude.ts` to render from shared definitions
- [ ] `src/commands/init.ts` prefers inline `content`
- [ ] Remove redundant `assets/claude/commands/*.md`
- [ ] `tests/adapters/interface.test.ts`

## G2 — Codex + Antigravity adapters
- [ ] `src/adapters/codex.ts`
- [ ] `src/adapters/antigravity.ts`
- [ ] Register both in `src/adapters/index.ts`
- [ ] Golden fixtures `tests/fixtures/adapters/` + `tests/adapters/{codex,antigravity}.test.ts`

## G3 — Promote core library
- [ ] `src/promote/parse-momentum.ts`
- [ ] `src/promote/to-concept.ts` (map + `# Source` + link rewrite)
- [ ] `src/promote/promote.ts` (validate hard gate)
- [ ] `src/promote/index.ts`
- [ ] Locked golden corpus `tests/fixtures/promote/` (v1) + `tests/promote/*.test.ts`

## G4 — Promote CLI wiring + vault placement
- [ ] `src/commands/promote.ts` handler (`--type --tags --description --to --dry-run --force`)
- [ ] `src/commands/registry.ts` — bind `registerPromote`
- [ ] Update `tests/cli.test.ts` stub guard
- [ ] `tests/cli-promote.test.ts`

## G5 — E2E, golden lock, docs, tracking
- [ ] `tests/e2e/promote.test.ts` + `tests/e2e/adapters.test.ts`
- [ ] `docs/adapters.md` + `docs/promote.md`
- [ ] ADR-0010, ADR-0011 + decisions index + impact-map
- [ ] `npm run check` exit 0 (fresh evidence); tasks/history updated
