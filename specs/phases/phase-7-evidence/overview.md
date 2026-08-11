# Phase 7 — Evidence & Observation

> **Status**: planned
> **Branch**: `phase-7-evidence`
> **Target release**: none — the deliverable is a decision, not a feature

## Goal

Answer **Gate 1** — *is a measurable fraction of real question traffic
structural?* — from question traffic that **already exists** in stored agent
transcripts, against a rubric locked before anything is classified. If the answer
is below threshold, the v2 graph work stops and engram ships as a folder
convention plus a good `AGENTS.md`.

## Key decisions (→ ADRs)

| Decision | Rationale | ADR |
|---|---|---|
| Gate 1 is measured **retrospectively** from stored transcripts, not from new instrumentation | The traffic already exists. [ADR-0031](../../decisions/0031-evidence-gates-before-graph.md) promised "an afternoon"; this is what makes that true | **0037** |
| A retrospective reading is a **lower bound** — it can clear the gate but cannot fail it | Historical questions were asked in a world where nothing could answer structurally, so they undercount by construction | 0031, **0037** |
| Classification is **three-way**: `not-a-kb-question` / `lookup` / `structural`; denominator is `lookup + structural` | Most prompts are coding instructions. A polluted denominator makes 20% unreachable by arithmetic | **0037** |
| Decision on the **95% interval**, not the point estimate; three branches (clear / fail / unresolved) | At n=150 an observed 26% has a CI straddling 20%; a point-estimate rule would call that a pass | **0037** |
| Corpus is **all roots**, not knowledge-base roots | The most structural questions get asked while working in code, not while sitting in notes. Filtering by cwd deletes the target traffic | **0037** |
| `root` is an **opaque id**; no `audience` or `kind` field, ever | Engram has no concept of vault types; what a root holds is the user's choice ([ADR-0030](../../decisions/0030-boundaries-are-repos.md)) | 0030 |
| **Intelligence and its observation substrate are deferred together, post-v1.0** | The [ADR-0036](../../decisions/0036-intelligence-loop.md) loop is five steps that only cohere together. Building OBSERVE alone logs an unknown-fit shape for a year, which reads as evidence and isn't | **0038** |

## Scope (In)

1. **ADR-0037** — Gate 1 measurement protocol.
2. **ADR-0038** — intelligence deferred post-v1.0 as an indivisible system; v1.0
   defined as the base product.
3. `tests/benchmarks/gate1-v1/` — **locked** (Rule 11): `rubric.md` with worked
   examples for all three labels, `seed.jsonl` (hand-labeled ground truth),
   `protocol.md` (corpus definition, decision rule, κ floor, contingency trigger).
4. `tools/gate1/` — read-only, throwaway: transcript reader, classifier runner,
   adjudication + Cohen's κ, Wilson interval, report generator.
5. `tools/gate1/baseline/` — rg-over-markdown harness scored on the structural
   questions actually found. **The number Phase 11 must beat.**
6. The Gate 1 report and the decision.

## Scope (Out)

- Any `core/` or `src/` work — that is Phase 8.
- The observation event log and `src/memory/` — parked with intelligence (ADR-0038).
- Distillation, patterns, proaction — Phases 12–13, parked.
- Event compaction (FEAT-008) — parks with Phase 12; urgency drops to zero since
  no log accumulates.
- Setting up or prescribing vault roots. Engram has no concept of vault kinds.
- Any live collection window, unless the Group 5 contingency fires.

## Deliverables and verification (Rule 12)

| Deliverable | Verification |
|---|---|
| `gate1-v1` locked | `npx vitest run tests/benchmarks/gate1-v1.freeze.test.ts` — manifest checksum; fails on any mutation |
| Transcript reader | `npx vitest run tests/gate1/reader.test.ts` against a synthetic fixture |
| κ + Wilson implementations | `npx vitest run tests/gate1/stats.test.ts` — known inputs, known outputs |
| Classifier agreement | `node tools/gate1/classify.js --against seed` → agreement ≥ κ floor |
| Baseline harness | `node tools/gate1/baseline/run.js` → scored result |
| Whole repo | `npm run check` exits 0 |

**The instrument that decides the project's fate is itself tested.** Cohen's κ and
a Wilson interval are both easy to get subtly wrong, and a wrong one would corrupt
the decision silently — the exact failure ADR-0031 exists to prevent.

## Acceptance (Rule 12)

- [ ] ADR-0037 and ADR-0038 accepted **before** any classification runs
- [ ] `gate1-v1/` committed and frozen before the classifier is pointed at real data
- [ ] Transcript format confirmed parseable on a real file (Group 1 task 1 — the
      phase's first gate)
- [ ] `npm run check` exits 0 with fresh output
- [ ] κ ≥ 0.7 on the blind 20% sample, or all items hand-labeled
- [ ] Baseline harness produces a scored result on the structural subset
- [ ] Report states: n, three-way label counts, structural fraction, Wilson 95% CI,
      per-root slice
- [ ] Decision follows the pre-registered three-branch rule with no post-hoc adjustment
- [ ] `retrospective.md` records what the gate cost and what it returned

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Transcripts unusable or unparseable** | Stage A collapses; the whole phase needs rethinking | Verified as Group 1 task 1, before anything else is built |
| Retrospective reading lands low | Cannot conclude "stop" — the undercount is unmeasured and points the wrong way | Group 5 contingency: a plain-text `wondered` journal, zero code |
| Rubric boundary drawn to flatter the result | The gate becomes theatre | Rubric locked and committed before classification; freeze test enforces it |
| Question text sent to a model for classification | [ADR-0034](../../decisions/0034-encryption-is-a-substrate-concern.md) — the agent is the egress path | Decided per root before Group 2 runs; hand-labeling is always available |
