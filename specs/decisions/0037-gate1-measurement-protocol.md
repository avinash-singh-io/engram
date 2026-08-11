# 0037 — Gate 1 measurement protocol: retrospective corpus, interval decision

> **Status**: accepted
> **Date**: 2026-08-10
> **Deciders**: Avinash Kumar Singh
> **Refines**: [ADR-0031](0031-evidence-gates-before-graph.md) — the threshold is
> unchanged; this decides how it is measured and applied.

## Context

[ADR-0031](0031-evidence-gates-before-graph.md) sets Gate 1 — *fewer than 20%
structural query traffic → stop* — and estimates the cost at "one afternoon of
setup plus a collection window". It does not say where the traffic comes from, what
the denominator is, or how the threshold is applied to a sample.

Each of those is load-bearing, and getting any of them wrong produces a confident
number that decides the project's future for the wrong reason:

1. **Instrumenting `engram recall` measures only questions that already go through
   engram** — the exact undercount ADR-0031 warns about. Real questions go to an
   agent over a directory.
2. **Most agent prompts are not knowledge-base questions.** "run the tests", "fix
   this", "continue". Leaving them in the denominator makes 20% unreachable by
   arithmetic.
3. **A point estimate is not a decision.** At n=150, an observed 26% carries a 95%
   interval of roughly [19%, 33%] — straddling the threshold. A point-estimate rule
   calls that a pass.

Separately, stored agent transcripts already contain months of real question
traffic across every root the user works in. That corpus exists today and costs
nothing to collect.

## Options Considered

### Option A — Build instrumentation, then collect for a fixed window
A hook logs questions live; wait for a pre-registered n.
**Pros:** captures intent-adjacent signal the historical record lacks.
**Cons:** weeks of calendar time before the gate can be answered, during which the
v2 line is blocked; and it requires building the observation substrate that
[ADR-0038](0038-intelligence-deferred-post-v1.md) has deferred.

### Option B — Retrospective only, point-estimate decision
Classify the existing transcripts; compare the fraction to 20%.
**Pros:** answerable immediately, no code beyond a reader.
**Cons:** a point estimate cannot express uncertainty, and the retrospective corpus
is biased in a direction that makes a *low* reading uninterpretable.

### Option C — Retrospective first, interval decision, asymmetric conclusions
**Pros:** exploits the fact that the bias points one way only; resolves the gate in
an afternoon when the signal is strong; falls back to a zero-code instrument
otherwise.
**Cons:** requires accepting that a low retrospective reading concludes nothing.

## Decision

**Option C.**

### 1. The corpus is stored agent transcripts, across all roots

Every root the user has worked in, not only knowledge-base roots. **The corpus is
deliberately not filtered by working directory:** the most structural questions
("what did we already decide about X", "what superseded this") are asked while
working in code, not while sitting in the notes. Filtering by cwd would
systematically delete the traffic the gate is looking for.

Each root carries an **opaque id** and no `audience`, `kind`, or `type` field, per
[ADR-0030](0030-boundaries-are-repos.md) — engram has no concept of vault kinds,
and a semantic root name would leak a categorization into the measurement.

The measurement is shaped by whichever agent stores transcripts. That is a stated
limitation, not a corrected one.

### 2. Classification is three-way; the denominator excludes non-questions

| Label | Counted in denominator |
|---|---|
| `not-a-kb-question` | **no** |
| `lookup` | yes |
| `structural` | yes |

The fraction is `structural ÷ (lookup + structural)`. **Where the
`not-a-kb-question` boundary sits is the most consequential line in the rubric**,
which is why the rubric is locked before any data is classified (Rule 11).

### 3. A retrospective reading is a lower bound

Historical questions were asked in a world where nothing could answer structurally.
Nobody asks what nothing can answer, so the historical record **undercounts**
structural traffic by construction. The bias points one way, which makes the
conclusions asymmetric:

| Stage A (retrospective) result | Conclusion |
|---|---|
| 95% CI **lower bound ≥ 20%** | True fraction is at least this. **CLEAR** — proceed. |
| anything else | **UNRESOLVED** — proceed to Stage B. |

**Stage A cannot fail the gate.** A low retrospective reading is uninterpretable,
because the undercount is real and unmeasured. `FAIL` is not reachable from Stage A.

### 4. Stage B addresses the undercount, and costs nothing to build

The `wondered` signal — questions you wanted to ask but did not bother asking — is
the only correction for the bias, and no historical record can contain it. It is a
plain text file, one line per unasked question, kept for a pre-declared window.
No hook, no schema, no code — which is why deferring the observation substrate
([ADR-0038](0038-intelligence-deferred-post-v1.md)) does not block it.

| Stage B result | Conclusion |
|---|---|
| CI lower bound ≥ 20% | **CLEAR** — proceed |
| CI upper bound < 20% | **FAIL** — stop; ship a folder convention and a good `AGENTS.md` |
| straddles at max window | **UNRESOLVED** — defer the graph, build the ungated work, revisit |

### 5. The interval is Wilson; the classifier is validated before it is trusted

- **Wilson score interval** at 95%, not the normal approximation — the normal
  approximation is poor at the small proportions and moderate n this measurement
  will actually see.
- **Cohen's κ ≥ 0.7** between machine labels and a blind human-labeled random 20%.
  Below the floor, hand-label everything or version-bump the rubric to `gate1-v2`
  and rerun. **Never edit `v1`.**
- Both statistics are unit-tested against known values. A subtly wrong κ or
  interval would corrupt the decision silently — the exact failure ADR-0031 exists
  to prevent.

### 6. The evaluator locks in two stages

The seed set must be drawn from the corpus, and the corpus is not readable until
the reader exists. So:

| Stage | Artifact | Locked |
|---|---|---|
| 1 | `rubric.md`, `protocol.md` | **before any data is seen** |
| 2 | `seed.jsonl` (hand-labeled) | after extraction, **before the classifier runs** |

Rule 11's load-bearing property is preserved: the rubric — the only artifact that
could be tuned to flatter a result — is fixed before anyone looks at anything.

## Consequences

- Gate 1 becomes answerable in days rather than weeks when the signal is strong,
  which is what makes ADR-0031's "one afternoon" claim true rather than aspirational.
- The "Phase 7 blocks everything" scheduling problem largely evaporates: there is no
  multi-week wait to work around unless Stage B fires.
- A low reading is explicitly *not* a project kill. Anyone reading the report must
  understand that `FAIL` requires Stage B; concluding "stop" from Stage A alone
  would be a methodological error.
- The measurement is agent-shaped and single-user. Both are stated in the report
  rather than corrected, because correcting them costs more than the gate is worth.
- The baseline harness (rg-over-markdown on the structural questions found) is
  produced in the same pass. It cannot be reconstructed later, and Phase 11 is
  required to beat it.
