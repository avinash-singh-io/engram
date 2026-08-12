# Phase 9 — Structure, views & health

> **Status**: **complete** (2026-08-12) — all 7 groups verified
> **Branch**: `phase-9-structure`
> **Target release**: v0.8.0

## Goal

Give the vault a shape and a health check: `init` scaffolds the default tree,
`reindex` regenerates derived state, views project edges into alternative entry
points, and `doctor` reports integrity **without repairing anything**.

## Key decisions (→ ADRs)

| Decision | Rationale | ADR |
|---|---|---|
| Register **`part-of`** with validity semantics + a detective form | The prerequisite views need. The roadmap says "view generation from `part-of`" but Phase 8 registered only `supersedes` and `sources`, and ADR-0022 forbids a closed type with no code behind it | [0022](../../decisions/0022-relations-in-frontmatter.md) |
| `init` scaffolds ADR-0023's reference tree; `--structure` accepts only `default` | Presets are opinions engram claims not to hold. ADR-0019: any structure is a choice of which `part-of` edges you author, so a preset adds no capability | [0019](../../decisions/0019-node-edge-primitives.md), [0023](../../decisions/0023-structure-tree-plus-views.md) |
| A nested vault root is **detected, skipped, and reported loudly** | TD-004 is a real disclosure path: a parent `reindex` would publish a nested vault's titles into a shared, committed index. ADR-0030's answer is still "use a separate repo"; this stops the trap being silent | [0030](../../decisions/0030-boundaries-are-repos.md) |
| `doctor` is **read-only** this phase | ADR-0028 makes engram a *non*-writer of link targets by default; `--fix` is the single exception and deserves its own pass | [0028](../../decisions/0028-obsidian-owns-link-rewriting.md) |
| `doctor` runs the **detective form every relation already carries** | The payoff of Phase 8's requirement. A rule enforceable only at the gate is advisory, because Obsidian and any agent with a shell write directly | [0024](../../decisions/0024-three-tier-dependency-inversion.md) |
| `views/` and generated indexes are **gitignored by default**; a conflict in a derived file means **regenerate, never merge** | Derived state that is never synced can never conflict | [0029](../../decisions/0029-derived-state-never-committed.md) |
| Deleting derived state must be **safe**. If deleting it loses information, it is not derived and does not belong in `views/` | [0029](../../decisions/0029-derived-state-never-committed.md) |

## Scope (In)

1. **`core/relations.ts`** — register `part-of`.
2. **The walker** — enumeration over a vault root, with three behaviours inherited
   from the Phase 8 sweep and backlog:
   - **nested-root detection and refusal** (TD-004)
   - **reserved-file detection** (`index.md`, `log.md`, `AGENTS.md`, `CLAUDE.md` at
     any depth) — never treated as authored content
   - **enumeration-only counting** — listing structure without reading bodies
3. **View generation** — `index.md` (a projection of `part-of`), plus
   `views/superseded.md`, `views/recent.md`, `views/orphans.md`.
4. **`doctor`** — structural findings + relation detective forms. Read-only.
5. **`reindex`** — regenerate all derived state, idempotently.
6. **`init`** — scaffold the default tree; manage the derived-state gitignore.
7. CLI wiring for `init`, `reindex`, `doctor`.

## Scope (Out) — and why

- **`doctor --fix`.** ADR-0028 makes not-writing-links the default posture; the one
  exception needs its own careful pass, not a ride-along.
- **`views/by-tag.md`.** ADR-0023 names it, but **tags are edges to abstract nodes**
  (ADR-0019) and nothing extracts them yet. That is write-time extraction, Phase 10.
- **`views/unread-sources.md`.** Also named by ADR-0023, but it needs a notion of
  *read* that exists nowhere in the model. Building it would mean inventing data.
- `format(content, hints)`, guardrails, skills, MCP, agent adapters — Phase 10.
- Traversal **retrieval** — Phase 11.

> Two of ADR-0023's four named views are deferred, with the reason recorded rather
> than quietly dropped. Generating a view whose backing data does not exist would
> produce a file that looks authoritative and means nothing.

## Deliverables and verification

| Deliverable | Verification |
|---|---|
| `part-of` registered | `npx vitest run tests/core/relations.test.ts` |
| Walker refuses nested roots | `npx vitest run tests/ops/walk.test.ts` |
| Views generate | `npx vitest run tests/views/` |
| `doctor` | `npx vitest run tests/ops/doctor.test.ts` |
| `reindex` idempotent | `npx vitest run tests/ops/reindex.test.ts` |
| Derived state is safe to delete | e2e: delete all derived state, `reindex`, compare byte-for-byte |
| End to end | `npx vitest run tests/e2e/` |
| Whole repo | `npm run check` exits 0 |

## Acceptance (Rule 12)

- [x] `npm run check` exits 0 with fresh output — 19 files, 262 tests, build clean
- [x] `init` on an empty directory produces a vault `reindex` and `doctor` both accept
- [x] `reindex` is **idempotent** — twice, and with a clock 73 years later
- [x] **Deleting all derived state and re-running `reindex` restores it
      byte-identical** — verified in-memory, on a real filesystem, and via the
      built binary (sha256 `d686efbb…`)
- [x] A nested vault root is skipped, and named in both `reindex` and `doctor` output
- [x] Reserved files are never treated as authored content, at any depth
- [x] Concept counting enumerates structure without reading bodies
- [x] `doctor` exits non-zero only on integrity **failures** — exit 0 with a
      dangling-edge warning, confirmed against the built binary
- [x] Every registered relation's detective form runs and is reported by name
- [x] `views/` gitignored by `init`; `doctor` cites "regenerate, never merge"
- [x] e2e on a real temp vault (15 tests) plus a built-binary smoke test
- [x] `retrospective.md` carries a `## Verification Evidence` section

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| "Nested root" detection misfires on an ordinary subdirectory | Legitimate content silently skipped — the worst possible failure for this feature | Detect on an explicit marker only (`.engram/`), never on heuristics. Test both directions: a marked root is skipped, an ordinary subdirectory is not |
| Generated `index.md` collides with a hand-authored one | A user's file is overwritten | Reserved-file detection lands in Group 1, *before* any generator runs. `doctor` warns if a reserved path carries content a generator did not write |
| `reindex` non-idempotent through timestamp drift | Every run dirties the tree; "regenerate, never merge" becomes noise | No generated file may embed a generation timestamp. Asserted by the byte-identical delete-and-rebuild test |
| Deferring two named views reads as incompleteness | ADR-0023 appears unfulfilled | Recorded in scope with the blocking reason; `by-tag` becomes trivial once Phase 10 extracts tags |
