# Phase 6 — Onboarding & OKF Migration — Retrospective

> **Completed**: 2026-07-03 · **Release**: v0.6.0 · **Branch**: `phase-6-onboarding`

## Summary

Made engram resolve setup and adopt existing notes *through the tool*: an
editor-adapter layer (Obsidian first) + `init` auto-setup (editor config + git),
each agent adapter now emits its native instructions pointer (Claude → CLAUDE.md),
and a new `engram migrate` command turns plain Markdown into OKF concepts.

## What went well
- **Vendor-agnostic by construction.** The `EditorAdapter` seam means engram
  configures Obsidian only when detected; adding another editor is one module.
- **The register-hook + reserved-file patterns paid off again** — wiring `migrate`
  was a one-entry registry change, and the CLAUDE.md pollution fix was a one-line
  reserved-filename addition.
- **e2e caught a real bug** — `migrate` had adopted `CLAUDE.md` as a concept;
  reserving it fixed it structurally (not by special-casing).

## What didn't (and how it was handled)
- **Claude Code had no CLAUDE.md.** Phase 4 converged all agents on AGENTS.md, but
  Claude Code doesn't reliably load it. Fixed: the Claude adapter emits a thin
  `CLAUDE.md` pointer to AGENTS.md (no duplication).

## Deferred
- More editor adapters (VS Code, Logseq) — the interface makes them cheap.
- LLM-assisted migration metadata (out of scope — migration stays deterministic).

## Verification Evidence

Captured fresh 2026-07-03 (Rule 12).

### `npm run check` (typecheck + lint + format:check + test + build)
```
exit code: 0
Tests  191 passed (191)
ESM ⚡️ Build success · DTS ⚡️ Build success
```

### End-to-end (built binary, temp vault with .obsidian + plain notes)
```
$ engram init          # + CLAUDE.md; ⚙ obsidian: useMarkdownLinks=true, newLinkFormat="absolute"; ⚙ git: initialized
$ engram migrate       # dry-run: lists derived title/type/tags + link conversions (CLAUDE.md correctly NOT listed)
$ engram migrate --write   # migrated N file(s); indexes regenerated
$ engram doctor        # 0 errors
```

### Acceptance criteria
All met: editor adapter + Obsidian app.json config; init git-inits a non-repo;
Claude adapter scaffolds CLAUDE.md → AGENTS.md; migrate dry-run/write makes notes
pass `validateConcept` and converts wikilinks; `npm run check` exit 0.
