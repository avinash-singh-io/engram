# 0007 — Vendor the shared engine now, extract a library later

> **Status**: accepted
> **Date**: 2026-06-15
> **Deciders**: Platform team

## Context

momentum and its sibling products share an engine — scaffold, adapters, and
hooks. Duplicating that engine per product risks drift, but extracting a shared
library now would block both roadmaps behind a packaging decision. See
[ADR-0001](0001-separate-product-shared-engine.md) for the product split.

## Options Considered

### Option A — Extract a shared library immediately

**Pros:** one source of truth.
**Cons:** couples release cadences; premature.

### Option B — Vendor the pattern, extract later

**Pros:** each product ships independently; extraction stays reversible.
**Cons:** temporary duplication.

## Decision

Vendor the engine pattern into each product now and defer the library
extraction until a second consumer proves the seam. The [[shared engine]] stays
a copied pattern, not a dependency, until the boundary is battle-tested.

## Consequences

- Both products keep independent release cadences.
- A future extraction is a mechanical refactor, not a redesign.
