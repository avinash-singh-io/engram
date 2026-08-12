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

- [x] Tests first (24 tests)
- [x] `hints` carries agent-decided structure: title, id, container, path,
      `supersedes`, `sources`, asserter, `generated`
- [x] `slugify` — deterministic, NFKD-folded, length-capped so a slug stays a name
      rather than an encoding of the title
- [x] Slug derived from title; path derived from container; explicit wins over derived
- [x] **Deterministic**: same input → identical result, asserted
- [x] Agent-authored assertions marked (ADR-0027 mitigation 2)
- [x] Goes through the gate; a rejection names the rule **and writes nothing**
- [x] An empty node is formattable — ADR-0019 does not require a body
- [x] Relations persist to frontmatter and read back as edges
- [x] Verify: `npx vitest run tests/ops/format.test.ts` — 24 passed

## Group 2 — Preventive guardrails — parallel with 3

- [x] Tests first (30 tests)
- [x] `no-delete` · `require-sources` · `no-supersede-verified`
- [x] `propose-only` (path-scoped) · `path-scope` · `rate-limit`
- [x] Declarative `GuardrailConfig`; a rule not enabled does not run
- [x] **A guardrail may tighten but never loosen** — 8 tests, incl. that a request
      loosening everything at once still cannot. `pathScope` intersects rather than
      unions; `rateLimit` takes the minimum; `enabled` cannot shrink
- [x] Every rejection names the rule that fired
- [x] Verify: `npx vitest run tests/policy/` — 30 passed

## Group 3 — Detective guardrail checks — parallel with 2

- [x] Tests first
- [x] One detective check per preventive rule — all six
- [x] `Guardrail` requires both halves at the type level, so a rule **cannot ship
      preventive-only**
- [x] Test that every registered guardrail has both halves and a `prevents` string
- [x] `doctor` runs and reports them by name, saying what each prevents
- [x] Detective hits are **warnings, not failures** (ADR-0021 consistency)
- [x] `doctor` honours a narrowed configuration
- [x] Verify: `npx vitest run tests/ops/doctor.test.ts` — 19 passed

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
