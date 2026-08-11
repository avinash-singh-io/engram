# 0002 — OKF v0.1 as the format

> **Status**: superseded by [ADR-0020](0020-adopt-okf-v02.md) (2026-08-09)
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

> **Superseded.** OKF v0.2 shipped with trust signals; engram adopts it. The
> five-required-field policy and the path-is-identity rule established here are
> also replaced — see [ADR-0026](0026-validation-gates-promotion.md) and
> [ADR-0021](0021-identity-slug-path-aliases.md). This ADR anticipated exactly
> this: *"a future OKF v0.2 is a spec-migration decision, not a silent change."*

## Context

Engram needs a file format for "knowledge as markdown for agents." The
LLM-wiki pattern (Karpathy, April 2026) is widely hand-rolled; every team's
version is incompatible. Google published the **Open Knowledge Format (OKF)** on
2026-06-12 (GoogleCloudPlatform/knowledge-catalog `okf/SPEC.md`) for exactly this
use case: durable markdown knowledge that agents read and update over time.

## Options Considered

### Option A — Roll our own frontmatter/link conventions
**Pros:** total control; fit our exact needs.
**Cons:** no interoperability; reinvents an emerging standard; every consumer
needs Engram-specific parsing.

### Option B — Adopt OKF v0.1
**Pros:** emerging standard for this precise use case; interoperable; no
lock-in; a reference parser exists; conventions (required `type`, index.md,
log.md) already match our progressive-disclosure needs.
**Cons:** young spec (v0.1) may evolve; a few constraints (standard links, not
wikilinks) create friction with Obsidian defaults.

## Decision

**Adopt OKF v0.1 as the format.** Engram files MUST conform. Engram *additionally
requires* `title`, `description`, `tags`, `timestamp` (beyond OKF's minimal
`type`), because the reference parser rejects files missing
type/title/description/timestamp and because `description` is the load-bearing
field for progressive disclosure.

Concrete enforced rules (spec'd in Phase 0):
- YAML frontmatter with required `type`, `title`, `description` (one sentence),
  `tags`, `timestamp`.
- Structural markdown body (headings/lists/tables/code) over prose.
- Standard markdown links, absolute bundle-relative
  ([ADR-0003](0003-standard-links-not-wikilinks.md)).
- Per-directory `index.md` (no frontmatter); ISO-dated newest-first `log.md`.
- Concept ID = file path minus `.md`.

## Consequences

- Interoperability: any OKF-aware tool can read an Engram vault, and vice versa.
- The wikilink friction is accepted and handled in
  [ADR-0003](0003-standard-links-not-wikilinks.md).
- Engram tracks OKF versions; a future OKF v0.2 is a spec-migration decision, not
  a silent change (`okf_version` on root `index.md`).
