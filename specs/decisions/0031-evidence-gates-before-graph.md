# 0031 — Evidence gates before graph investment

> **Status**: accepted
> **Date**: 2026-08-09
> **Deciders**: Avinash Kumar Singh

## Context

The v2 architecture rests on one untested assumption: **that structured navigation
beats brute search over the same folder.** An agent with `rg`, `find`, and a large
context window over a directory of markdown is a strong, zero-cost baseline, and
every structure engram adds must beat it.

The literature is precise about where graphs win and where they do not:

| Task class | Graph-guided | Naïve chunks |
|---|---|---|
| Multi-hop QA (Recall@5) | **87.8%** | 73.4% |
| Complex reasoning | **53.4** | 42.9 |
| Contextual summarization | **64.4** | 51.3 |
| Simple fact retrieval | 60.1 | 60.9 — **effectively a tie** |

The consensus framing is that graph retrieval is a third retrieval primitive with
real construction and maintenance cost, which earns its place *only* when a
measurable fraction of query traffic asks questions similarity search structurally
cannot answer.

Separately, [ADR-0027](0027-write-time-extraction-only.md) notes that LLM-authored
relations have documented error modes. A graph that lies confidently is worse than
no graph.

Building the whole architecture and then discovering either problem is the failure
this ADR exists to prevent.

## Options Considered

### Option A — Build it, then measure
**Pros:** momentum; the design is coherent and satisfying to implement.
**Cons:** a year spent before learning whether the premise holds. This is the
single most likely way the project dies.

### Option B — Feature-gated staging
Ship in stages, but advance on completion rather than evidence.
**Pros:** incremental releases.
**Cons:** completion is not evidence. Every stage passes because it was built.

### Option C — Evidence gates that can end the project
**Pros:** the cheapest possible kill is available at every step; each gate answers
a question that changes what gets built next.
**Cons:** requires accepting that a gate may say stop.

## Decision

**Option C.** Two gates, thresholds written before the measurement is taken
(Rule 11 — the evaluator is locked before the loop).

**Gate 1 — is the query traffic structural?**
Before any graph work, instrument real usage and classify questions as *lookup*
("what did I write about X") versus *structural* ("what superseded this", "what
depends on the thing I changed", "what have we already tried here").

- **Threshold: fewer than 20% structural → stop.** Ship a folder convention and a
  good `AGENTS.md`; do not build the graph.
- **Methodological requirement:** also log questions the user *wanted* to ask but
  did not bother asking, because nobody asks what nothing can answer. Measuring
  only today's questions undercounts by construction.

**Gate 2 — are the agent's typed relations correct?**
After write-time extraction ships and before traversal retrieval is built, sample
agent-authored edges and check semantic directionality and predicate accuracy
against human judgment.

- **Threshold to be fixed before sampling begins.** If accuracy is poor, stop at
  nodes plus untyped links — which is still a working product.

**The evaluator is locked.** The question corpus and scoring rules are committed to
`tests/benchmarks/` with a version tag before any optimisation begins, and are
never modified while being optimised against. Changes go to a version bump.

## Consequences

- Gate 1 costs roughly one afternoon of setup plus a collection window, and can end
  the project — which makes it the cheapest item on the entire roadmap.
- Phase ordering is forced: measurement precedes the core rewrite, not the reverse.
- A failed gate is a **successful outcome**, not a setback. The alternative is
  discovering the same fact after the work.
- Every first-principles pass in this design made the product smaller. That is
  either convergence on an irreducible core or subtraction toward zero; Gate 1 is
  the measurement that distinguishes them.
