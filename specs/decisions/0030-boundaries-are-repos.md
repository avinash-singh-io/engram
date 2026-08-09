# 0030 — Boundaries are repositories; one root is the whole world

> **Status**: accepted
> **Date**: 2026-08-09
> **Deciders**: Avinash Kumar Singh

## Context

The originating problem statement asked engram to keep confidential personal
records isolated from company IP, keep portable technical research separate from
any employer, and support multiple clients without cross-contamination — while
still rendering one connected graph in Obsidian.

The design review examined whether engram should implement a visibility model
(per-note `audience` metadata, session "lenses", permissions) and concluded it
should not.

## Options Considered

### Option A — Visibility metadata plus session lenses
Each node declares an audience; each session declares a lens; retrieval enforces.
**Pros:** one vault, correct-by-construction defaults, cross-boundary links can
degrade to index entries rather than breaking.
**Cons:** **it is not security.** A `visibility: private` field is advisory — any
agent with a shell bypasses it with `cat`. Shipping metadata that *looks* like a
boundary but is not is worse than shipping nothing, because it manufactures false
confidence around passports and medical records.

### Option B — Separate directories inside one repo
**Pros:** looks like isolation.
**Cons:** it is not. The concept walker skips only dotdirs and a fixed ignore list;
it has no notion of a nested root, so a parent `reindex` descends into the private
subtree and writes its titles and one-sentence descriptions into a shared,
committed `index.md`. One repo means one remote, one set of collaborators, and one
`git push`.

### Option C — Separate repositories, by audience
**Pros:** real isolation, enforced by the forge and the filesystem rather than by
advisory metadata. Costs nothing to implement. Survives a company exit cleanly.
**Cons:** no graph edges across repos.

## Decision

**Option C.** Engram implements **no** visibility model, no permissions, and no
lens concept. Boundaries are a property of the environment (Tier 3, ADR-0024), and
the decision rule is:

> **One repository per distinct set of humans who may see all of it.**

Not per topic. Not per project. Per **audience**. Applied to the originating case
this produces `vault-private`, `vault-<portable-research>`, `vault-<company>`, and
one per client — four repos, growing by one per engagement.

**One root is the whole world.** Whatever directory engram is invoked in *is* the
entire scope for that invocation. Scoping is `cd`. There is no vault membership to
compute and no cross-root traversal.

**Cross-root references are out of scope.** Cited as a deliberate cut: an
index-only export bridging two vaults was designed and then dropped. Requirement
for a connected Obsidian graph applies **within** one root, where it is fully
satisfied by ADR-0022's body links.

## Consequences

- Four of the six originating requirements are retired with zero code.
- Engram runs identically in every repo — private life, company, client. It has no
  concept of which kind it is in, and that is the point.
- A private-life vault is record-shaped rather than concept-shaped (policies with
  expiry dates, superseded documents), which is served by ADR-0020's `stale_after`
  and `supersedes` rather than by anything bespoke.
- No feature request that begins "engram should let me share only part of…" is in
  scope. The answer is a second repository.
- The nested-vault blind spot in the walker is not a shipped bug — nested roots
  were never supported — but it is a trap a user will walk into. Tracked as TD-004.
