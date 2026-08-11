# 0019 — Node and Edge are the only primitives

> **Status**: accepted
> **Date**: 2026-08-09
> **Deciders**: Avinash Kumar Singh

## Context

Engram v0.6.x has one primitive — the Concept, a file with five required
frontmatter fields — plus `type` (open vocabulary, never interpreted), `tags`,
per-directory `index.md`, and untyped markdown links. That set was assembled, not
derived. The design review asked what the irreducible atoms of a knowledge base
actually are, such that **any** structure composes out of them and engram ships
no taxonomy of its own.

An earlier attempt modelled four "knowledge primitives" (Private Life, Technical
Research, Company IP, Growth). Review found these are not primitives at all —
they are four *values* on a single audience axis, which is why they generalise to
nobody else.

## Options Considered

### Option A — Keep the Concept as the primitive, extend with fields
**Pros:** no migration; familiar; matches the reference OKF parser.
**Cons:** `type` looks like a primitive distinction but drives zero behavior —
enforcement without interpretation. Tags and links are two syntaxes for the same
thing. Nothing composes; every new need becomes another field.

### Option B — A typed taxonomy (Concept / Decision / Record / Procedure as real schemas)
**Pros:** matches the CoALA semantic/episodic/procedural split; different decay
mechanics get different fields.
**Cons:** this is a taxonomy, which ADR-0018 declines to ship. Four fixed schemas
serve the author and nobody else.

### Option C — Node + Edge
Reduce everything to an addressable thing and a directed relation between things.
**Pros:** every apparent primitive collapses into one of the two (see table).
Any structure becomes a choice of which edges get authored, so N designs derive
without engram having an opinion.
**Cons:** the graph model is only as good as the edges, and edges are expensive
to author by hand — which is precisely the burden that killed RDF.

## Decision

**Option C.** The complete primitive set:

- **NODE** — an addressable thing. May have a body. **May be empty** (a name you
  can point at — a link to an unwritten note is a valid node, not an error).
- **EDGE** — a directed, *typed* relation between two nodes.

Both carry one obligatory stamp: **who** asserted it, **when**, and **until when**.

Everything else reduces:

| Looks primitive | Actually is |
|---|---|
| `type: Reference` | an edge — *this* is-a *Reference* |
| `tags: [temporal]` | an edge to an abstract node |
| A folder / category | an edge — *this* part-of *that* |
| An index or MOC | a **projection** of edges — generated, never authored |
| A citation | an edge to a source node |
| A PDF attachment | a node with a non-text body |

**The generalisation rule:** *any structure is a choice of which edges you author.*
PARA is `part-of` edges into four containers. Zettelkasten is dense untyped
`relates-to` edges. Johnny.Decimal is `part-of` with numeric names. Engram ships
the primitives and has no opinion about the composition.

RDF's authoring burden is answered by ADR-0027: the agent writes the edges at the
moment it writes the content, because it already knows the relationship.

## Consequences

- `type` and `tags` become **free vocabulary** — carried, never interpreted. A
  lawyer's `Case`/`Statute`/`Memo` and a researcher's `Paper`/`Method`/`Finding`
  cost engram nothing.
- The closed set of *interpreted* edge types is deliberately tiny and governed by
  ADR-0022.
- The CoALA kinds (semantic / episodic / procedural) are not types — they are
  **decay behaviors**, expressed through the time stamp rather than a schema.
- Indexes and MOCs stop being authored artifacts and become derived output
  (ADR-0023, ADR-0029).
- Supersession becomes an **edge**, not a metadata field, which is more correct:
  it is inherently a relation between two things.
