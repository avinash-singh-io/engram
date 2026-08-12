# 0040 — Gate 2: two thresholds, fixed before sampling

> **Status**: accepted
> **Date**: 2026-08-12
> **Deciders**: Avinash Kumar Singh
> **Completes**: [ADR-0031](0031-evidence-gates-before-graph.md), which left Gate 2's
> threshold "to be fixed before sampling begins" and never fixed it.

## Context

[ADR-0031](0031-evidence-gates-before-graph.md) defines Gate 2 — *are the agent's
typed relations correct?* — and states its own precondition:

> **Threshold to be fixed before sampling begins.** If accuracy is poor, stop at
> nodes plus untyped links — which is still a working product.

That threshold was never set. A gate with no bar is not a gate; it is a place where a
number will later be compared against whatever seems acceptable once it is known,
which is precisely the Rule 11 failure the gates exist to prevent.

Two further facts shape what is being measured:

1. **Engram does not extract.** [ADR-0034](0034-encryption-is-a-substrate-concern.md)
   forbids network calls, so engram cannot call a model.
   [ADR-0019](0019-node-edge-primitives.md) assigns extraction to the agent, which
   already knows the relationship when it writes the content, and
   [ADR-0027](0027-write-time-extraction-only.md) makes that the *primary* error
   mitigation. **Gate 2 therefore measures the agent's accuracy, not engram's.**
2. **Not all errors cost the same.** ADR-0027 warns that a graph which lies
   confidently is worse than no graph — but only some errors are lies.

## Options Considered

### Option A — One combined accuracy bar
A single figure over all edge errors, at some percentage.
**Pros:** simple to state, simple to measure, one number to report.
**Cons:** lets directionality errors hide behind predicate accuracy. A run at 92%
overall could be 99% predicate and 70% directionality — the worst possible mix,
reported as a pass.

### Option B — Two bars, weighted by what the error does
**Pros:** the bar matches the damage; the more dangerous error cannot be masked.
**Cons:** two numbers to satisfy, and a run can fail on one while excelling at the other.

### Option C — A stricter single bar (≥98%)
**Pros:** reflects how damaging a confidently wrong graph is.
**Cons:** realistically fails on current models, which means shipping nodes plus
untyped links — a legitimate outcome, but one to *intend* rather than back into.

## Decision

**Option B. Two bars, both fixed now, before any edge is sampled.**

| Error class | What it does | Bar |
|---|---|---|
| **Directionality** — `A supersedes B` when B supersedes A | **Inverts meaning.** Presents a superseded node as current, which is exactly the failure the validity filter exists to prevent | **≥ 95%** |
| **Predicate** — `sources` where `part-of` was meant | Degrades traversal. The edge is wrong but does not lie about currency | **≥ 90%** |

**Below either bar → stop at nodes plus untyped links**, per ADR-0031's own fallback.
That is a working product: capture, format, views, structure and health all stand;
only the structural route is withheld.

### Protocol

- **Corpus** — edges produced by `format` over real notes. The edges are genuine
  agent output; only the *trigger* is synthetic, since waiting for organic usage
  would recreate the multi-week collection window Phase 7 avoided. **Stated as a
  limitation in the report**, not glossed: edges produced in a batch over old
  material may differ in quality from edges produced in the flow of live work.
- **Sample** — ~50 edges, drawn deterministically from a seeded hash.
- **Validation** — **blind** human adjudication. The report **refuses a verdict**
  without it, enforced in code rather than asserted in prose.
- **Locked** — rubric and protocol frozen as `gate2-v1` under a checksum manifest
  before the corpus is generated (Rule 11).
- **Waivable, but never silently.** As with Gate 1, a waiver is recorded as a waiver
  and the instrument keeps reporting `PROVISIONAL`.

## Consequences

- Gate 2 can now actually be run, and can actually fail.
- A failure is a **successful outcome** in ADR-0031's terms: it stops a year of
  traversal work that the evidence does not support, and leaves a working product.
- Because engram does not extract, a Gate 2 failure is a statement about the *model*,
  not about engram's code. That matters for what happens next: the remedy would be a
  better extraction prompt or a different model, not an engram rewrite — and it can
  be re-measured against the same locked evaluator whenever either changes.
- Engram's own contribution to edge quality is that a wrong edge is plain text in
  frontmatter and costs seconds to fix (ADR-0022). ADR-0027 is explicit that this is
  the load-bearing mitigation: repair is trivial, not extraction is perfect.
