# Phase 8 — Core

> **Status**: **complete** (2026-08-12) — all 8 groups verified
> **Branch**: `phase-8-core`
> **Target release**: v0.7.0

## Goal

Replace `src/` clean-room with the v2 core: **Node + Edge** as the only primitives,
an internal model behind **versioned codecs**, **narrow ports**, **slug identity**,
and a capture path that **never rejects**. Ship `capture` and `link` at v0.7.0.

v1 is deleted outright rather than migrated —
[ADR-0019](../../decisions/0019-node-edge-primitives.md) changes the primitive, so
incremental migration would be patchwork over a different model.

## Key decisions (→ ADRs)

| Decision | Rationale | ADR |
|---|---|---|
| v1 `src/` **deleted outright** in Group 0; build from zero | Clean-room; `src/format/` collides with the codec path ADR-0032 requires. Zero external users makes this free | this phase |
| `core/` imports only `core/`; nothing above `format/` sees format-shaped data — **both lint-enforced** | A wrong import shows up in a diff rather than in a review | [0032](../../decisions/0032-internal-model-versioned-codecs.md), [0024](../../decisions/0024-three-tier-dependency-inversion.md) |
| Node may be **empty** — a link to an unwritten note is a valid node, not an error | [0019](../../decisions/0019-node-edge-primitives.md) |
| Address = path · identity = slug · move trail = `aliases:` in the moved file itself | Links resolve by path (fast path); the slug is the repair path | [0021](../../decisions/0021-identity-slug-path-aliases.md) |
| Slug collision **warns**; a missing slug falls back to path-as-identity + warning. **Never an error** | Coexisting is recoverable; a rejected write is not | [0021](../../decisions/0021-identity-slug-path-aliases.md) |
| Closed relations are a **registry**, not a switch in the gate | Open/closed applies to relations for the same reason it applies to formats | [0032](../../decisions/0032-internal-model-versioned-codecs.md) |
| `capture` never rejects; `link` passes a **minimal validation gate** — guardrails are Phase 10 | [0026](../../decisions/0026-validation-gates-promotion.md) |
| **TDD across the whole phase** (Rule 13, opt-in — **on**) | `core/` is pure, I/O-free logic behind narrow ports: no fixtures, no temp dirs, no clock flake | this phase |
| BUG-001 link-encoding behaviour **re-specified as tests**, not ported as code | Clean-room forbids copying the code; losing the behaviour would regress a shipped fix | this phase |

## Scope (In)

1. **`core/model.ts`** — Node, Edge, assertion stamps (who · when · until-when).
   Version-free. An empty node is valid.
2. **`core/ports.ts`** — `FileStore`, `Detector`, `Clock`. Narrow and separately
   stubbable (interface segregation).
3. **`core/graph.ts`** — identity (slug · path · `aliases`), validity primitives.
   Pure, in-memory.
4. **`core/relations.ts`** — the closed-set registry.
5. **`format/`** — `okf-v0_1.ts`, `okf-v0_2.ts`, `registry.ts`. Detect version →
   dispatch → normalise into the model. Lossy-warning path when a codec cannot
   express what the model holds.
6. **`substrate/`** — `fs.ts`, `clock.ts`, `detect.ts` implementing `core/ports.ts`.
7. **`gate.ts`** — minimal: validation only, no guardrails.
8. **`ops/capture.ts`** and **`ops/link.ts`**.
9. CLI for those two ops, plus the library exports.

## Scope (Out)

- `format(content, hints)` — Phase 10 ([ADR-0033](../../decisions/0033-format-takes-content.md))
- `recall`, traversal **retrieval** — Phase 11. Phase 8 ships graph *primitives* only.
- `reindex`, `doctor`, view generation, `init --structure` — Phase 9
- Guardrails, skills, MCP, agent adapters, AGENTS.md — Phase 10
- Anything under `tools/gate1/`, `tests/gate1/`, `tests/benchmarks/` — Phase 7
  artifacts, preserved untouched

## The unreleasable window — declared, not discovered

Between Group 0 and Group 6 the package has **no working CLI** and `main` is **not
releasable**. The suite drops from 265 tests to the 36 Phase 7 instrument tests and
climbs back from there.

This is a direct consequence of deleting v1 outright rather than staging it through
`src/legacy/`, and it contradicts the roadmap's *"each phase leaves the project
releasable"* principle for the duration of the phase. The trade was put to the owner
with that cost stated and accepted on 2026-08-12. It is recorded here so the window
is a known cost rather than a surprise.

## Deliverables and verification

| Deliverable | Verification |
|---|---|
| Import rules hold | `npm run lint` — rules fail the build on a `core/ → non-core` or `above-format/ → format-shaped` import |
| Node + Edge model | `npx vitest run tests/core/model.test.ts` |
| Narrow ports | `npx vitest run tests/core/ports.test.ts` — each port stubbable alone |
| Codecs + registry | `npx vitest run tests/format/` — incl. v0.1 → model → v0.2 round-trip |
| BUG-001 no regression | `npx vitest run tests/format/links.test.ts` |
| Identity + relations | `npx vitest run tests/core/graph.test.ts` |
| capture · link | `npx vitest run tests/ops/` |
| End to end | `npx vitest run tests/e2e/` on a real temp vault |
| Whole repo | `npm run check` exits 0 |

## Acceptance (Rule 12)

- [x] `npm run check` exits 0 with fresh output — 13 files, 171 tests, build clean
- [x] Lint proves both import rules — a deliberate violation produced 3 errors
- [x] `capture` never rejects **any** input — 15-case adversarial set, plus a
      real-disk repeat in e2e
- [x] `link` round-trips through both codecs
- [x] A v0.1 vault reads, normalises, and writes back as v0.2 with no loss
- [x] BUG-001 percent-encoding cases green — 17 specs, unskipped
- [x] Slug collision warns and both nodes survive
- [x] A node with no slug falls back to path-as-identity and warns
- [x] An empty node is valid and round-trips through the codec
- [x] Adding a hypothetical codec requires **no** change to existing code —
      proven by registering a stub at runtime
- [x] e2e on a real temp vault — 10 tests, plus a smoke test of the built binary
- [x] `retrospective.md` carries a `## Verification Evidence` section

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Deleting v1 loses hard-won behaviour beyond BUG-001 | Silent regressions of already-fixed bugs | Group 0 sweeps v1 tests for *behavioural* assertions worth re-specifying before deleting them; anything found lands as a failing spec |
| The unreleasable window runs long | `main` unshippable for the duration | Groups 2–4 are parallel; Group 6 is the earliest point the CLI returns and is deliberately placed before verification |
| TDD across ops/CLI slows the phase | Misses the one-week target | Accepted at owner's direction. Integration-shaped tests stay coarse — one behaviour per test, no over-specification |
| `capture`-never-rejects is hard to prove | A false claim in the acceptance list | Property-style test over adversarial inputs (empty, huge, invalid UTF-8, binary), not a handful of examples |
