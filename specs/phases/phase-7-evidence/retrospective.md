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

## Verification Evidence (Rule 12)

Captured fresh on 2026-08-10 from `main` at the merge commit `1d810d5`.
All four commands run in this session; exit codes and output are verbatim.

### `npm run check` — exit 0

```
 Test Files  40 passed (40)
      Tests  265 passed (265)
   Start at  00:32:27
   Duration  1.49s (transform 675ms, setup 0ms, collect 2.80s, tests 2.60s, environment 4ms, prepare 1.60s)
> @avinash-singh-io/engram@0.6.8 build
> tsup
CLI Building entry: src/cli.ts, src/index.ts
CLI Using tsconfig: tsconfig.json
CLI tsup v8.5.1
CLI Using tsup config: /Users/avinash/Workspace/Projects/engram/tsup.config.ts
CLI Target: node20
CLI Cleaning output folder
ESM Build start
ESM dist/index.js     58.02 KB
ESM dist/cli.js       85.24 KB
ESM dist/index.js.map 141.34 KB
ESM dist/cli.js.map   203.14 KB
ESM ⚡️ Build success in 18ms
DTS Build start
DTS ⚡️ Build success in 566ms
DTS dist/cli.d.ts   20.00 B
DTS dist/index.d.ts 37.37 KB
```

### `npx vitest run tests/benchmarks/gate1.freeze.test.ts` — exit 0

Rule 11 freeze: both locked evaluator versions checksum-verified, and the
cross-version test proving `rubric.md` is byte-identical so the v2 bump could
not have moved any result.

```
 ✓ tests/benchmarks/gate1.freeze.test.ts (10 tests) 2ms
 Test Files  1 passed (1)
      Tests  10 passed (10)
```

### `npx vitest run tests/gate1/` — exit 0

Includes the refusal tests: the report will not emit a verdict without a
validated κ, proven against a maximally strong signal.

```
 ✓ tests/gate1/stats.test.ts (14 tests) 2ms
 ✓ tests/gate1/reader.test.ts (19 tests) 2ms
 ✓ tests/gate1/report.test.ts (10 tests) 285ms
 Test Files  3 passed (3)
      Tests  43 passed (43)
```

### `node tools/gate1/report.js` — exit 0

The instrument still refuses a verdict. This is correct and deliberate: the
owner waived validation, and the tool was **not** modified to agree.

```
# Gate 1 — Stage A report (gate1-v2)

sample                 400
  not-a-kb-question    364
  lookup               4
  structural           32

denominator (L+S)      36   (9.0% of sample)
structural fraction    88.9%
Wilson 95% CI          [74.7%, 95.6%]
threshold              20.0%

classifier validation
  labels-human.tsv     ABSENT
  Cohen's kappa        UNMEASURED

VERDICT: PROVISIONAL — NOT A GATE DECISION

The classifier is a single unvalidated rater. ADR-0037 §5 requires a blind
human-labeled sample and kappa >= 0.7 before any number is a gate decision.
```
