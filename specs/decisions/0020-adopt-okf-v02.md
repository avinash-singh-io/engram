# 0020 — Adopt OKF v0.2; do not invent time or provenance

> **Status**: accepted
> **Date**: 2026-08-09
> **Deciders**: Avinash Kumar Singh
> **Supersedes**: [ADR-0002](0002-okf-v01-format.md)

## Context

[ADR-0002](0002-okf-v01-format.md) adopted OKF v0.1 and stated explicitly that
*"a future OKF v0.2 is a spec-migration decision, not a silent change."* This is
that decision.

The 2026-08 design review identified four invariant core dimensions every stored
unit must answer for an agent: **identity**, **relation**, **time** (is this still
true?), and **provenance** (who asserted it?). Engram v0.6.x answers only the
first, partially. Time and provenance were about to be designed from scratch.

Google Cloud shipped **OKF v0.2**, which adds trust signals. It covers time and
provenance directly:

| Field | Purpose |
|---|---|
| `sources` | provenance — what a concept derives from; entries carry `id`, `resource`, `title`, `author`, `usage_count`, `last_modified` |
| `generated: { by, at }` | how content was produced and when it last meaningfully changed |
| `verified: [ { by, at } ]` | independent confirmations; establishes a trust tier (unverified / machine-confirmed / human-reviewed) |
| `stale_after` | absolute date after which the concept requires re-verification |
| `status` | `draft → stable → deprecated` |

All new fields are **optional and backward-compatible with v0.1**, and custom keys
are preserved rather than rejected. The spec records *signals, not scores*.

## Options Considered

### Option A — Stay on v0.1 and design our own trust/time fields
**Pros:** total control over naming and semantics.
**Cons:** reinvents a published standard for the exact problem; loses
interoperability with every OKF-aware tool; guarantees a painful migration later.

### Option B — Adopt v0.2 wholesale
**Pros:** two of the four core dimensions arrive already specified and
interoperable; backward-compatible so no data migration is forced; upstream has an
open extension proposal for typed relationship edges, so engram's remaining need
is a contribution rather than a fork.
**Cons:** young spec, still evolving; the attestation fields (`executor`,
`receipt`, `attester`) are irrelevant to a personal vault.

## Decision

**Adopt OKF v0.2.** Engram uses the spec's fields for time and provenance rather
than inventing equivalents:

- **Provenance** — `sources`, `generated`, `verified`
- **Time / lifecycle** — `timestamp`, `stale_after`, `status`

**One addition.** `status: deprecated` records that a node is dead but not *what
replaced it*. Engram adds **`supersedes`** — a relation to the node this one
replaces. Per ADR-0022 it lives in frontmatter as a relation list, matching the
shape v0.2 already uses for `sources`. Typed relationship edges are an open
upstream extension proposal; engram's usage is intended to feed that, not fork it.

**Attestation fields are out of scope.** `executor` / `receipt` / `attester` serve
sanctioned computation in an enterprise catalog. A personal vault has no such
requirement.

**Required-field policy reverses.** ADR-0002 required five fields and rejected
files missing them. OKF requires exactly one (`type`). Engram no longer rejects —
see [ADR-0026](0026-validation-gates-promotion.md).

## Consequences

- Two of four core dimensions are retired without writing a line of schema design.
- `verified` and `generated.by` become the mitigation layer for agent-authored
  relation errors (ADR-0027): agent assertions are filterable, and human-confirmed
  ones can be weighted higher at retrieval.
- Interoperability holds — any OKF v0.2 tool reads an engram vault and vice versa.
- Engram must track upstream. A future v0.3 is again a spec-migration decision,
  recorded as an ADR, never a silent change.
- The `okf_version` marker on the root index moves from `0.1` to `0.2`.
