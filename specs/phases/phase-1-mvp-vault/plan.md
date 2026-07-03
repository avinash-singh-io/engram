# Phase 1 — Plan

# Execution order: G0 → G1 → G2 → G3 → (G4 ∥ G5 ∥ G6) → G7 → G8

Groups build on each other through G3 (shared files); G4–G6 (assets/docs) are
parallel-safe; G7 verifies; G8 finalizes. Each group commits on its own.

---

## G0 — Vault core + frontmatter serializer
**Sequential.** Foundation. **Commit:** `feat(format): frontmatter serializer + vault fs layer`
- `src/format/serialize.ts` (inverse of parseFrontmatter; flow-style tags; round-trip test)
- Additive export from `src/format/index.ts`
- `src/vault/paths.ts` (root discovery, link↔fs mapping, ignore globs)
- `src/vault/config.ts` (`.engram/config.json`)
- `src/vault/read.ts` (**canonical walker** → `VaultModel`) ← shared foundation
- `src/vault/write.ts` (non-destructive atomic write)

## G1 — Deterministic index generator
**Sequential** (needs G0). **Commit:** `feat(indexer): deterministic idempotent index generator`
- `src/indexer/generate.ts` (pure; `* [Title](/abs.md) - description`; stable sort; root re-emits okf_version; **nested child-index links** for descent per ADR-0006)
- `src/indexer/reindex.ts` (walk model, regen per-dir index; `--check`)
- Idempotency: LF, unicode-aware sort, trailing newline
- `tests/indexer.test.ts`

## G2 — Log writer + write-hook engine
**Sequential** (needs G0/G1). **Commit:** `feat(vault): append-only log + write-hook engine`
- `src/vault/log.ts` (append under today's ISO heading, newest-first, bold verb)
- `src/hooks/payload.ts` (parse Claude Code PostToolUse stdin → file paths; tolerant)
- `src/hooks/write-hook.ts` (validate → scoped reindex(dir+root) + log; fail-loud on error)
- `tests/write-hook.test.ts`

## G3 — CLI command implementations + dispatch wiring
**Sequential** (needs G0–G2; the shared-foundation keystone). **Commit:** `feat(cli): wire init/capture/refine/link/reindex + register-hook dispatch`
- `src/commands/registry.ts` → add optional `register?(program)` / handler per CommandSpec
- `src/cli-program.ts` → single dispatch loop calling `register?` else stub; hidden `hook` command (stdin)
- `src/adapters/*` → adapter interface (`id`, `agentFile()`, `commandFiles()`) + Claude Code adapter ← shared foundation
- `src/commands/{init,capture,refine,link,reindex,hook}.ts`
- Update `tests/cli.test.ts` (surface unchanged + hidden hook)

## G4 — Bundled scaffold assets
**Parallel (∥ G5, G6).** **Commit:** `feat(init): bundled OKF vault scaffold assets`
- `assets/vault/{index.md,AGENTS.md,log.md,inbox/.gitkeep,.engram/config.json,.engram/concept.template.md,.gitignore}`
- `package.json` files[] += `assets`; asset resolution from dist via `import.meta.url`

## G5 — Claude Code adapter commands + settings hook
**Parallel (∥ G4, G6).** **Commit:** `feat(adapter): Claude Code slash-commands + PostToolUse hook`
- `assets/claude/commands/{capture,refine,link,reindex}.md`
- `assets/claude/settings.json` (PostToolUse Write|Edit → `engram hook`; deep-merge doc)

## G6 — Obsidian setup doc
**Parallel (∥ G4, G5).** **Commit:** `docs: Obsidian setup guide (links off, Properties)`
- `docs/obsidian-setup.md` + `assets/obsidian/obsidian-setup.md` (+ optional `app.json` seed)

## G7 — End-to-end acceptance tests
**Sequential** (needs all). **Commit:** `test: phase-1 vault e2e + idempotency`
- `tests/{vault,init,refine,link,reindex-idempotency,e2e-vault}.test.ts`
- Run `npm run check`; capture fresh evidence (Rule 12)

## G8 — Tracking, ADRs, docs sync
**Sequential** (last). **Commit:** `docs: complete Phase 1 - MVP Vault`
- ADR-0008 (write-hook), ADR-0009 (.engram sidecar)
- `/sync-docs`; update status/changelog/roadmap; additive `architecture/overview.md` (Rule 10)
- retrospective with Verification Evidence
