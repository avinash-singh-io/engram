# Phase 6 — Onboarding & OKF Migration

> **Status**: verified — awaiting merge (v0.6.0)
> **Branch**: `phase-6-onboarding`
> **Target release**: v0.6.0

## Goal

Make engram resolve setup issues and adopt existing notes **through the tool**,
not by hand: `init` configures the detected editor + git; a new `migrate` command
transforms plain Markdown into OKF concepts; and each agent adapter emits its
native instructions pointer so the right agent actually loads the vault contract.

## Scope (In)

1. **Editor-adapter layer** (`src/editors/`) — vendor-agnostic `EditorAdapter`
   (`id`, `detect(vaultRoot)`, `setup(vaultRoot)`); **Obsidian** is the first
   (detect `.obsidian/`; merge `app.json` → `useMarkdownLinks: true`,
   `newLinkFormat: "absolute"`). engram never *depends* on an editor; it only
   configures one it detects. More editors can be added later.
2. **`init` auto-setup** — after scaffolding, run detected editor adapters' setup
   and `git init` if the vault isn't a repo. Non-destructive; `--no-editor-setup`
   / `--no-git` to opt out.
3. **Agent-adapter native pointer** — each agent adapter emits its native
   instructions file as a thin pointer to `AGENTS.md` (Claude → `CLAUDE.md`),
   keeping AGENTS.md the single source of truth (fixes the "Claude Code has no
   CLAUDE.md" gap).
4. **`engram migrate [dir]`** — transform non-conformant Markdown into OKF
   concepts: best-effort frontmatter (title from first heading/filename,
   description from first sentence, tags from folder path, timestamp from mtime),
   convert `[[wikilinks]]` → standard absolute links (resolve by filename/title),
   `--dry-run` (default) / `--write`, re-validate + report.

## Scope (Out)
- Semantic/LLM-derived metadata (migration is deterministic, best-effort).
- New editors beyond Obsidian (the interface makes them cheap to add later).

## Key decisions (→ ADRs)
- **ADR-0015** — Editor adapters: engram is editor-agnostic; detect-and-configure.
- **ADR-0016** — OKF migration: deterministic best-effort derivation + wikilink conversion; non-destructive, dry-run-first.
- Agent adapters emit a native instructions pointer to AGENTS.md (extends ADR-0011).

## Acceptance (Rule 12)
- [x] `EditorAdapter` + Obsidian adapter; `init` in a dir with `.obsidian/` writes standard/absolute `app.json`; `init` in a non-repo runs `git init`
- [x] Claude adapter scaffolds a `CLAUDE.md` pointing to `AGENTS.md`
- [x] `engram migrate --dry-run` reports a plan; `--write` makes non-conformant notes pass `validateConcept`; `[[wikilinks]]` become standard links
- [x] `npm run check` exits 0 with fresh output
- [x] `engram doctor` on a migrated fixture vault → 0 errors
