# Phase 6 — Tasks

## G0 — Editor adapters + agent pointer ✅
- [x] `src/editors/` (EditorAdapter, Obsidian, registry, setupEditors)
- [x] Claude adapter emits `CLAUDE.md` → AGENTS.md pointer
- [x] tests (5)

## G1 — init auto-setup ✅
- [x] `runInit` runs `setupEditors` + `git init` (opt-out `--no-editor-setup`/`--no-git`)
- [x] tests (5)

## G2 — Migration core ✅
- [x] `src/migrate/derive.ts` (frontmatter derivation)
- [x] `src/migrate/links.ts` (wikilink → standard, resolved/best-guess)
- [x] `src/migrate/migrate.ts` (plan + apply; preserves existing valid fields)
- [x] tests (4)

## G3 — migrate command ✅
- [x] `src/commands/migrate.ts` (register-hook; dry-run default / `--write`; `--type`; report)
- [x] Registered `migrate` in COMMANDS (Phase 6)
- [x] Fix: `CLAUDE.md` added to RESERVED_FILENAMES (agent file, not a concept) — caught by e2e
- [x] e2e verified from built binary (init auto-setup + migrate + doctor)

## G4 — Verify, docs, release
- [ ] ADR-0015, ADR-0016
- [ ] README (migrate + init auto-setup); bump 0.6.0
- [ ] `npm run check` green; retrospective + evidence
