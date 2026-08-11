# Phase 7 — Retrospective

> **Closed**: 2026-08-10 · **Outcome**: Gate 1 → **PROCEED** · **Released**: nothing
> (by design — the deliverable was a decision)

## What the phase cost

One session. No product code. Four ADRs (0037, 0038, 0039), one locked evaluator at
two versions, a throwaway instrument in `tools/gate1/`, and a decision record.

[ADR-0031](../../decisions/0031-evidence-gates-before-graph.md) estimated "roughly
one afternoon of setup plus a collection window". The collection window turned out
to be **zero** — the traffic already existed in stored agent transcripts. That
single realisation removed the multi-week wait the phase was originally planned
around, and it is the reason this phase was cheap.

## What went right

- **The instrument was validated before it was trusted.** Two defects were caught
  by looking at the data rather than by reasoning about it: 189 `type:"user"`
  records held only 33 human prompts, and the corpus was 38% inflated by storage
  duplicates and harness-injected turns. Either would have corrupted the number
  silently.
- **The refusal was built in code, not prose.** `report.js` will not emit a verdict
  without a validated κ, and a test proves it refuses even against a maximally
  strong signal. When the owner later waived validation, the tool did not have to
  be weakened — the waiver was recorded beside it instead.
- **Rule 11 held under pressure.** `gate1-v1`'s adjudication rule was found
  defective mid-execution. It was fixed by version bump with `rubric.md`
  byte-identical across versions (enforced by test), so no result could shift under
  the change. v1 stays frozen as the record of what was actually run.

## What went wrong

- **The plan was circular on first draft.** The seed set had to be drawn from a
  corpus that the Group 1 reader had not yet made readable. Caught in Group 0 and
  resolved with a two-stage lock.
- **Group 3 was mis-scoped.** "Score an rg baseline on the structural questions
  collected" is not executable: scoring needs an answer key, and the corpus never
  recorded answers. This should have been visible at planning time. The 32 real
  structural questions were extracted with `expected: null` and the key deferred to
  Phase 11 Group 0.
- **The v1 adjudication rule shipped defective.** It was written, frozen, and
  committed before anyone noticed it could not be executed as stated. Freezing does
  not make a rule correct — it only makes it honest.
- **I under-explained the ask.** The request for 80 blind labels was made three
  times before it was made *comprehensibly*. The purpose of the gate should have
  been explained in plain terms first; the mechanics second.

## The most important caveat

The corpus is **software-development traffic**, and engram is for a **knowledge
base**. The owner named this, and it is recorded in
[gate-1-report.md](gate-1-report.md) as the primary threat to validity. The
mechanism is demonstrated — questions exist that text search structurally cannot
answer — but the 88.9% rate is not transferable to knowledge-base traffic, and
nobody should cite it as if it were.

## Carried forward

| Item | Owner |
|---|---|
| Classifier validation — **waived, not passed**; worksheet and labels preserved in `.gate1/` | any time |
| Answer key for the 32 real structural questions — the baseline Phase 11 must beat | Phase 11 Group 0 |
| Gate 2 (edge accuracy) — threshold still to be fixed before sampling begins | Phase 10 |
| Sync + E2E encryption would **reverse** ADR-0034, not extend it | unscheduled; needs its own ADR |
| Intelligence (Phases 12–13) + the ADR-0035 observation substrate | parked to post-v1.0 (ADR-0038) |

## Verification (Rule 12)

`npm run check` — 40 test files, 265 tests, typecheck, lint, format, build. Green on
the final commit.
