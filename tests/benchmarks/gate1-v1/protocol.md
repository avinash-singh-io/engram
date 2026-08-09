# gate1-v1 — measurement protocol (LOCKED · pre-registered)

> **Status:** FROZEN. Version tag `gate1-v1`. Pre-registered before any data was
> classified. Do **not** edit — a change is `gate1-v2`. Rule 11 /
> [ADR-0037](../../../specs/decisions/0037-gate1-measurement-protocol.md).

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

1. A random 20% of in-denominator items is **hand-labeled blind** — machine labels
   not visible during labeling.
2. **Cohen's κ** computed between machine and human labels.
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
| 1 | `rubric.md`, `protocol.md` | **before any data is seen** ← this commit |
| 2 | `seed.jsonl` | after extraction, **before the classifier runs** |

The seed must be drawn from the corpus, which is unreadable until the reader
exists. Rule 11's load-bearing property holds regardless: the rubric — the only
artifact that could be tuned to flatter a result — is fixed first.

## Freeze enforcement

`tests/benchmarks/gate1-v1.freeze.test.ts` checksums every file in this directory
against `MANIFEST.sha256` and fails on any modification, deletion, or unlisted
addition. Regeneration is deliberate and visible in the diff — the enforcement is
review, not cryptography.
