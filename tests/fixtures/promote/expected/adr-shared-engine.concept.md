---
type: Reference
title: Vendor the shared engine now, extract a library later
description: Vendor the engine pattern into each product now and defer the library extraction until a second consumer proves the seam.
tags: [momentum, adr]
timestamp: 2026-06-15T00:00:00Z
---

# Context

momentum and its sibling products share an engine — scaffold, adapters, and
hooks. Duplicating that engine per product risks drift, but extracting a shared
library now would block both roadmaps behind a packaging decision. See
[ADR-0001](/references/0001-separate-product-shared-engine.md) for the product split.

# Options Considered

### Option A — Extract a shared library immediately

**Pros:** one source of truth.
**Cons:** couples release cadences; premature.

### Option B — Vendor the pattern, extract later

**Pros:** each product ships independently; extraction stays reversible.
**Cons:** temporary duplication.

# Decision

Vendor the engine pattern into each product now and defer the library
extraction until a second consumer proves the seam. The [shared engine](/shared-engine.md) stays
a copied pattern, not a dependency, until the boundary is battle-tested.

# Consequences

- Both products keep independent release cadences.
- A future extraction is a mechanical refactor, not a redesign.

# Source

Promoted from momentum ADR-0007 (2026-06-15) — [0007-vendor-shared-engine.md](/momentum/decisions/0007-vendor-shared-engine.md).

One-way, point-in-time snapshot. Engram does not sync changes back to momentum;
re-run `engram promote` to refresh from the source.
