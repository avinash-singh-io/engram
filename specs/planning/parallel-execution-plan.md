# Parallel Execution Plan — Roadmap Phases 1–5

> **Last Updated**: 2026-07-03 · Source: parallel brainstorm (6 agents) + synthesis.
> Governs how the roadmap is executed under concurrent lanes (Rule 15 / Rule 6).

## Dependency DAG

```
Phase 0 (✅ v0.1.0)
    │
    ▼
Phase 1 — MVP Vault + Claude Code        ← sole runway; gates 2/3/4/5
    ├──────────────┬──────────────┐
    ▼              ▼              ▼
Phase 2         Phase 3        Phase 4
Retrieval       Sync           Ecosystem
    │
    ▼
Phase 5 — Semantic (optional)
```
Edges: `0→1, 1→2, 1→3, 1→4, 2→5`.

## Waves

| Wave | Phases | Mode | Notes |
|------|--------|------|-------|
| 1 | Phase 1 | serial | Runway. **Must ship the shared foundations below** or Wave 2 degrades to serial-by-conflict. |
| 2 | Phase 2 ∥ 3 ∥ 4 | parallel lanes (worktrees) | Land order **2 → 4 → 3**, suite green on updated `main` between each (Rule 6). |
| 3 | Phase 5 | stacked behind Phase 4 | Open when Phase 2 lands; rebase behind Phase 4; land last. |

## Shared foundations (Phase 1 MUST ship these)

These convert the hot merge surfaces into trivial adjacent-line additions:

1. **Data-driven command registry + `register?()` hook + single dispatch loop** in `cli-program.ts` — each later phase adds ONE entry line, never edits the loop. *Keystone.*
2. **Canonical vault walker + root discovery** (`src/vault/read.ts`, `paths.ts`) — Phase 2 (recall), 3 (doctor), 5 (chunker) all consume it. Build once.
3. **Adapter interface + shared command definitions** (`src/adapters/*`) — turns Phase 4's adapter work from a refactor into a descriptor add.
4. **One AGENTS.md render+write utility** — Phase 1 ships writer + baseline; Phase 2 enriches additively; Phase 4 reuses.
5. **Frontmatter serializer** (`src/format/serialize.ts`) — inverse of `parseFrontmatter`; reused by Phase 4 promote + Phase 5.
6. **Reusable reindex + append-only log libs** (importable, not CLI-only) — reused by write-hook, doctor, promote.
7. (Phase 2 will export) **stable `RecallResult` type** — frozen shape for Phase 5 hybrid + MCP.

## File-conflict matrix (guides landing order)

| File | Phases | Severity | Mitigation |
|------|--------|----------|------------|
| `src/commands/registry.ts` | 2,3,4,5 | HIGH | register-hook (Phase 1); each lane edits only its entry; serialize landings |
| `src/cli-program.ts` | 2,3,4,5 | HIGH | single dispatch loop (Phase 1); later phases add ZERO lines |
| `src/adapters/*` | 1,4 | HIGH | Phase 1 ships the interface (interface-first) |
| `AGENTS.md` writer/template | 1,2,4 | MED | one writer util; Phase 2 enriches content additively |
| vault walker | 1,2,3,5 | MED | one canonical module in Phase 1; others consume |
| `tests/cli.test.ts` | 1,2,3,4 | MED | deliberate per-lane assertion updates; landing order |
| `package.json`, `src/index.ts` | 1,5 | LOW | append-only, distinct sections |
| `status.md`, `changelog` | all | LOW | own-row / append-only (Rule 15) — parallel-safe by design |

## Lane plan

- **Wave 1**: `phase-1-mvp-vault` off `main`. Build Phase 1 + shared foundations. Land to `main`, suite green, delete branch.
- **Wave 2**: worktree lanes `phase-2-retrieval`, `phase-3-sync`, `phase-4-ecosystem` off updated `main`. Land **2 → 4 → 3**, rebase each onto `main`, suite green between.
- **Wave 3**: `phase-5-semantic-layer` off `main` once Phase 2 lands; treat as stacked behind Phase 4; rebase; land last.
- Every merge to `main` stops for user approval (Rule 6). Evaluators (`recall-v1`, `semantic-v1`) frozen before their tuning loops (Rule 11) and never mutated during rebases.

## Top risks

- Phase 1 skipping the register-hook / dispatch loop → Wave 2 serial-by-conflict (biggest threat).
- Divergent vault walkers (1/2/3/5) → silent behavioral drift; bounded-read metrics depend on identical enumeration.
- Phase 1 flat indexes would break Phase 2 sublinear descent (ADR-0006) — coordinate index format at the 1/2 seam.
- Landing two lanes back-to-back without a green suite between → combination bugs on the shared CLI surface.
