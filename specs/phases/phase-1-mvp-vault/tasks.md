# Phase 1 — Tasks

> `[ ]` todo · `[/]` in-progress · `[x]` done (only after fresh passing verification — Rule 12).

## G0 — Vault core + frontmatter serializer ✅
- [x] `src/format/serialize.ts` (inverse of parseFrontmatter; flow-style tags) + round-trip test
- [x] Additive export from `src/format/index.ts` (+ `src/index.ts` exports vault)
- [x] `src/vault/paths.ts` (root discovery, link↔fs, ignore globs)
- [x] `src/vault/config.ts` (`.engram/config.json` load/write)
- [x] `src/vault/read.ts` (canonical walker → `VaultModel`)
- [x] `src/vault/write.ts` (non-destructive atomic write) + `tests/{serialize,vault-read}.test.ts` (6 tests)

## G1 — Deterministic index generator ✅
- [x] `src/indexer/generate.ts` (pure; nested child-index links; root okf_version)
- [x] `src/indexer/reindex.ts` (walk + regen per-dir; `--check`; ancestor dirs indexed for descent)
- [x] Idempotency (LF, unicode-aware sort, trailing newline) — asserted
- [x] `tests/indexer.test.ts` (2 tests)

## G2 — Log writer + write-hook engine ✅
- [x] `src/vault/log.ts` (append-only, newest-first; pure `renderLog`)
- [x] `src/hooks/payload.ts` (parse PostToolUse stdin; tolerant)
- [x] `src/hooks/write-hook.ts` (validate → reindex + log Updated; fail-loud/blocked)
- [x] `tests/write-hook.test.ts` (5 tests)

## G3 — CLI implementations + dispatch wiring ✅
- [x] `registry.ts` register-hook + `cli-program.ts` single dispatch loop + hidden `hook`
- [x] `src/adapters/*` (interface + Claude Code adapter) — shared foundation
- [x] `src/commands/init.ts` (non-destructive scaffold + settings deep-merge + `--force`)
- [x] `src/commands/capture.ts` (text/stdin → inbox)
- [x] `src/commands/refine.ts` (inbox → concept, validate-gated, archive, reindex+log)
- [x] `src/commands/link.ts` (`--suggest` tag-overlap; insert absolute link; re-validate)
- [x] `src/commands/reindex.ts` (delegates; `--check`)
- [x] `src/commands/hook.ts` (stdin write-hook entry; fail-loud exit 2)
- [x] Update `tests/cli.test.ts` (surface + hidden hook + stub guard)

## G4 — Bundled scaffold assets ✅
- [x] `assets/vault/*` (AGENTS.md, log.md, concept template, gitignore)
- [x] `package.json` files[] += assets; runtime asset resolution from dist (verified via built binary)

## G5 — Claude Code adapter commands + settings hook ✅
- [x] `assets/claude/commands/{capture,refine,link,reindex}.md`
- [x] `assets/claude/settings.json` (PostToolUse Write|Edit|MultiEdit → `engram hook`)

## G6 — Obsidian setup doc ✅
- [x] `docs/obsidian-setup.md` + `assets/obsidian/obsidian-setup.md` (scaffolded into `.engram/`)

## G7 — End-to-end acceptance tests ✅
- [x] `tests/init.test.ts` + `tests/e2e-vault.test.ts` (init→capture→refine→link→reindex×2; validate-gate; write-hook) + CliError refactor for testable failures
- [x] `npm run check` exit 0 — 52 tests; fresh evidence captured this session

## G8 — Tracking, ADRs, docs sync
- [ ] ADR-0008 (write-hook), ADR-0009 (.engram sidecar)
- [ ] `/sync-docs`; status/changelog/roadmap; additive `architecture/overview.md`
- [ ] retrospective + Verification Evidence
