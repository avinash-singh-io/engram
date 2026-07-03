# Phase 6 — Plan

# Order: G0 → G1 → G2 → G3 → G4

## G0 — Editor-adapter layer + agent native pointer
**Commit:** `feat(editors): editor-adapter layer (Obsidian) + agent native pointer`
- `src/editors/{types,obsidian,index}.ts` — `EditorAdapter` (id/detect/setup); Obsidian merges `.obsidian/app.json`.
- `setupEnvironment(vaultRoot, opts)` — run detected editors + optional `git init`.
- Agent adapters: add `agentFile()` (native instructions filename) + emit a pointer to `AGENTS.md` (Claude → `CLAUDE.md`).
- Tests: obsidian detect+merge; env setup; claude pointer content.

## G1 — `init` auto-setup
**Commit:** `feat(init): auto-configure detected editor + git on init`
- `runInit` runs `setupEnvironment` (editors + git) unless `--no-editor-setup`/`--no-git`; emits agent native pointer files.
- Tests: init in a `.obsidian` dir writes standard links; init in non-repo git-inits; CLAUDE.md created.

## G2 — Migration core
**Commit:** `feat(migrate): OKF frontmatter derivation + wikilink conversion`
- `src/migrate/derive.ts` — deriveFrontmatter(path, body, mtime) (title/description/tags/timestamp/type).
- `src/migrate/links.ts` — convert `[[wikilink]]`/`[[t|alias]]` → `[alias](/path.md)` via a filename/title resolver.
- `src/migrate/migrate.ts` — plan a vault: for each non-conformant concept, produce migrated text; skip already-valid.
- Tests: derivation, wikilink conversion, plan.

## G3 — `engram migrate` command
**Commit:** `feat(cli): engram migrate (dry-run/write)`
- `src/commands/migrate.ts` — register via the register-hook; `--dry-run` (default)/`--write`/`--type`; report; reindex + doctor-style validate on write.
- Update `tests/cli.test.ts` (migrate registered).
- Tests: dry-run plan; write makes fixtures valid.

## G4 — Verify, docs, tracking, release
**Commit:** `docs: complete Phase 6` (+ ADR-0015/0016, README, retrospective)
- ADR-0015 (editor adapters), ADR-0016 (migration).
- README: `migrate` + init auto-setup; bump 0.6.0.
- `npm run check` green; retrospective with evidence.
