# Phase 10 — Tasks

> Legend: `[ ]` todo · `[/]` in progress · `[x]` done
> Execution: Group 0 → Group 1 → (Groups 2 + 3 parallel) → Group 4 → Group 5 → Group 6 → Group 7
> **TDD is on** (Rule 13) — the failing test comes first in every group.

## Group 0 — Lock `gate2-v1` (Rule 11) — blocks everything

- [x] Write **ADR-0040** — Gate 2 thresholds and protocol
- [x] Fix the two bars: **directionality ≥95%, predicate ≥90%** — before any sampling
- [x] Record why they differ, and that one combined bar would let directionality
      errors hide behind predicate accuracy
- [x] Record the fallback: below either bar → nodes plus untyped links (ADR-0031)
- [x] `gate2-v1/rubric.md` — two independent axes, four predicate verdicts,
      worked examples in both directions, edge cases decided in advance
- [x] Pin the scoring asymmetry: `n/a` excluded from directionality only, **never**
      from predicate — otherwise the worst errors vanish from the denominator
- [x] `gate2-v1/protocol.md` — corpus, ~50 sample, blind adjudication, κ floor,
      two-bar rule, and the synthetic-trigger limitation stated
- [x] Generalise the freeze machinery from `gate1-v*` to `gate<N>-v<M>`
- [x] New test: every locked evaluator carries both a rubric and a protocol
- [x] Verify: freeze passes, **and fails on a deliberate mutation of gate2-v1**
- [x] Verify: `npm run check` exits 0 — 269 passed

## Group 1 — `format(content, hints)`

- [ ] Tests first
- [ ] `hints` carries agent-decided structure: title, container, `supersedes`,
      `sources`, path, asserter
- [ ] Slug derived from title; path derived from container
- [ ] **Deterministic**: same input → same output, asserted
- [ ] `generated: { by, at }` stamped on every agent-authored assertion
- [ ] Returns a **proposed change**; `format` never writes directly
- [ ] A rejection names the rule that fired
- [ ] Unparseable content is `capture`'s job, not a `format` failure (ADR-0026)
- [ ] Verify: `npx vitest run tests/ops/format.test.ts`

## Group 2 — Preventive guardrails — parallel with 3

- [ ] Tests first
- [ ] `no-delete` · `require-sources` · `no-supersede-verified`
- [ ] `propose-only` (path-scoped) · `path-scope` · `rate-limit`
- [ ] Declarative, loaded from the vault
- [ ] **A guardrail may tighten but never loosen** — asserted by test
- [ ] Every rejection names the rule
- [ ] Verify: `npx vitest run tests/policy/guardrails.test.ts`

## Group 3 — Detective guardrail checks — parallel with 2

- [ ] Tests first
- [ ] One detective check per preventive rule
- [ ] Registered, so a rule **cannot ship preventive-only**
- [ ] Test that every registered guardrail has a non-empty detective form
- [ ] `doctor` runs and reports them by name
- [ ] Verify: `npx vitest run tests/ops/doctor.test.ts`

## Group 4 — `AGENTS.md` entry contract

- [ ] Tests first
- [ ] Generated from the code: ops, guardrails **in force**, closed relations
      read from the registry
- [ ] Regenerating is idempotent (no embedded timestamp)
- [ ] Test that a newly registered relation appears without editing a template
- [ ] Verify: `npx vitest run tests/surface/agents-md.test.ts`

## Group 5 — CLI wiring and e2e

- [ ] `engram format` joins init · capture · link · reindex · doctor
- [ ] e2e on a real temp vault
- [ ] Smoke-test the **built** binary
- [ ] Verify: `npx vitest run tests/e2e/`

## Group 6 — Gate 2 measurement

- [ ] Build the corpus by formatting real notes — real agent output, synthetic trigger
- [ ] Sample ~50 edges per the locked protocol
- [ ] Classify directionality and predicate accuracy separately
- [ ] **BLOCKED on user**: blind adjudication of the sample
- [ ] Report refuses a verdict without human labels
- [ ] Apply the two-bar rule; record the decision and the trigger limitation
- [ ] Verify: `node tools/gate2/report.js`

## Group 7 — Verification

- [ ] Full `npm run check` exits 0 with fresh output
- [ ] Deliberate import violation re-proves both architecture rules fire
- [ ] Guardrail-tightening test passes; loosening is impossible
- [ ] Every guardrail has a detective form (asserted, not reviewed)
- [ ] Acceptance sweep from `overview.md` — every box
- [ ] Capture output for `retrospective.md` § Verification Evidence (Rule 12)
- [ ] Write `retrospective.md`
- [ ] Run `/sync-docs` — incl. adding **Phase 15** (skills, MCP, adapters) to the roadmap
