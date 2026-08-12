# Phase 8 — Implementation Plan

```
Sequential: Group 0 → Group 1 → (Groups 2 + 3 + 4 in parallel) → Group 5 → Group 6 → Group 7
```

**TDD is on for this phase** (Rule 13, opt-in). Every group writes the failing test
first. For `core/` and `format/` that is cheap by construction — the code is pure
and sits behind narrow ports, so there are no fixtures, no temp directories, and no
clock flake. For `ops/` and the CLI the tests stay coarse: one behaviour per test,
no over-specification of internals.

## Reference specs (constitutional — read, never edit; Rule 10)

- [`specs/architecture/v2-overview.md`](../../architecture/v2-overview.md) §2 module
  tree, §3 data model, §4 the seven operations, §5 the write gate
- ADR-0019 primitives · ADR-0021 identity · ADR-0024 tiering · ADR-0026 validation ·
  ADR-0032 model/codecs/ports · ADR-0039 language

Gaps found during implementation are logged as `[ARCH_CHANGE]` in `history.md` with
`Affects-specs:`, never fixed in the spec mid-phase.

---

## Group 0 — Demolition and skeleton

**Sequential. Blocks everything.** External dependencies: none.

> **Before deleting, sweep.** The v1 suite encodes behaviour that was learned the
> hard way. Read the 229 v1 tests for *behavioural* assertions worth keeping —
> BUG-001's percent-encoding is the known one; note anything else — and land them as
> **failing specs** in the new tree. Clean-room forbids copying the code; it does
> not license re-introducing fixed bugs.

- Sweep v1 tests for behaviour worth re-specifying; record findings in `history.md`.
- Delete v1 `src/` (40 files, ~4,212 LOC) and its 229 tests.
- **Preserve**: `tools/gate1/`, `tests/gate1/`, `tests/benchmarks/`.
- Scaffold the ADR-0032 tree: `core/`, `format/`, `ops/`, `substrate/`.
- Add both import rules to the eslint config.
- Minimal `src/cli.ts` and `src/index.ts` so `npm run build` stays valid.
- Land BUG-001 cases as failing specs in `tests/format/links.test.ts`.

*Commit:* `refactor(core)!: remove v1 src — clean-room rewrite begins`

---

## Group 1 — `core/model.ts`

**Sequential.** Depends on Group 0.

Node, Edge, and the assertion stamp — **who** asserted it, **when**, and **until
when**. Version-free: no field exists because OKF has it, only because
[ADR-0019](../../decisions/0019-node-edge-primitives.md) requires it.

- An **empty node is valid** — a link to an unwritten note is a node, not an error.
- An Edge is directed and typed.
- No I/O. No imports outside `core/`.

*Commit:* `feat(core): Node, Edge and assertion stamps`

---

## Group 2 — `core/ports.ts` + `substrate/`

**Parallel with Groups 3 and 4.** Depends on Group 1.

`FileStore`, `Detector`, `Clock` — three interfaces, not one. Each consumer depends
only on what it uses, and each is stubbable alone (`FileStore` → in-memory map,
`Detector` → fixed fact set, `Clock` → fixed instant).

`core/` **names** these; `substrate/` implements them.

*Commit:* `feat(core): narrow ports and substrate implementations`

---

## Group 3 — `format/` codecs and registry

**Parallel with Groups 2 and 4.** Depends on Group 1.

- `okf-v0_1.ts`, `okf-v0_2.ts` — reader + writer each.
- `registry.ts` — detect `okf_version` → select codec.
- **Read:** file → codec → normalise into `model.ts`. Nothing above the codec sees
  OKF-shaped data.
- **Write:** model → the codec pinned to the vault's declared version.
- **Lossy warning** when a codec cannot express something the model holds — a
  codec-level warning, never a change to the core.
- BUG-001 percent-encoding goes green here.

**Open/closed is verified, not asserted:** a test adds a stub codec and proves no
existing file changed.

*Commit:* `feat(format): versioned OKF codecs and registry`

---

## Group 4 — `core/graph.ts` + `core/relations.ts`

**Parallel with Groups 2 and 3.** Depends on Group 1.

- **Identity** — slug in frontmatter; path is the address; `aliases:` in the moved
  file's own frontmatter is the move trail. Never a central ledger.
- **Slug collision → warning**, both nodes survive.
- **Missing slug → path-as-identity fallback + warning.** Never an error.
- **Relation registry** — a closed type registers its validity semantics and its
  detective form. Adding one later must not require editing `gate.ts`.
- Validity primitives only. **Traversal retrieval is Phase 11.**

*Commit:* `feat(core): identity, relation registry and validity`

---

## Group 5 — `ops/capture.ts`, `ops/link.ts`, minimal `gate.ts`

**Sequential.** Depends on Groups 2, 3 and 4.

- **`capture`** — persist raw content. Never validates, never fails. A durability
  step, and it does **not** pass the gate (the inbox is not the vault).
  Proven against adversarial inputs — empty, huge, invalid UTF-8, binary — not a
  handful of examples.
- **`link`** — assert a typed relation through the registry. **Passes the gate.**
- **`gate.ts`** — a change is a *proposed diff*, not a file write. Validation only;
  guardrails and the queue are Phase 10.

*Commit:* `feat(ops): capture and link`

---

## Group 6 — CLI wiring, library exports, e2e

**Sequential.** Depends on Group 5.

`engram capture`, `engram link`, and the public library surface. End-to-end against
a real temp vault, including a v0.1 → v0.2 round trip.

**The unreleasable window closes here** — this is the first point the package has a
working CLI again.

*Commit:* `feat(cli): capture and link commands`

---

## Group 7 — Verification

**Sequential.** Depends on Group 6.

Full `npm run check`; the acceptance sweep from `overview.md`; a deliberate import
violation proving lint catches it; BUG-001 regression; capture-never-rejects
property test. Capture output for the retrospective's `## Verification Evidence`
section (Rule 12).

*Commit:* `test(core): phase 8 acceptance verification`
