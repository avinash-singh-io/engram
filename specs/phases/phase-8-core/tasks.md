# Phase 8 — Tasks

> Legend: `[ ]` todo · `[/]` in progress · `[x]` done
> Execution: Group 0 → Group 1 → (Groups 2 + 3 + 4 parallel) → Group 5 → Group 6 → Group 7
> **TDD is on** (Rule 13) — the failing test comes first in every group.

## Group 0 — Demolition and skeleton — blocks everything

- [ ] Sweep the 229 v1 tests for behavioural assertions worth re-specifying;
      record findings in `history.md`
- [ ] Land BUG-001 percent-encoding cases as **failing** specs (CommonMark §6.3)
- [ ] Land any other swept behaviour as failing specs
- [ ] Delete v1 `src/` (40 files, ~4,212 LOC)
- [ ] Delete the 229 v1 tests
- [ ] Confirm preserved: `tools/gate1/`, `tests/gate1/`, `tests/benchmarks/`
- [ ] Scaffold `src/{core,format,ops,substrate}/` per ADR-0032
- [ ] Add eslint rule: `core/` may import only `core/`
- [ ] Add eslint rule: nothing above `format/` may see format-shaped data
- [ ] Minimal `src/cli.ts` + `src/index.ts` so `npm run build` stays valid
- [ ] Verify: `npm run build` exits 0 · `npm run lint` exits 0
- [ ] Verify: gate1 tests still pass (36)

## Group 1 — `core/model.ts`

- [ ] Tests first: Node, Edge, assertion stamp
- [ ] `Node` — addressable; may have a body; **may be empty**
- [ ] `Edge` — directed and typed
- [ ] Assertion stamp — who · when · until-when, obligatory on both
- [ ] Version-free: no field justified by OKF alone
- [ ] Verify: `npx vitest run tests/core/model.test.ts`
- [ ] Verify: `core/` has no import outside `core/` (lint)

## Group 2 — `core/ports.ts` + `substrate/` — parallel with 3, 4

- [ ] Tests first, against stubs
- [ ] `FileStore` · `Detector` · `Clock` — three interfaces, not one
- [ ] In-memory `FileStore`; fixed-fact `Detector`; fixed-instant `Clock`
- [ ] `substrate/fs.ts` · `substrate/clock.ts` · `substrate/detect.ts`
- [ ] Prove each port is stubbable **alone** (no consumer needs all three)
- [ ] Verify: `npx vitest run tests/core/ports.test.ts`

## Group 3 — `format/` codecs and registry — parallel with 2, 4

- [ ] Tests first
- [ ] `okf-v0_1.ts` — reader + writer
- [ ] `okf-v0_2.ts` — reader + writer
- [ ] `registry.ts` — detect `okf_version` → select codec
- [ ] Normalise into `model.ts`; nothing above the codec sees OKF-shaped data
- [ ] Lossy-warning path when a codec cannot express what the model holds
- [ ] **BUG-001 percent-encoding specs go green**
- [ ] Open/closed test: adding a stub codec changes no existing file
- [ ] Verify: `npx vitest run tests/format/`

## Group 4 — `core/graph.ts` + `core/relations.ts` — parallel with 2, 3

- [ ] Tests first
- [ ] Identity: slug in frontmatter; path is the address
- [ ] `aliases:` written to the moved file itself — never a central ledger
- [ ] Slug collision → **warning**, both nodes survive
- [ ] Missing slug → path-as-identity fallback + warning, never an error
- [ ] Relation registry: a type registers validity semantics + detective form
- [ ] Prove a new relation type needs no edit to `gate.ts`
- [ ] Validity primitives (traversal retrieval is Phase 11)
- [ ] Verify: `npx vitest run tests/core/graph.test.ts`

## Group 5 — `ops/capture.ts`, `ops/link.ts`, minimal `gate.ts`

- [ ] Tests first
- [ ] `capture` — never validates, never fails; does **not** pass the gate
- [ ] Property test: empty, huge, invalid UTF-8, binary — none rejected
- [ ] `gate.ts` — a change is a proposed diff, not a file write; validation only
- [ ] `link` — assert a typed relation through the registry, via the gate
- [ ] Verify: `npx vitest run tests/ops/`

## Group 6 — CLI wiring, library exports, e2e

- [ ] `engram capture` · `engram link`
- [ ] Public library exports (model, registry, ports)
- [ ] e2e on a real temp vault
- [ ] e2e: v0.1 vault → model → v0.2 write-back, no loss
- [ ] **Unreleasable window closes** — CLI works again
- [ ] Verify: `npx vitest run tests/e2e/`

## Group 7 — Verification

- [ ] Full `npm run check` exits 0 with fresh output
- [ ] Deliberate import violation proves lint catches it, then revert
- [ ] Acceptance sweep from `overview.md` — every box
- [ ] Capture output for `retrospective.md` § Verification Evidence (Rule 12)
- [ ] Write `retrospective.md`
- [ ] Run `/sync-docs`
