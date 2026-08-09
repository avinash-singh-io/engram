# 0021 — Identity is a slug; path is an address; aliases live in the file

> **Status**: accepted
> **Date**: 2026-08-09
> **Deciders**: Avinash Kumar Singh
> **Supersedes**: the path-is-identity rule established in [ADR-0002](0002-okf-v01-format.md)

## Context

Engram v0.6.x sets `concept id = file path minus .md`. That is free, human-visible,
and requires no maintenance — but it fails in three independent ways, and the
design review confirmed all three matter for the intended usage (frequent refiling,
three devices, Obsidian on Android).

1. **Refiling breaks links.** Moving a file changes its identity, so every inbound
   link dangles. In practice users stop reorganising, and the vault ossifies into
   whatever shape it had in month two.
2. **Supersession cannot name its target.** "v3 replaces v1" needs a referent that
   survives v1 being archived or moved.
3. **Cloud sync mints fake nodes.** Drive, Dropbox, and Syncthing resolve
   concurrent edits by **renaming** (`graph-rag (1).md`). Under path-is-identity a
   conflict copy is silently a *new concept* with a broken inbound link set, and
   nothing can detect it.

## Options Considered

### Option A — Keep path-is-identity
**Pros:** zero ceremony, nothing to maintain, no field a human can delete, the link
*is* the id.
**Cons:** all three failures above. The third produces silent corruption.

### Option B — Opaque id (UUID / ULID) in frontmatter
**Pros:** maximum durability; immune to renames and collisions.
**Cons:** hostile to an agent composing prose — every link requires a lookup
round-trip, and forward-links to not-yet-written concepts become impossible.
Unreadable to the human co-author. Cannot be a markdown link target.

### Option C — Content hash
**Pros:** nothing to maintain; deterministic; free duplicate detection.
**Cons:** identity changes on every edit. Correct for immutable blobs, wrong for
living documents.

### Option D — Path + a central redirect ledger
**Pros:** preserves everything good about path-is-identity; HTTP-301 semantics.
**Cons:** a single append-only file written from three devices is a
write-contention hotspot — it conflicts on **every** sync, and conflicts most
exactly when refiling is heaviest. Fails on its own mechanism.

### Option E — Human-readable slug in-band, path as address
**Pros:** stable across moves; agent-guessable so links can be composed without a
lookup and can point at unwritten concepts; human-legible; markdown links keep
carrying paths so they render everywhere.
**Cons:** two identifiers that can disagree; slug uniqueness needs reconciling.

## Decision

**Option E, with the move ledger decentralised.**

- **Address = path.** Links stay `[Title](/dir/file.md)`. They render in Obsidian,
  GitHub, and any markdown tool. This is the fast path.
- **Identity = a human-readable slug** in frontmatter. Stable across moves.
- **Move history = `aliases:` in the moved file's own frontmatter.** Never a
  central ledger. Two devices moving two different files touch two different
  files — structurally conflict-free.
- **Index = derived and regenerated, never merged** (ADR-0029).

**Identity is for repair, not resolution.** Links resolve by path — that is the
fast path and it stays. The slug is the recovery path: when a link breaks, or a
supersession needs a referent, or a conflict copy appears, the slug identifies
what the thing actually is. Street address versus person's name.

**Slug collisions are a warning, never an error.** Two devices editing offline may
generate the same slug for different notes. Coexisting is recoverable; a rejected
write is not.

**Degradation is required.** A human editing in Obsidian may delete the field. No
slug means fall back to path-is-identity for that file and warn in `doctor`. Never
an error.

## Consequences

- Reorganising becomes cheap, so it actually happens — which is what makes
  ADR-0023's "one physical tree" safe to choose imperfectly at the start.
- Supersession (ADR-0020) gets a stable referent. Identity had to be decided first;
  the ordering was not incidental.
- Sync conflict copies become detectable duplicates rather than silent new nodes.
- Two identifiers can drift; reconciliation is a `doctor` responsibility.
- This is a **two-way door** — the fields are additive, links do not change shape,
  and stripping both lands back on path-is-identity.
