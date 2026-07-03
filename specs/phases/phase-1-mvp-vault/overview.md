# Phase 1 — MVP Vault + Claude Code

> **Status**: in-progress
> **Branch**: `phase-1-mvp-vault`
> **Target release**: v0.2.0
> **Design source**: parallel brainstorm 2026-07-03 (see `specs/planning/parallel-execution-plan.md`)

## Goal

Turn the Phase 0 format core into a shipping product: `engram init` scaffolds an
OKF-conformant vault in which Claude Code can capture, refine, link, and reindex a
concept that is auto-validated, auto-indexed, and logged with zero manual index
maintenance — and Obsidian opens it cleanly with Properties populated.

## Scope

### In
- `engram init` — non-destructive OKF vault scaffold (root `index.md` w/ okf_version,
  `AGENTS.md`, `log.md`, `inbox/`, `.engram/` config + concept template, `.claude/`
  adapter commands + settings hook, Obsidian setup doc); idempotent-additive, `--force`.
- **Frontmatter serializer** (`src/format/serialize.ts`) — inverse of `parseFrontmatter`.
- **Vault fs layer** (`src/vault/*`) — root discovery, concept enumeration, in-memory
  `VaultModel`, non-destructive atomic writes, `.engram/config.json`.
- **Deterministic idempotent index generator** (`src/indexer/*`) + `reindex --check`.
- **Append-only log writer** (`src/vault/log.ts`).
- Wire the five stub subcommands to real handlers: `init`, `capture`, `refine`, `link`, `reindex`.
- **Write-hook** — internal hidden `engram hook` subcommand driven by a scaffolded
  Claude Code PostToolUse hook; revalidate + scoped reindex + log append.
- Claude Code adapter slash-commands + Obsidian setup doc.
- **Shared foundations** (make Wave 2 parallel): command register-hook + single dispatch
  loop; canonical vault walker; adapter interface; one AGENTS.md writer.

### Out
- `/recall` + retrieval (Phase 2) · `/promote` (Phase 4) · sync recipes (Phase 3) ·
  embeddings/RAG (Phase 5). Link suggestion is **tag-overlap only** (non-goal N3).
- No change to the locked Phase 0 validator rules / fixtures corpus v1 (Rule 11) —
  Phase 1 consumes `validateConcept` unchanged.

## Key decisions (→ ADRs)
- **ADR-0008** — write-hook as a hidden `engram` subcommand driven by Claude Code
  PostToolUse (not a shell/git hook); fail-loud on validation error (surfaces to agent).
- **ADR-0009** — `.engram/` non-OKF tooling sidecar (config + concept template), gitignore-agnostic.
- Serializer lives in the format core (cohesive OKF contract).
- Command dispatch = name→handler map + `register?()` hook (shared-foundation keystone).
- Link suggestion = tag-overlap heuristic only (N3). Refine archives inbox items non-destructively (Principle 6).

## Acceptance Criteria (Rule 12 — evidence required)
- [ ] `engram init` (empty dir) creates all scaffold files incl. `.claude/settings.json` PostToolUse hook (asserted)
- [ ] `engram init` twice is non-destructive; existing `.claude/settings.json` is deep-merged
- [ ] `engram capture "note"` (and stdin `-`) creates an `inbox/*.md` raw note
- [ ] `engram refine <inbox> --type … --to system-design/x.md` writes a concept with `validateConcept().ok === true`, archives the inbox item, appends an `Added` log entry
- [ ] `engram reindex` builds dir + root indexes with the bullet; second `reindex --check` → exit 0 (idempotent)
- [ ] `engram link a --to b` inserts an absolute markdown link; re-validation has no link warnings
- [ ] `engram hook` on a sample PostToolUse payload: valid concept → reindex+log (0); invalid → non-zero
- [ ] `tests/e2e-vault.test.ts` green (empty dir → init → capture → refine → reindex×2)
- [ ] `npm run check` exits 0 with fresh output this session
- [ ] public command surface test passes (7 COMMANDS; hidden hook registered)

## Risks (mitigations in plan.md)
- PostToolUse payload schema mismatch → payload fixture test + full-vault reindex fallback.
- Reindex non-determinism → LF normalization + unicode-aware sort + `--check` test.
- Merging an existing `.claude/settings.json` (momentum user) → real deep-merge, never remove existing hooks.
- Path-traversal via `--to` → validate target is inside vault + non-reserved.
