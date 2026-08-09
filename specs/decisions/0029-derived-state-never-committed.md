# 0029 — Derived state is never committed; regenerate, never merge

> **Status**: accepted
> **Date**: 2026-08-09
> **Deciders**: Avinash Kumar Singh

## Context

[ADR-0023](0023-structure-tree-plus-views.md) introduces generated views, on top of
the per-directory `index.md` files from [ADR-0006](0006-auto-generated-indexes.md).
Both are derived from the node/edge graph.

Refiling is expected to be frequent (ADR-0021), and every refile touches many
generated files. Committed and synced across three devices, that produces large
diffs on every operation and merge conflicts in exactly the files nobody wants to
merge — worst on Android, where conflict resolution is hardest.

The pre-mortem's fourth failure mode: conflict fatigue leads to the health check
being ignored, at which point every other guarantee in the architecture is
decoration.

## Options Considered

### Option A — Commit derived files, merge conflicts normally
**Pros:** a fresh clone or a new device shows views immediately; everything is
visible in the repo.
**Cons:** derived files conflict constantly and their merges are meaningless — a
three-way merge of two generated indexes produces a third index that matches
neither source of truth.

### Option B — Commit derived files, resolve by regeneration
**Pros:** views present on clone; conflicts have a trivial correct answer.
**Cons:** still large diffs on every refile; the user still sees conflict prompts;
`git` still has to be told which conflicts are safe to blow away.

### Option C — Gitignore derived files; regenerate per device
**Pros:** derived state can never conflict because it is never synced. Diffs shrink
to the content that actually changed.
**Cons:** a fresh device shows no views until `reindex` runs.

## Decision

**Option C by default, Option B's resolution rule as the fallback.**

- **`views/` and generated indexes are gitignored by default** and rebuilt per
  device. Derived state is never synced, so it can never conflict.
- **If a user chooses to commit them**, the conflict resolution rule is
  **regenerate, never merge** — `engram reindex` is the correct resolution for any
  conflict in a derived file, and `doctor` says so.
- **Deleting derived state must always be safe.** Any generated file can be removed
  and rebuilt with no information loss. If that ever stops being true, the file is
  not derived and does not belong in `views/`.

Cost accepted: a fresh device shows no views until `reindex` runs, which is
seconds and can be triggered automatically on first invocation.

## Consequences

- Sync diffs contain only authored content, which is what makes multi-device
  refiling tolerable at all.
- The derived/authored boundary must be unambiguous in the tree — hence `views/`
  as a single reserved directory (ADR-0023) rather than generated files scattered
  among authored ones.
- Per-directory `index.md` (ADR-0006) is the one derived file that lives outside
  `views/`, for navigability. It follows the same rule: gitignored by default,
  regenerate-never-merge if committed.
- Obsidian users on a new device see an incomplete vault for a few seconds. Named
  here so it is not later mistaken for a bug.
