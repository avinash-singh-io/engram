# 0022 — Typed relations live in frontmatter; a closed type requires code

> **Status**: accepted
> **Date**: 2026-08-09
> **Deciders**: Avinash Kumar Singh
> **Amends**: [ADR-0003](0003-standard-links-not-wikilinks.md)

## Context

[ADR-0003](0003-standard-links-not-wikilinks.md) chose standard markdown links and
declared them **untyped** — *"say the relationship in prose."* That decision is in
direct conflict with the premise that structure, not content, is the irreplaceable
part of a knowledge base. An untyped edge carries roughly one bit: *these two
things are somehow related*. It is why every large Obsidian graph becomes a
beautiful, unqueryable hairball.

Two questions follow: **where** does a relation type live, and **how many** types
should exist.

A markdown link has nowhere to put a type — `[Graph RAG](/x.md)` has no slot.
And an unbounded type vocabulary is RDF, whose ontology burden is exactly what
killed it.

## Options Considered

### Where the type lives

**A — In the body, adjacent to the link.** Keeps the relation next to the prose
that motivated it; invisible to Obsidian.
*Cons:* fragile to parse; no established convention; two writers (human, agent)
editing the same sentence.

**B — In frontmatter as relation lists.** `supersedes: /decisions/x.md`,
`sources: [...]`.
*Pros:* trivially parseable; human-readable and human-editable; **OKF v0.2 already
establishes this shape with `sources`**; Obsidian renders frontmatter links as
real properties and draws them in the graph.
*Cons:* the edge sits away from the prose that motivated it and can drift from it.

### How many types

**C — A rich ontology.** Expressive; unmaintainable; RDF's grave.
**D — Zero types.** Obsidian's model; costs nothing; discards the value.
**E — A small closed set plus unlimited free vocabulary.**

## Decision

**Relations live in frontmatter (Option B), following OKF v0.2's `sources` shape.**
Prose links remain and remain untyped — ADR-0003 survives for *body* links, which
are the human-facing, graph-drawing layer. Typed relations are a separate,
machine-facing channel.

**The closed set is governed by a test, not a number:**

> **A relation type is closed only if code exists that behaves differently because
> of it. No code, no closed type.**

Shipping a type with nothing behind it produces a free-form tag wearing a uniform —
the full cost of a permanent contract with every agent that will ever write into
the vault, and none of the benefit.

Current standing:

| Relation | Behavior it drives | Status |
|---|---|---|
| `supersedes` | retrieval skips the stale node; the old one is invalidated, never deleted | **closed — build it** |
| `sources` | lineage; audit a synthesis claim back to origin; already in OKF v0.2 | **closed — build it** |
| `part-of` | generates views that differ from the folder tree | closed **iff** views ship (ADR-0023) |
| `contradicts` | surface both sides rather than silently picking | wait — no code yet |
| `depends-on` | change-impact analysis | wait — no code yet |
| `duplicate-of` | merge cloud-sync conflict copies | wait — no code yet |
| everything else | none | **free forever** |

**Free vocabulary is unlimited.** The agent may invent any relation word it likes —
*relates-to*, *inspired-by*, *refines*, *reminds-me-of*. Engram carries them and
never reads them.

## Consequences

- The closed set today is **two**, possibly three. Growing it later is additive and
  safe; shrinking it is a breaking change, so the set starts smaller than comfortable.
- Obsidian's graph still draws every edge, because body links are unchanged and
  frontmatter links render as properties.
- Frontmatter relations can drift from the prose that motivated them. Accepted:
  `doctor` can flag a `supersedes` whose target no longer exists, but cannot verify
  that the prose still means it.
- Because relations are plain text in frontmatter, a wrong one costs seconds to
  fix — a load-bearing part of the ADR-0027 mitigation.
