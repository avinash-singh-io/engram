# 0027 — Relations are extracted at write time, never post-hoc

> **Status**: accepted
> **Date**: 2026-08-09
> **Deciders**: Avinash Kumar Singh

## Context

[ADR-0019](0019-node-edge-primitives.md) makes typed edges a primitive, and
[ADR-0018](0018-product-definition.md) puts the agent in charge of authoring them.
That is only viable because the authoring burden which killed the Semantic Web —
*semantics is prohibitively expensive to add by hand* — is near zero for an agent
that already knows the relationship, having just written the sentence containing it.

But the literature is unambiguous about the risk. Automatically extracted knowledge
graphs contain **incorrect semantic directionality, misinterpreted relation
predicates, and entirely spurious assertions**, which distort both the relational
structure and the semantics of the graph.

A graph that lies with confidence is strictly worse than no graph, because it is
trusted.

## Options Considered

### Option A — Post-hoc extraction over the corpus
Run an agent across the existing vault and infer relations.
**Pros:** bootstraps a graph from notes that already exist; one pass covers everything.
**Cons:** the agent is *guessing* from text it did not write. Every documented
error mode above is a post-hoc failure mode. At scale it produces thousands of
unverified assertions, and nobody audits thousands of anything.

### Option B — Write-time extraction only
The agent records relations at the moment it makes the change.
**Pros:** the agent is **reporting, not inferring** — it knows this decision
supersedes that one because it just made it. Volume is naturally bounded to the
rate of real work. Each assertion arrives with the context that justifies it.
**Cons:** an existing pile of notes gains no graph; coverage grows only as work happens.

### Option C — Write-time, plus post-hoc as a suggestion queue
**Pros:** bootstrapping without autonomous writes.
**Cons:** a suggestion queue is a review queue, and the founding constraint is that
no human has time for review queues.

## Decision

**Option B.** Relations are written at the moment the content is written. Post-hoc
extraction never writes autonomously — at most it may propose, and proposals are
not part of the v1 scope.

**Four mitigation layers**, two of which OKF v0.2 supplies for free:

1. **Write-time only.** The single largest reduction in error rate, because
   reporting beats inferring.
2. **`generated: { by, at }`** marks every agent assertion, so agent-authored
   relations are filterable and auditable. *(OKF v0.2 — free.)*
3. **`verified: [ { by, at } ]`** establishes a human-confirmed tier; retrieval may
   weight verified relations above unverified ones. *(OKF v0.2 — free.)*
4. **Relations are plain text in frontmatter** (ADR-0022), so a wrong one costs
   seconds to fix. This is load-bearing: the mitigation for imperfect extraction is
   that repair is trivial, not that extraction is perfect.

**A gate governs the investment.** Before traversal retrieval is built, sample the
agent's typed edges and check directionality and predicate accuracy. If accuracy is
poor, stop (see [ADR-0031](0031-evidence-gates-before-graph.md)).

## Consequences

- An existing vault gains no graph retroactively. Accepted — the graph grows with
  work, and work is what produces the non-regenerable knowledge ADR-0018 targets.
- `engram migrate` adopts existing notes as nodes without inventing relations
  between them.
- Trust tiering becomes a real retrieval input rather than a nice-to-have.
- If the gate fails, ADR-0019's primitives still stand — the vault degrades to
  nodes plus untyped links, which is a working product.
