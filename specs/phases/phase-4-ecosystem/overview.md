# Phase 4 — Ecosystem (Codex + Antigravity adapters + the `/promote` bridge)

> **Status**: in progress
> **Branch**: `phase-4-ecosystem`
> **Target release**: v0.5.0 (ecosystem)
> **Design source**: `scratchpad/design-p4.json` (parallel Wave 2, runs alongside Phases 2 & 3)

## Goal

Extend Engram beyond Claude Code with **Codex** and **Antigravity** agent
adapters that reuse Phase 1's adapter seam, and ship a one-way **`/promote`**
bridge that imports a momentum ADR/learning as a valid, linked OKF concept that
passes the Phase 0 `validateConcept` gate.

## Scope

### In

- Formalize the shared **command-definition set** (`src/adapters/commands.ts`)
  so every adapter renders the same command semantics; add the `promote`
  definition.
- `src/adapters/codex.ts`, `src/adapters/antigravity.ts` — new adapters that
  reuse the OKF-mandated root `AGENTS.md` traversal contract and add only a
  thin per-agent command/prompt wrapper. A new agent is a **descriptor, not a
  fork**.
- Route `engram init --agent claude|codex|antigravity` through the adapter
  registry (Phase 1 already threaded `--agent`; verify Codex/Antigravity are
  selectable).
- `src/promote/*` — parse a momentum ADR (and, secondarily, a learning/history
  entry) **by file path only** (no momentum code dependency — ADR-0001), map it
  to OKF frontmatter (`type: Reference`, one-sentence `description`, ISO
  timestamp, tags), append a `# Source` provenance block, run `validateConcept`
  as a **hard pre-write gate**.
- Wire the real `promote` CLI handler (`src/commands/promote.ts`) via the
  registry `register` hook; reuse Phase 1 reindex + log-append to link the
  concept into the vault.
- Locked golden corpora: `tests/fixtures/promote/` (v1) and
  `tests/fixtures/adapters/` (v1).
- `docs/adapters.md` + `docs/promote.md`.

### Out

- No change to the locked Phase 0 validator rules / fixtures corpus (Rule 11) —
  promote conforms to the validator, never alters it.
- No live or bidirectional momentum↔Engram sync — promote is a one-way,
  point-in-time snapshot.
- No momentum SDK / code dependency — read momentum artifacts as plain text.
- No new OKF `type` for decisions — promoted ADRs map to `Reference`.
- No MCP / embeddings (Phase 5), no `/recall` (Phase 2), no sync recipes
  (Phase 3), no adapters beyond Codex + Antigravity.

## Key decisions (→ ADRs)

- **ADR-0010** — Multi-agent adapters converge on the shared root `AGENTS.md`
  traversal contract plus a thin per-agent command wrapper rendered from one
  shared command-definition set; a new agent is a descriptor.
- **ADR-0011** — `/promote` imports momentum artifacts as one-way `Reference`
  snapshots with a `# Source` provenance block, reading momentum by file path
  only (no code dependency; upholds ADR-0001); `validateConcept` is a hard
  pre-write gate.

## Acceptance criteria (Rule 12 — evidence required)

- [ ] `engram promote <momentum-ADR fixture>` yields a concept with
      `validateConcept().ok === true`, zero errors (fresh `npm test`).
- [ ] E2E: promoted concept is LINKED — a bullet in the target `index.md`, a
      newest-first `log.md` `Promoted` entry, and ≥1 absolute internal link in
      the body.
- [ ] Negative: a non-conformant mapping exits non-zero and writes no file.
- [ ] `engram init --agent codex|antigravity|all` scaffolds each agent's
      command surface; golden test confirms emitted trees match locked
      fixtures.
- [ ] `engram --help` lists `promote` with real behavior; the stub exit-2 path
      is gone for promote.
- [ ] `npm run check` exits 0 with the new tests + locked v1 corpora.
- [ ] `docs/adapters.md` + `docs/promote.md` committed.

## Risks (mitigations in plan.md)

- Adapter-seam shape differs from the design's imagined `CommandDefinition` —
  mitigated by reusing the shipped `Adapter.files(assetsRoot)` seam and
  extending `AdapterFile` with inline `content`.
- momentum template drift → heuristic parser mis-extracts — mitigated by the
  locked golden corpus, `--dry-run` preview, and the validate-before-write
  gate.
- Cross-lane conflicts on `src/commands/registry.ts`, `tests/cli.test.ts`, and
  `src/adapters/*` — reconcile on landing per Rule 6 order.
