# Phase 10 — Agent surface (write path)

> **Status**: **complete** (2026-08-12) — Gate 2 instrumented, awaiting adjudication
> **Branch**: `phase-10-agent-surface`
> **Target release**: v0.9.0
> **Gate**: **GATE 2 — edge accuracy.** Can stop the graph.

## Goal

Ship the agent's main verb. `format(content, hints)` turns content plus the agent's
understanding into validated nodes and relations, through a gate that now carries
guardrails. Then measure **Gate 2**: is the agent's typed-relation accuracy good
enough to build traversal on.

## Key decisions (→ ADRs)

| Decision | Rationale | ADR |
|---|---|---|
| **Engram does not extract relations; the agent does** | [ADR-0034](../../decisions/0034-encryption-is-a-substrate-concern.md) forbids network calls, so engram cannot call a model. [ADR-0019](../../decisions/0019-node-edge-primitives.md): the agent already knows the relationship at the moment it writes the content. Engram's half of `format` is entirely deterministic — slug, path, serialize, validate | 0019, 0027, 0033, 0034 |
| **Gate 2 thresholds: directionality ≥95%, predicate ≥90%** — two bars, not one | A reversed direction **inverts meaning**: a superseded node presented as current is the exact failure the validity filter exists to prevent. A wrong predicate degrades traversal without lying about currency | **0040** |
| Thresholds fixed **before** any sampling | [ADR-0031](../../decisions/0031-evidence-gates-before-graph.md) left them "to be fixed before sampling begins" and they never were. Setting them after seeing numbers is the Rule 11 failure the gates exist to prevent | **0040** |
| Below either bar → **stop at nodes plus untyped links** | ADR-0031's own fallback, and it is still a working product | 0031 |
| Every guardrail ships with its **detective form** | v2-overview §7: engram mediates two of four write paths, since Obsidian and any agent with a shell write directly. A rule enforceable only at the gate is advisory | 0024 |
| The mitigation for imperfect extraction is that **repair is trivial**, not that extraction is perfect | [ADR-0027](../../decisions/0027-write-time-extraction-only.md) states this explicitly; relations are plain text in frontmatter (ADR-0022) | 0022, 0027 |
| Skills, MCP server and agent adapters → **new Phase 15** | Surfaces over a core Gate 2 has not yet validated. Appended rather than renumbered | this phase |

## Scope (In)

1. **`ops/format.ts`** — `format(content, hints)`. Deterministic: slug from title,
   path from container, `generated: { by, at }` stamped on every agent assertion,
   result is a proposed change through the write gate ([ADR-0033](../../decisions/0033-format-takes-content.md)).
2. **Guardrails, preventive at the gate** — `no-delete`, `require-sources`,
   `no-supersede-verified`, `propose-only`, `path-scope`, `rate-limit`.
3. **The same rules' detective forms**, in `doctor`.
4. **`AGENTS.md`** — generated entry contract naming the operations, the guardrails
   in force, and the closed relation set.
5. **`tests/benchmarks/gate2-v1/`** — locked (Rule 11): rubric, protocol, thresholds.
6. **The Gate 2 instrument and measurement.**

## Scope (Out) — and why

- **Skills, MCP server, agent adapters** — moved to a new **Phase 15**. They are
  surfaces over a core whose edge accuracy is unmeasured until this phase ends; a
  failed Gate 2 would waste them.
- **Traversal retrieval** — Phase 11, and gated on this phase's result.
- **`doctor --fix`** — still deferred; ADR-0028 makes not-writing-links the default
  posture and the exception deserves its own pass.
- **Post-hoc relation extraction** — ADR-0027 forbids it writing autonomously. At
  most it may propose, and proposals are out of v1 scope.

## Gate 2 — the measurement

**What is sampled.** Agent-authored edges produced by `format`. Two error classes,
scored separately:

| Error | Example | Bar |
|---|---|---|
| **Directionality** | `A supersedes B` when B supersedes A | **≥95%** |
| **Predicate** | `sources` where `part-of` was meant | **≥90%** |

**Where the edges come from.** Group 6 generates them by formatting a corpus of
existing notes rather than waiting for organic usage — Phase 7's Group 5 problem,
avoided. The edges are real agent output; only the trigger is synthetic, and that
limitation is stated in the report rather than glossed.

**Validation.** Same shape as Gate 1: locked rubric, ~50 sampled edges,
**blind** human adjudication, and a report that **refuses a verdict** without them.
Waivable, but a waiver is recorded as a waiver — never as a pass.

## Acceptance (Rule 12)

- [x] ADR-0040 accepted and `gate2-v1` frozen **before** any edge was sampled
- [x] `npm run check` exits 0 with fresh output — 23 files, 373 tests
- [x] `format` never writes without passing the gate — asserted for every rejection
- [x] `format` marks agent-authored assertions
- [x] `format` derives slug and path deterministically; same input → same output
- [x] Each guardrail rejects what it should, naming the rule that fired
- [x] Each guardrail has a detective form that `doctor` runs and reports by name
- [x] A guardrail may **tighten** but never loosen — every field, 8 tests
- [x] `AGENTS.md` names the ops, the guardrails in force, and the closed relations
- [x] Gate 2 report states n, both accuracy figures, intervals, and the decision
- [x] The report refuses a verdict without blind human labels — 10 tests
- [x] e2e on a real temp vault (20 tests) plus a built-binary smoke test
- [x] `retrospective.md` carries a `## Verification Evidence` section
- [ ] **AWAITING USER**: 48 blind edge judgements → Gate 2 verdict

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Gate 2 fails | Traversal is not built; Phase 11 reduces to nodes plus untyped links | That is ADR-0031's designed outcome, not a setback. The fallback is a working product and is stated in scope up front |
| The synthetic trigger biases edge quality | Measured accuracy does not reflect real use | Stated as a limitation in the report. Formatting real notes is closer to real use than any fixture; only the *when* is artificial |
| `format`'s hint surface grows into a schema the agent must satisfy | Capture-never-rejects erodes at the edges | `format` validates, but a rejection must always name the rule. Anything unparseable belongs in `capture`, which cannot reject |
| Guardrails written preventive-only | v2-overview §7 becomes a false promise | Acceptance requires a detective form per rule, asserted by test — the same mechanism that caught `part-of` in Phase 9 |
