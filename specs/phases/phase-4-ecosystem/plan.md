# Phase 4 — Plan

Execution order: G1 → (G2 ∥ G3) → G4 → G5. Group 1 formalizes the shared
adapter command set; Groups 2 (adapters) and 3 (promote lib) are independent;
Group 4 wires the promote CLI; Group 5 verifies + docs. Each group commits on
its own.

---

## G1 — Adapter seam + shared command definitions

**Commit:** `feat(adapters): shared command-definition set + promote command`

- Extend `AdapterFile` with inline `content?` (alt to `src`) — reuse the shipped
  `Adapter.files(assetsRoot)` seam, do not reimplement.
- `src/adapters/commands.ts` — `CommandDefinition { name, summary, body }` +
  `COMMAND_DEFINITIONS` (capture, refine, link, reindex, promote) as the single
  source of command semantics.
- Rewrite `src/adapters/claude.ts` to render command files from the shared
  definitions (keep the `settings.json` PostToolUse hook asset).
- `src/commands/init.ts` — prefer inline `content` over `src`.
- Remove the now-redundant `assets/claude/commands/*.md`.
- `tests/adapters/interface.test.ts`.

## G2 — Codex + Antigravity adapters

**Commit:** `feat(adapters): codex + antigravity adapters`

- `src/adapters/codex.ts` — `.codex/prompts/<name>.md` rendered from the shared
  set; reuses the root `AGENTS.md` (emitted by init).
- `src/adapters/antigravity.ts` — `.antigravity/commands/<name>.md`.
- Register both in `src/adapters/index.ts`.
- Golden fixtures under `tests/fixtures/adapters/`; per-adapter tests.

## G3 — Promote core library

**Commit:** `feat(promote): momentum ADR/learning → OKF concept mapper`

- `src/promote/parse-momentum.ts` — recognize a momentum ADR / learning entry.
- `src/promote/to-concept.ts` — map → OKF frontmatter + `# Source` block +
  standard-link rewrite.
- `src/promote/promote.ts` — parse → render → `validateConcept` hard gate.
- `src/promote/index.ts` — barrel.
- Locked golden corpus `tests/fixtures/promote/` (v1) + unit tests.

## G4 — Promote CLI wiring + vault placement

**Commit:** `feat(promote): wire engram promote CLI + vault placement`

- `src/commands/promote.ts` — real handler (`--type --tags --description --to
  --dry-run --force`), reuse reindex + log.
- `src/commands/registry.ts` — bind `register: registerPromote`.
- Update `tests/cli.test.ts` stub guard (promote no longer a stub).
- `tests/cli-promote.test.ts`.

## G5 — E2E, golden lock, docs, tracking

**Commit:** `test: promote + adapter e2e and golden lock` / `docs: adapter + promote guides`

- `tests/e2e/promote.test.ts`, `tests/e2e/adapters.test.ts`.
- `docs/adapters.md`, `docs/promote.md`.
- ADR-0010, ADR-0011 + decisions index + impact-map topics.
- `npm run check` exit 0 (fresh Rule 12 evidence); update tasks.md/history.md.
