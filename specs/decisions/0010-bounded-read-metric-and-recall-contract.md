# 0010 — Bounded-read metric = body-tier reads; recall returns references

> **Status**: accepted
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh
> **Extends**: [ADR-0005](0005-navigate-first-retrieval.md) (navigate-first),
> [ADR-0006](0006-auto-generated-indexes.md) (index format)
> **Resolves**: FEAT-002 (`/recall` output contract)

## Context

Phase 2 ships `engram recall` and must prove two success metrics from ADR-0005:
**M3** (retrieval cost is bounded/sublinear regardless of vault size) and **M6**
(never a whole-vault load). To measure them we need a precise, testable
definition of what a "read" is — otherwise the numbers are unfalsifiable. Two
sub-questions had to be settled before building the measurement loop (Rule 11):

1. **Which reads does "never load the whole vault" bound?** The navigator reads
   `index.md` maps and, on some paths, every concept's *frontmatter* (the grep
   fallback). If those count against M6, a legitimate index scan looks like a
   whole-vault load.
2. **What does `recall` return** — a list of file references, or pre-opened
   concept bodies/sections? (The open PRD question behind FEAT-002.)

## Decision

### 1. M3/M6 bound **body-tier** reads only

Every filesystem read is charged to one of four tiers by a single instrumented
reader (`ReadLedger`): `index`, `frontmatter`, `grep`, `body`. **Only `body`
(full concept content — the context-consuming operation an agent would ingest)
is what M3/M6 constrain.** `index` / `frontmatter` / `grep` reads return a
distilled, one-line-per-concept payload (title, description, tags) and never
surface a body, so scanning the index map — or even grepping frontmatter — is
**bounded auxiliary I/O, not a whole-vault load.**

Concretely, the locked evaluator asserts per query:

- `bodyReads <= maxBodyReads` (a small constant) and `bodyReads < conceptCount`
  — M6.
- `filesTouched / conceptCount <= maxFilesFraction` — M3. Structural descent
  reads `O(directories)` index maps (~16% of files on the v1 fixture), never
  `O(concepts)` bodies.
- `index`-tier reads dominate `body`-tier reads.

Directory enumeration (the `conceptCount` denominator) lists structure without
reading content and is not charged to any tier.

### 2. `recall` returns ranked references, not bodies (FEAT-002)

`recall` returns a **minimal set of ranked concept references** —
`path + title + description + why-matched` — the *map to the answer*, not the
answer. Bodies stay closed by default (progressive disclosure). `--sections`
opts into reading matched headings; `--hops` opts into one-hop link expansion.
Both read the `body` tier and stay within the read budget. This is the stable
exported `RecallResult` contract (Phase 5 hybrid + MCP consume it).

## Consequences

- The bounded-read claim is precise and testable; the `recall-v1` harness proves
  it with a fresh `ReadReport` each run (Rule 12).
- Tag filtering on an ADR-0006 (description-only) index falls back to a bounded
  frontmatter grep. Inlining tags into index bullets to prune those reads would
  be an **ADR-0006 amendment**, not a mid-phase edit (Rule 10) — deferred.
- The grep fallback reads many frontmatters (high `filesTouched`) but **zero
  bodies**, so M6 holds even in the fallback; M3's fraction bound is asserted on
  index-answerable queries where the fallback does not fire.
- Structural sublinearity requires a nested, navigation-grade index. A flat
  vault degrades to a single large index read; the index-quality checker warns.
