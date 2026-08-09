# 0023 — One human-chosen physical tree, plus generated views

> **Status**: accepted
> **Date**: 2026-08-09
> **Deciders**: Avinash Kumar Singh
> **Extends**: [ADR-0006](0006-auto-generated-indexes.md)

## Context

Engram must not depend on one organisational philosophy. A user should be able to
start from PARA, Zettelkasten, Johnny.Decimal, or something they invent — the
dependency-inversion principle applied to structure: high-level policy (how *I*
like to organise) must not be welded to low-level detail (where bytes sit).

But structure is also the dimension that matters **most to the human**. An
unorganised knowledge base is unusable to a person, regardless of how navigable it
is to an agent. People navigate by folders. Any design where `cd` into the
directory reveals nothing comprehensible has failed the primary user.

These two requirements pull against each other, because a folder tree is a
**single** hierarchy — one note lives in exactly one folder — while knowledge is
natively multi-hierarchical.

An earlier draft of this decision overclaimed, proposing that structure is purely a
view and files live nowhere in particular. That fails the human requirement.

## Options Considered

### Option A — Folders are the structure
**Pros:** maximally browsable; zero machinery; what everyone already does.
**Cons:** exactly one structure, forever. Switching from PARA to Zettelkasten means
physically moving every file and rewriting every link. Note that PARA is the worst
case here — its whole design is that items *migrate* between the four buckets.

### Option B — Flat store, structure entirely projected
All notes in one directory with generated views on top.
**Pros:** N simultaneous structures; switching costs nothing.
**Cons:** the filesystem becomes unreadable to a human. Fails the dimension that
matters most.

### Option C — One physical tree, plus generated views, plus cheap reorganisation
**Pros:** browsable like any folder; alternative arrangements available without a
second copy of anything; the primary tree is safe to change later.
**Cons:** one arrangement is still privileged; alternative views are read-only
projections, not places you file into.

## Decision

**Option C**, stated as three separate claims so they are not conflated again:

1. **One physical tree, human-chosen.** Non-negotiable. `engram init --structure=<x>`
   scaffolds a starting tree; the user is free to ignore it and build their own.
   Engram has no opinion about the shape.
2. **Views are free.** `views/superseded.md`, `views/unread-sources.md`,
   `views/by-tag.md`, `views/recent.md` — generated from edges, moving nothing,
   duplicating nothing. They provide the *other* arrangements as extra entry points.
3. **Reorganising is cheap.** This is what [ADR-0021](0021-identity-slug-path-aliases.md)
   buys. Move a file; slug unchanged; `aliases` records the old path; links repair.
   Not free — cheap enough that you actually do it.

Reference tree (illustrative, not prescribed):

```
my-vault/
├── AGENTS.md
├── index.md          # generated
├── inbox/            # raw, no schema, anything goes
├── concepts/         # evergreen understanding
├── decisions/        # episodic; supersession lives here
├── sources/          # papers, videos, posts
├── projects/
└── views/            # 100% generated, gitignored, delete freely
```

Everything outside `views/` is authored content in a tree the user chose.
Everything inside `views/` is derived — deleting it loses nothing (ADR-0029).

## Consequences

- The filesystem stays legible without tooling. `cat` a file and it makes sense;
  `ls` a directory and the arrangement is obvious.
- `part-of` becomes a closed relation type the moment view generation ships
  (ADR-0022) — views are projections of `part-of` edges, not of the folder tree.
- Views are read-only. Filing happens in the tree; views are entry points.
- The value of the identity model is reframed: it is not for holding five
  structures at once, it is for making the one structure you have **safe to
  change**. A vault you are afraid to reorganise ossifies.
- ADR-0006's auto-generated `index.md` is unchanged and becomes a special case of
  a view.
