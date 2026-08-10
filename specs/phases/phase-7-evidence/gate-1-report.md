# Gate 1 — report and decision

> **Date**: 2026-08-10 · **Evaluator**: `gate1-v2` · **Decision**: **PROCEED**
> **Basis**: measured evidence, **validation waived by the owner**

## Outcome

**Gate 1 does not stop the project. Phases 8–11 proceed.**

Decided by Avinash Kumar Singh on 2026-08-10, with the classifier-validation step
of [ADR-0037](../../decisions/0037-gate1-measurement-protocol.md) §5 explicitly
waived. The measurement below is real; the independent check on it was not run.

## Measurement

| | |
|---|---|
| Corpus | 1066 human prompts · 21 roots · 105 sessions (stored agent transcripts) |
| Sample | 400, deterministic (seed 20260810) |
| `not-a-kb-question` | 364 |
| `lookup` | 4 |
| `structural` | 32 |
| **Denominator** (L+S) | **36** — 9.0% of the sample |
| **Structural fraction** | **88.9%** |
| 95% Wilson interval | **[74.7%, 95.6%]** |
| Threshold (ADR-0031) | 20% |

Per-root, opaque ids:

| root | n | L | S | structural |
|---|---|---|---|---|
| root-49f7ca | 122 | 1 | 13 | 92.9% |
| root-d0e2d8 | 100 | 0 | 8 | 100.0% |
| root-03679f | 37 | 2 | 2 | 50.0% |
| root-43c792 | 22 | 0 | 3 | 100.0% |
| root-0ccf15 | 18 | 0 | 3 | 100.0% |
| root-81cfad | 57 | 1 | 1 | 50.0% |
| root-04c6fa | 12 | 0 | 2 | 100.0% |

## What was NOT done, and what it costs

The labels come from **one rater, who also wrote the rubric**. No blind human
sample was taken, so **Cohen's κ is unmeasured** and the classifier is unvalidated.
`tools/gate1/report.js` therefore still prints `PROVISIONAL — NOT A GATE DECISION`
and always will on this data. That is correct behaviour and was deliberately left
intact — the instrument does not lie about its own limits; the owner overrode it.

**This number must never be cited as a validated result.**

### Sensitivity — why proceeding is defensible anyway

Holding the denominator at 36:

| structural | fraction | 95% lower bound | clears 20%? |
|---|---|---|---|
| 32 (measured) | 88.9% | 74.7% | yes |
| 20 | 55.6% | 39.6% | yes |
| 14 | 38.9% | 24.8% | yes |
| 12 | 33.3% | 20.2% | yes |
| **11** | 30.6% | 18.0% | **no** |

The classifier would have to be wrong on **21 of 32** structural calls — a 66%
error rate — before the gate stops clearing. Unvalidated is not the same as
unsupported: the margin absorbs a great deal of labelling error.

Two directional biases remain, per `gate1-v2/rubric.md`, and neither is corrected:
ambiguous prompts were labelled `not-a-kb-question`, which shrinks the denominator
and makes clearing *easier*; and the retrospective corpus undercounts structural
traffic, which makes the reading a *lower bound*. They point in opposite directions.

## Findings worth carrying forward

1. **Only 9% of prompts are knowledge-base questions at all.** The overwhelming
   majority are instructions. Whatever engram becomes, it sits beside a workflow
   that is mostly *doing*, not *asking*.
2. **The structural questions are overwhelmingly project-state questions** —
   *"whats the status"*, *"what's next"*, *"I think we decided X right?"* — which is
   precisely where text search cannot distinguish a current decision from a
   superseded one. This is engram's core case, and it is what the corpus actually
   contains.
## Threat to validity — the corpus is a different domain from the product

**Named by the owner on 2026-08-10, and the most serious limitation of this
measurement.**

The corpus is spec-driven **software development** traffic — momentum phases, build
instructions, release steps. Engram's target use case is a **knowledge base**.
These are not the same domain, so the 88.9% is not a direct measurement of the
thing the product is for. It is a measurement of an adjacent thing.

What transfers, and what does not:

| | |
|---|---|
| **Transfers** | The owner will give an agent this *same style* of prompt when working over a knowledge base — so the prompt shape is representative even when the subject matter is not. |
| **Transfers** | The structural questions found — *"what did we decide"*, *"is this still current"*, *"whats the status"* — are domain-independent in form. They ask "which recorded claim is live", which is the same question in a repo or a vault. |
| **Does not transfer** | The **rate**. There is no basis for claiming a knowledge base produces 88.9% structural traffic. A development repo and a personal vault accumulate different question mixes. |
| **Does not transfer** | The 9% denominator. A knowledge-base session is presumably far more question-heavy than a build session, which is mostly instructions. |

Direction of the error is arguable but not measured. A knowledge base accumulates
superseded material over *years*, where a repo's history is compressed into months
— which would push structural traffic **up**, not down. That is a plausible
argument, not evidence, and it is recorded as such.

**Conclusion: the decision stands, but the evidence is weaker than the number
looks.** PROCEED rests on the mechanism being demonstrated — real questions exist
that text search structurally cannot answer — rather than on the specific rate
being transferable. Anyone citing 88.9% as a property of knowledge-base traffic is
misreading this report.

## Other findings worth carrying forward

3. The corpus is one person, one working style, and agent-mediated sessions only.
   No claim is made about anyone else's traffic.

## Reopening

This is a waived check, not a passed one. It can be completed at any time — the
sample, the machine labels, and the blind worksheet are all preserved in `.gate1/`.
Filling in `adjudication.md` and re-running `report.js` produces the validated
verdict without redoing any work.
