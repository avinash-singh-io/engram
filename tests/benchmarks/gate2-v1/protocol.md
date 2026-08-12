# gate2-v1 — measurement protocol (LOCKED · pre-registered)

> **Status:** FROZEN. Version tag `gate2-v1`. Pre-registered before the corpus was
> generated. Do **not** edit — a change is `gate2-v2`. Rule 11 /
> [ADR-0040](../../../specs/decisions/0040-gate2-thresholds-and-protocol.md).

## Corpus

Edges produced by `format` over real notes, using the same agent path a user would.

**Stated limitation.** The trigger is synthetic: edges are generated in a batch over
existing material rather than in the flow of live work, because waiting for organic
usage would recreate the multi-week collection window Phase 7 deliberately avoided.
The edges are genuine agent output; the *when* is artificial. This appears in the
report, not only here.

## Sample

- **~50 edges**, drawn by a seeded hash so the draw is reproducible and independent
  of any label.
- Selection must not depend on the machine's own judgement of an edge — that would
  sample only where the agent already agrees with itself, which is the exact defect
  `gate1-v1` was version-bumped to fix.

## Judging

Two axes per [`rubric.md`](rubric.md), scored independently.

```
directionality = correct ÷ (correct + reversed)     [n/a excluded]
predicate      = correct ÷ (all judged edges)
```

## Validation

1. Every sampled edge is **hand-judged blind** — machine labels never shown, since
   seeing them would anchor the rater and measure suggestibility instead of accuracy.
2. Where both a machine and a human judgement exist, **Cohen's κ ≥ 0.70**.
3. The report **refuses a verdict** without human labels. Enforced in code.

## Decision rule — pre-registered, no post-hoc adjustment

| | Bar |
|---|---|
| Directionality | **≥ 95%** |
| Predicate | **≥ 90%** |

- **Both met → PASS.** Traversal retrieval is justified; Phase 11 proceeds.
- **Either missed → FAIL.** Stop at nodes plus untyped links (ADR-0031's own
  fallback). Capture, format, views, structure and health all still stand; only the
  structural route is withheld.

Intervals are reported alongside both point estimates. At n≈50 the intervals are
wide, and that is stated rather than hidden — a point estimate at this sample size
is a direction, not a measurement.

## Re-measurement

A FAIL is a statement about the **model**, not about engram's code, because engram
does not extract. The remedy is a better extraction prompt or a different model, and
either can be re-measured against this same locked evaluator. That is why it is
frozen rather than tuned.

## Waiver

Waivable, as Gate 1 was — but a waiver is recorded as a waiver, never as a pass, and
the instrument keeps printing `PROVISIONAL`.
