# 0016 — OKF migration (`engram migrate`)

> **Status**: accepted
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

## Context

Adopting an existing folder of Markdown notes into a vault used to require adding
OKF frontmatter and converting `[[wikilinks]]` by hand. We want that done *through
the tool*, not by patching files manually — but engram is a deterministic CLI
with no LLM, so metadata must be derived mechanically.

## Options Considered

### Option A — Manual conversion (status quo)
**Cons:** doesn't scale; error-prone; exactly what the user should not have to do.

### Option B — LLM-derived metadata
**Cons:** breaks determinism (N3 — no mandatory model), adds a dependency, is
non-reproducible.

### Option C — Deterministic best-effort migration command
**Pros:** reproducible, offline, no dependency; produces immediately valid,
searchable concepts the user can refine later.
**Cons:** derived titles/descriptions are approximate.

## Decision

**Option C.** `engram migrate [dir]`:
- **Derive frontmatter** deterministically: `title` from the first heading (else
  filename), `description` from the first sentence, `tags` from the folder path,
  `timestamp` from file mtime, `type` = `Reference` (overridable `--type`).
- **Preserve** any existing valid frontmatter fields (fill only what's missing).
- **Convert `[[wikilinks]]`** → standard absolute links, resolving by filename or
  title; unresolved targets get a best-guess path and are flagged (broken-link
  tolerance, NFR-5). ([ADR-0003](0003-standard-links-not-wikilinks.md))
- **Dry-run by default**; `--write` applies then reindexes. Skips already-conformant
  files. Reserved files (`index.md`/`log.md`/`AGENTS.md`/`CLAUDE.md`) are never migrated.

## Consequences

- A plain notes folder becomes a conformant, searchable vault in one command.
- Migration is non-destructive-first (dry-run) and reproducible.
- Derived metadata is a starting point; `migrate` reports what it inferred so weak
  spots are easy to refine.
