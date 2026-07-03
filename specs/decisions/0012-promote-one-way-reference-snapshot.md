# 0012 — /promote imports momentum artifacts as one-way Reference snapshots

> **Status**: accepted
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

## Context

Engram and momentum are separate products that interoperate through OKF
([ADR-0001](0001-separate-product-shared-engine.md)). A momentum ADR or
history/learning entry captures durable *why* that belongs in the knowledge
vault. `/promote` (Phase 4) is the bridge. Three questions had to be settled:
what OKF `type` a decision maps to, how the source is read, and whether the link
is live or a snapshot.

## Options Considered

### Option A — New OKF `type` for decisions + live/bidirectional sync + SDK read

**Pros:** decisions keep a distinct kind; edits in momentum flow through.
**Cons:** a new `type` forces a validator/corpus change (violates Rule 11); live
sync couples the two products' lifecycles; reading via a momentum SDK creates the
exact runtime coupling ADR-0001 forbids.

### Option B — Existing `Reference` type + one-way snapshot + file-path read

**Pros:** no validator change; no runtime coupling (read momentum files as plain
text); a snapshot has clear, auditable provenance and never drifts silently.
**Cons:** a promoted concept can go stale versus its momentum source (mitigated by
re-running `promote`); cross-references to un-promoted siblings are broken-link
-tolerant, not resolved.

## Decision

**Adopt Option B.** `/promote`:

- maps a momentum artifact to the existing OKF `type: Reference` (no new type);
- reads the momentum artifact **by file path only** — Engram takes no momentum
  code or SDK dependency, upholding ADR-0001;
- derives a one-sentence `description` from the ADR `## Decision` (fallback:
  title; override: `--description`) because `description` drives progressive
  -disclosure retrieval ([ADR-0005](0005-navigate-first-retrieval.md));
- appends a `# Source` provenance block linking back to the momentum artifact —
  a **one-way, point-in-time snapshot**, never a live or bidirectional sync;
- runs `validateConcept` as a **hard pre-write gate**: a non-conformant mapping
  aborts and writes nothing, so the vault can never hold an invalid promoted
  concept.

## Consequences

- Rule 11 holds — the locked v1 validator/corpus is unchanged; promote conforms
  to it. Standard-link rewrite (wikilink→standard, relative→absolute) follows
  [ADR-0003](0003-standard-links-not-wikilinks.md).
- No momentum-side code or spec changes (forge-neutral); the momentum repo path
  is an explicit CLI argument, not discovered.
- Staleness is accepted and visible: a promoted concept is a snapshot; refresh is
  a re-run of `promote`. A locked v1 golden corpus (`tests/fixtures/promote/`)
  pins the mapping.
