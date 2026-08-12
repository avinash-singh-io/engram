# Phase 8 — Tasks

> Legend: `[ ]` todo · `[/]` in progress · `[x]` done
> Execution: Group 0 → Group 1 → (Groups 2 + 3 + 4 parallel) → Group 5 → Group 6 → Group 7
> **TDD is on** (Rule 13) — the failing test comes first in every group.

## Group 0 — Demolition and skeleton — blocks everything

- [x] Sweep the 229 v1 tests for behavioural assertions worth re-specifying;
      findings recorded in `history.md`
- [x] Land BUG-001 percent-encoding cases as specs (CommonMark §6.3) — 22 cases
- [x] Land the second swept behaviour: frontmatter parsing is **total**
      (CRLF · BOM · absent · invalid YAML → never throws)
- [x] Declare `format/links.ts` + `format/registry.ts` signatures so the rescued
      specs typecheck; bodies are Group 3's (TDD)
- [x] Delete v1 `src/` (40 files, ~4,212 LOC)
- [x] Delete the 229 v1 tests
- [x] Confirm preserved: `tools/gate1/`, `tests/gate1/`, `tests/benchmarks/`
      (incl. both locked evaluators — Rule 11)
- [x] Scaffold `src/{core,format,ops,substrate}/` + `gate.ts` per ADR-0032
- [x] Add eslint rule 1: `core/` may import only `core/` — **and no node builtins**
- [x] Add eslint rule 2: a versioned codec is importable only from `format/`
- [x] Minimal `src/cli.ts` + `src/index.ts` so `npm run build` stays valid
- [x] **Verify both rules FIRE** — deliberate violations produced 3 errors, then
      reverted. Caught a real config bug: flat config is last-wins per rule, and
      the broader block was silently clobbering rule 1
- [x] Verify: `npm run check` exits 0 — 53 passed, 22 skipped, build clean

## Group 1 — `core/model.ts`

- [x] Tests first: Node, Edge, assertion stamp (14 tests written before the model)
- [x] `Node` — addressable; may have a body; **may be empty** (incl. whitespace-only)
- [x] `Edge` — directed and typed; may point at a node that does not exist yet
- [x] Assertion stamp — who · when · until-when, obligatory on both
- [x] `isExpired` with an **inclusive** boundary at `until`
- [x] Version-free: a test asserts no `okf_version` leaks onto the model
- [x] Verify: `npx vitest run tests/core/model.test.ts` — 14 passed
- [x] Verify: `core/` has no import outside `core/` (lint exit 0)

## Group 2 — `core/ports.ts` + `substrate/` — parallel with 3, 4

- [x] Tests first, against stubs (11 tests)
- [x] `FileStore` · `Detector` · `Clock` — three interfaces, not one
- [x] In-memory `FileStore`; fixed-fact `Detector`; fixed-instant `Clock`
- [x] Real implementations too: `nodeFileStore`, `systemClock`, `filesystemDetector`
- [x] **Totality**: a missing file reads as `null`, an unknown fact as `false` —
      neither throws, which is what makes ADR-0026 honourable upstream
- [x] Prove each port is stubbable **alone** — a time-only consumer needs no
      FileStore, a storage-only consumer needs no Clock
- [x] Verify: `npx vitest run tests/core/` — 25 passed

## Group 3 — `format/` codecs and registry — parallel with 2, 4

- [x] Tests first
- [x] `format/links.ts` — the rescued BUG-001 matrix, 17 specs **unskipped and green**
- [x] `okf-v0_1.ts` — reader + writer
- [x] `okf-v0_2.ts` — reader + writer (relations, aliases, `stale_after`)
- [x] `registry.ts` — detect `okf_version` → select codec; unknown version falls
      back rather than failing, so a future-written vault stays readable
- [x] `parseFrontmatter` total — CRLF · BOM · absent · unterminated · bad YAML
- [x] Normalise into `model.ts`; nothing above the codec sees OKF-shaped data
- [x] Lossy-warning path — downgrading to v0.1 names each dropped capability
- [x] `readNode` total: no frontmatter, bad YAML, empty file all yield a Node
- [x] Missing id → path-as-identity + warning (ADR-0021)
- [x] v0.1 → model → v0.2 round-trip proven lossless
- [x] Open/closed test: registering a stub codec changes no existing code path
- [x] Verify: `npx vitest run tests/format/` — 35 passed
- [x] Verify: `npm run check` exits 0 — 113 passed, no skips remain

## Group 4 — `core/graph.ts` + `core/relations.ts` — parallel with 2, 3

- [x] Tests first (17 tests)
- [x] Identity: `resolve` by slug, then path, then alias — the fast path stays
- [x] `aliases:` read from the node itself — never a central ledger
- [x] Slug collision → **warning**, both nodes survive
- [x] Missing slug → path-as-identity fallback + warning, never an error
- [x] Dangling edge → warning; an edge to an unwritten node is a forward
      reference, not a break (ADR-0019: a node may be empty)
- [x] Relation registry: every type carries validity semantics **and** a
      detective form — asserted for all registered types
- [x] `isValid` — supersession invalidates, `sources` does not, expiry does
- [x] An **unregistered** kind never invalidates (ADR-0022: no code, no closed type)
- [x] Prove a new relation type needs no edit to `gate.ts` or `graph.ts` —
      registering `contradicts` at runtime is picked up by `isValid`
- [x] Verify: `npx vitest run tests/core/graph.test.ts` — 17 passed

## Group 5 — `ops/capture.ts`, `ops/link.ts`, minimal `gate.ts`

- [x] Tests first (31 tests)
- [x] `capture` — never validates, never fails; does **not** pass the gate
- [x] 15-case adversarial set: empty, whitespace, malformed and unterminated
      frontmatter, null bytes, lone surrogate, control chars, RTL text, emoji
      with ZWJ, CRLF, BOM, 100k single line — none rejected, all byte-identical
- [x] Same-instant collisions get a counter, never an error
- [x] `gate.ts` — a change is a proposed diff, not a file write; validation only
- [x] Rejections name the rule that fired (`path-required`, `id-required`,
      `no-self-relation`) and leave the file untouched
- [x] `link` — assert a typed relation through the registry, via the gate
- [x] `link` on a file that does not exist yet succeeds rather than failing
- [x] An unregistered kind warns but is not refused (ADR-0022)
- [x] Verify: `npx vitest run tests/ops/` — 31 passed

## Group 6 — CLI wiring, library exports, e2e

- [x] `engram capture` (argv or piped stdin) · `engram link <file> <to> <kind>`
- [x] `--vault` and `--by` flags; usage text; exit codes 0 / 1 / 2
- [x] Public library exports (model, ports, registry, ops, substrate, gate)
- [x] e2e on a real temp vault — 10 tests
- [x] e2e: v0.1 vault → model → v0.2 write-back, no loss, re-read identical
- [x] **Smoke-tested the BUILT binary**, not just the source: `node dist/cli.js`
      captured to a real inbox and wrote a real `supersedes:` relation
- [x] **Unreleasable window CLOSED** — the CLI works again
- [x] Verify: `npx vitest run tests/e2e/` — 10 passed

## Group 7 — Verification

- [ ] Full `npm run check` exits 0 with fresh output
- [ ] Deliberate import violation proves lint catches it, then revert
- [ ] Acceptance sweep from `overview.md` — every box
- [ ] Capture output for `retrospective.md` § Verification Evidence (Rule 12)
- [ ] Write `retrospective.md`
- [ ] Run `/sync-docs`
