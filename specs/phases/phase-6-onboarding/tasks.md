# Phase 6 — Tasks

## G0 — Editor adapters + agent pointer ✅
- [x] `src/editors/` (EditorAdapter, Obsidian, registry, setupEditors)
- [x] Claude adapter emits `CLAUDE.md` → AGENTS.md pointer
- [x] tests (5)

## G1 — init auto-setup ✅
- [x] `runInit` runs `setupEditors` + `git init` (opt-out `--no-editor-setup`/`--no-git`)
- [x] tests (5)

## G2 — Migration core
- [ ] `src/migrate/derive.ts` (frontmatter derivation)
- [ ] `src/migrate/links.ts` (wikilink → standard)
- [ ] `src/migrate/migrate.ts` (vault plan)
- [ ] tests

## G3 — migrate command
- [ ] `src/commands/migrate.ts` (register; dry-run/write; report)
- [ ] update `tests/cli.test.ts`
- [ ] tests

## G4 — Verify, docs, release
- [ ] ADR-0015, ADR-0016
- [ ] README (migrate + init auto-setup); bump 0.6.0
- [ ] `npm run check` green; retrospective + evidence
