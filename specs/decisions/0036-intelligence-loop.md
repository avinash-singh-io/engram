# 0036 — The intelligence loop: observe → distill → confirm → act → decay

> **Status**: accepted
> **Date**: 2026-08-10
> **Deciders**: Avinash Kumar Singh
> **Builds on**: [ADR-0035](0035-user-memory-second-store.md)

## Context

[ADR-0035](0035-user-memory-second-store.md) establishes *where* observations live.
This decides *what is inferred*, *how it is learned*, and *how it reaches the user*.

The failure mode is well known and severe:

> **A proactive system that is wrong is worse than none, because it teaches the
> user to ignore the tool.** This is the same shape as the graph-that-lies risk in
> [ADR-0027](0027-write-time-extraction-only.md), and it deserves the same discipline.

Most productivity "intelligence" is a counter wearing a lab coat. The test applied
here is not *can we compute it* but **would a correct answer change what the user does.**

## Options Considered

### Option A — Statistics dashboard
Note counts, streaks, tag clouds, activity graphs.
**Pros:** trivial; demos well.
**Cons:** changes no behavior. Rejected outright.

### Option B — Continuous autonomous inference that writes directly
The system observes and asserts patterns as fact.
**Pros:** zero user friction.
**Cons:** unfalsifiable claims about a person, accumulating unreviewed; the exact
"large well-formatted pile you never reviewed" failure that guardrails exist for.

### Option C — A closed loop where inference is proposed, evidenced, and decays
**Pros:** every claim is auditable and rejectable; wrong patterns die rather than
accumulate; uses the trust machinery already in the core.
**Cons:** slower to become useful; requires the user to confirm, at least at first.

## Decision

**Option C.** Five steps, each mapping to machinery that already exists:

| Step | What happens | Mechanism |
|---|---|---|
| **OBSERVE** | append-only event log — captures, retrievals, opens, edits, and **misses** | `.engram/memory/events/` |
| **DISTILL** | periodically an agent reads events and **proposes** patterns as nodes | `format` + the write gate |
| **CONFIRM** | patterns start unverified; the user confirms or rejects, or usage confirms | `verified: [{by, at}]` |
| **ACT** | confirmed patterns weight retrieval and drive surfacing | retrieval trust-weighting |
| **DECAY** | unreinforced patterns expire; raw events compact | `stale_after`, `status` |

No new fields. `generated` / `verified` / `stale_after` / `sources` already carry
all four states, which is the second confirmation that the core is the right shape.

### What is worth inferring — in value order

Ranked by *would a correct answer change behavior*, not by how impressive it sounds.

1. **Retrieval failure.** You asked; the vault could not answer. That is a **gap**,
   and the single best input to *what should I write next*. **Requires no
   intelligence at all — only a log nobody keeps.**
2. **Re-derivation.** The agent answered from scratch while the vault already held
   it. That is a *retrieval* failure, not a knowledge gap — a different diagnosis
   and a different fix, and the two are indistinguishable without logging both.
3. **Contradiction.** Two nodes assert incompatible things and neither supersedes
   the other. Hard for a human to notice, easy for something holding the graph.
   This is where `contradicts` finally earns code behind it
   ([ADR-0022](0022-relations-in-frontmatter.md)).
4. **Staleness that matters.** Not *"this note is old"* — useless. **"You are about
   to build on a node whose sources are 14 months old and superseded upstream."**
   Staleness × intent.
5. **Dead weight.** Most captures are never retrieved. Knowing *which* fraction is
   actually used changes what the user bothers capturing.
6. **Rhythm and context.** Surfacing notes ahead of a known event. Real, and the
   **least differentiated** — many tools do it. Ranked last deliberately, because it
   is the one that demos best.

Items 1 and 2 need no model. They need a log.

### Non-negotiable constraints

- **Proposals, never facts.** A pattern is unverified until confirmed.
- **Every recommendation cites its evidence** — *"you opened X before each of the
  last four PRDs"* — by following `sources`. An unciteable recommendation is not shown.
- **Rejection is a signal**, recorded, not discarded.
- **Rate-limited.** A hard ceiling on proactive interruptions per day.
- **Observation on by default; proaction opt-in.** Watching is cheap and reversible;
  interrupting is neither.
- **Rule 11 applies.** The evaluator for "is the loop helping" is locked and
  committed to `tests/benchmarks/` *before* the loop is built. An optimisation loop
  with a mutable evaluator measures motion, not progress.

## Consequences

- The observation substrate is needed **before** any inference — and Phase 7's
  Gate 1 instrumentation *is* that substrate. Logging real questions and classifying
  them is literally the first user-memory feature, so one build serves two purposes.
- The intelligence layer is downstream of usage by **dependency**, not by priority.
  There is no usage yet; there is nothing to learn from.
- Items 1–5 are the differentiator: they are impossible on a substrate without time,
  provenance, and typed relations, which is why competitors have not shipped them.
- Item 6 (calendars, events, connectors) is where engram would become a productivity
  suite competing with much larger incumbents. Kept out of the core deliberately —
  tracked as a Tier-2 connector, post-v2.
- If confirmation proves too burdensome in practice, the fallback is *implicit*
  confirmation by usage (a pattern acted on and not corrected counts as confirmed) —
  never removal of the confirmation step.
