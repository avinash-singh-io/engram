# gate1-v2 — measurement protocol (LOCKED · pre-registered)

> **Status:** FROZEN. Version tag `gate1-v2`. Do **not** edit — a change is
> `gate1-v3`. Rule 11 /
> [ADR-0037](../../../specs/decisions/0037-gate1-measurement-protocol.md).
>
> **Supersedes `gate1-v1`**, whose adjudication rule was defective (below).
> `rubric.md` is **byte-identical** to v1 — `d67159e9…` — so no classification
> result changes under this bump. Only the classifier-validation step differs, and
> that step cannot move the measured fraction in either direction.

## Why v2 exists

v1 read: *"A random 20% of **in-denominator items** is hand-labeled blind — machine
labels not visible during labeling."* That rule is self-contradictory and
statistically inadequate:

1. **It cannot be executed as written.** Selecting "in-denominator items" requires
   consulting the machine labels, while the same sentence requires them hidden.
2. **It samples only where the machine already agrees with itself.** Drawing from
   `lookup + structural` can never surface the machine wrongly labelling a real
   question `not-a-kb-question` — and `rubric.md` names that boundary "the most
   consequential line in the rubric". The one error most worth catching was
   structurally uncatchable.
3. **It yields too few items.** On the actual run, 20% of 36 in-denominator items
   is **7** — no usable κ.

Found during execution, before any human label was written. No v1 result is
backfilled; v1 is retained as the historical record.

## Corpus

- **Source:** stored agent session transcripts.
- **Roots:** **all** of them, not only knowledge-base roots. Not filtered by working
  directory — the most structural questions are asked while working in code
  (ADR-0037 §1).
- **Unit:** one user prompt = one item.
- **Root identity:** an opaque id per root. No `audience`, `kind`, or `type` field.
  Root names are not recorded in the report; slices are labelled `root-A`, `root-B`, …
- **Retained per item:** prompt text, timestamp, session id, opaque root id.
  Nothing else.

## Classification

Three-way per [`rubric.md`](rubric.md). Denominator is `lookup + structural`.

## Classifier validation

1. A random 20% of **the whole sample** — not of the in-denominator subset — is
   **hand-labeled blind**. Selection is by a seeded hash independent of any label,
   so the draw cannot depend on what the machine decided, and disagreements across
   the `not-a-kb-question` boundary are reachable in both directions.
2. **Cohen's κ** computed between machine and human labels over all three classes.
3. **Floor: κ ≥ 0.70.** Below it, one of:
   - hand-label the entire corpus, or
   - version-bump the rubric to `gate1-v2` and reclassify from scratch.

   **Never edit `gate1-v1`.**

## The statistic

- **Wilson score interval, 95%**, on `structural ÷ (lookup + structural)`.
  Not the normal approximation — it is poor at the proportions and n this
  measurement will see.
- Reported: n, three-way label counts, point estimate, interval, and a per-root
  slice.

## Decision rule — pre-registered, no post-hoc adjustment

Threshold is **20%**, unchanged from
[ADR-0031](../../../specs/decisions/0031-evidence-gates-before-graph.md).

### Stage A — retrospective

| Result | Conclusion |
|---|---|
| CI **lower bound ≥ 20%** | **CLEAR** — the true fraction is at least this; proceed to Phase 8 |
| anything else | **UNRESOLVED** — proceed to Stage B |

> **Stage A cannot fail the gate.** The retrospective corpus undercounts structural
> traffic by construction, so a low reading is uninterpretable. `FAIL` is not
> reachable from Stage A, and concluding "stop" from it would be a methodological
> error.

### Stage B — `wondered` journal

Fires only on UNRESOLVED. A plain text file, one line per question the user wanted
to ask but did not bother asking. No hook, no schema, no code.

- **Window:** declared at the moment Stage B opens, before any entry is made.
- **Evaluation:** the same rubric, the same interval, the same threshold.

| Result | Conclusion |
|---|---|
| CI lower bound ≥ 20% | **CLEAR** — proceed |
| CI upper bound < 20% | **FAIL** — stop; ship a folder convention and a good `AGENTS.md` |
| straddles at max window | **UNRESOLVED** — defer the graph, build the ungated work, revisit at a later checkpoint |

## Egress decision (ADR-0034)

Machine classification sends prompt text to a model provider. Per root, one of
`machine` or `hand-only`, **recorded in the report before Group 2 runs**. Any root
the user marks `hand-only` is never sent.

## Two-stage lock (ADR-0037 §6)

| Stage | Artifact | Locked |
|---|---|---|
| 1 | `rubric.md`, `protocol.md` | **before any data is seen** |
| 2 | the blind human labels | drawn before labeling, scored after |

Rule 11's load-bearing property holds: `rubric.md` — the only artifact that could
be tuned to flatter a result — is fixed first, and is byte-identical across v1 and
v2. The v2 bump touches classifier *validation* only, which is why it can be made
after the machine labels exist without compromising the measurement.

## Freeze enforcement

`tests/benchmarks/gate1-v1.freeze.test.ts` checksums every file in this directory
against `MANIFEST.sha256` and fails on any modification, deletion, or unlisted
addition. Regeneration is deliberate and visible in the diff — the enforcement is
review, not cryptography.
