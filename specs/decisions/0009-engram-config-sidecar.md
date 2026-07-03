# 0009 — `.engram/` tooling sidecar directory

> **Status**: accepted
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

## Context

Engram needs a home for tooling state that is **not** vault knowledge: an
`okf_version` + ignore-globs config, a concept template `/refine` reads, and
non-destructive archives of consumed inbox items. Putting these among concepts
would pollute enumeration and indexes (a real bug seen in Phase 1: a scaffolded
doc at the vault root was indexed as an empty concept).

## Options Considered

### Option A — Scatter tooling files among vault content
**Cons:** pollutes concept enumeration + indexes; ambiguous what is "knowledge".

### Option B — A single hidden `.engram/` sidecar directory
**Pros:** one obvious place for tooling state; excluded from concept enumeration
(it's a dotdir, already in the ignore set); keeps vault content pure; still plain
files (no lock-in — Principle 1 / NFR-2).
**Cons:** dotdir is hidden in Obsidian/Finder (acceptable for tooling).

## Decision

**Option B.** Introduce `.engram/` holding `config.json` (okf_version + ignore),
`concept.template.md`, `obsidian-setup.md`, and `archive/` (consumed inbox items,
moved non-destructively per Principle 6). The canonical vault walker ignores
`.engram/` (and all dotdirs). Non-concept scaffolded docs live here, not at the
vault root, so they are never enumerated or indexed.

## Consequences

- Concept enumeration and indexes stay clean (the Phase 1 root-index bug is fixed
  structurally, not by special-casing a filename).
- `.engram/` is plain files — deleting it loses only derived/tooling state, never
  knowledge; the vault remains readable with zero tooling.
- Later phases store machine-local derived data here too (e.g. Phase 5 embeddings
  index), gitignored where appropriate ([ADR-0004](0004-git-source-of-truth.md)).
