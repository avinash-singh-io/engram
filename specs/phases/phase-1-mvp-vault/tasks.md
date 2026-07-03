# Phase 1 — Tasks

> `[ ]` todo · `[/]` in-progress · `[x]` done (only after fresh passing verification — Rule 12).

## G0 — Vault core + frontmatter serializer ✅
- [x] `src/format/serialize.ts` (inverse of parseFrontmatter; flow-style tags) + round-trip test
- [x] Additive export from `src/format/index.ts` (+ `src/index.ts` exports vault)
- [x] `src/vault/paths.ts` (root discovery, link↔fs, ignore globs)
- [x] `src/vault/config.ts` (`.engram/config.json` load/write)
- [x] `src/vault/read.ts` (canonical walker → `VaultModel`)
- [x] `src/vault/write.ts` (non-destructive atomic write) + `tests/{serialize,vault-read}.test.ts` (6 tests)

## G1 — Deterministic index generator
- [ ] `src/indexer/generate.ts` (pure; nested child-index links; root okf_version)
- [ ] `src/indexer/reindex.ts` (walk + regen per-dir; `--check`)
- [ ] Idempotency (LF, unicode sort, trailing newline)
- [ ] `tests/indexer.test.ts`

## G2 — Log writer + write-hook engine
- [ ] `src/vault/log.ts` (append-only, newest-first)
- [ ] `src/hooks/payload.ts` (parse PostToolUse stdin)
- [ ] `src/hooks/write-hook.ts` (validate → scoped reindex + log; fail-loud)
- [ ] `tests/write-hook.test.ts`

## G3 — CLI implementations + dispatch wiring
- [ ] `registry.ts` register-hook + `cli-program.ts` single dispatch loop + hidden `hook`
- [ ] `src/adapters/*` (interface + Claude Code adapter)
- [ ] `src/commands/init.ts` (non-destructive scaffold + settings deep-merge + `--force`)
- [ ] `src/commands/capture.ts` (text/stdin → inbox)
- [ ] `src/commands/refine.ts` (inbox → concept, validate-gated, archive, reindex+log)
- [ ] `src/commands/link.ts` (`--suggest` tag-overlap; insert absolute link; re-validate)
- [ ] `src/commands/reindex.ts` (delegates; `--check`)
- [ ] `src/commands/hook.ts` (stdin write-hook entry)
- [ ] Update `tests/cli.test.ts` (surface + hidden hook)

## G4 — Bundled scaffold assets
- [ ] `assets/vault/*` (root files, inbox, `.engram/`, `.gitignore`)
- [ ] `package.json` files[] += assets; runtime asset resolution from dist

## G5 — Claude Code adapter commands + settings hook
- [ ] `assets/claude/commands/{capture,refine,link,reindex}.md`
- [ ] `assets/claude/settings.json` (PostToolUse → `engram hook`)

## G6 — Obsidian setup doc
- [ ] `docs/obsidian-setup.md` + `assets/obsidian/*`

## G7 — End-to-end acceptance tests
- [ ] `tests/{vault,init,refine,link,reindex-idempotency,e2e-vault}.test.ts`
- [ ] `npm run check` green; capture fresh evidence

## G8 — Tracking, ADRs, docs sync
- [ ] ADR-0008 (write-hook), ADR-0009 (.engram sidecar)
- [ ] `/sync-docs`; status/changelog/roadmap; additive `architecture/overview.md`
- [ ] retrospective + Verification Evidence
