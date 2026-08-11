# 0038 — Intelligence is deferred to post-v1.0, as an indivisible system

> **Status**: accepted
> **Date**: 2026-08-10
> **Deciders**: Avinash Kumar Singh
> **Defers**: [ADR-0035](0035-user-memory-second-store.md),
> [ADR-0036](0036-intelligence-loop.md) — both remain `accepted`; only scheduling changes.

## Context

[ADR-0036](0036-intelligence-loop.md) defines the intelligence loop as five steps —
observe → distill → confirm → act → decay — and states plainly:

> The intelligence layer is downstream of usage by **dependency**, not by priority.
> There is no usage yet; there is nothing to learn from.

Despite that, Phases 12–13 sat in the numbered roadmap as if scheduled, and Phase 7
was framed as **dual-purpose**: its Gate 1 instrumentation would also be ADR-0035's
observation substrate, so "one build serves two purposes".

That framing invites building **OBSERVE alone**, ahead of the rest of the loop, on
the reasoning that a log is cheap and evidence cannot be backfilled. The reasoning
is superficially strong: architectural decisions can be remade later at the same
cost, but a year of unlogged usage is gone.

It is nonetheless wrong, for a reason worth writing down.

## Options Considered

### Option A — Build OBSERVE now, defer the rest
A minimal append-only log accumulates during the parked period.
**Pros:** evidence is the one irreversible input; ~100 lines is cheap insurance.
**Cons:** **you do not know what to record until you know what you will infer.**
Logging ahead of the inference means logging a shape chosen by guesswork, and a year
of ill-fitted data is worse than none — it *looks* like evidence, so it gets built
on. It is also product code written for a parked phase, maintained and migrated
through the entire v1.0 line for a consumer that does not exist.

### Option B — Build the whole loop now
Take Phases 12–13 in sequence with the rest.
**Pros:** the design is complete and coherent.
**Cons:** contradicts ADR-0036's own dependency argument. There is no usage to
distill, so CONFIRM and DECAY cannot be exercised, and the evaluator required by
Rule 11 cannot be built against traffic that does not exist.

### Option C — Defer the loop as a unit, post-v1.0
**Pros:** the loop is designed and built when there is something to learn from, as
one coherent piece of work; the base product ships first.
**Cons:** whatever historical signal exists during the parked period is whatever
third-party agents happen to retain.

## Decision

**Option C.** Intelligence is deferred to post-v1.0 **as a whole system** —
observation included. Phases 12 and 13 move to a parked section of the roadmap and
reopen only once v1.0 has real usage.

**v1.0 is the base product**: Phase 8 (Core) → Phase 9 (Structure, views, health) →
Phase 10 (Agent surface) → Phase 11 (Retrieval) → Phase 14 (Obsidian surface).
Phase numbers are unchanged; renumbering to close a cosmetic gap would invalidate
references across ADRs, backlog rows, and history entries.

**ADR-0035 and ADR-0036 remain `accepted`.** They are still the right decisions
whenever the work is taken up. Nothing about the design is retracted.

## Consequences

- **Zero debt is created.** ADR-0036 requires *no new fields* — `generated`,
  `verified`, `stale_after`, and `sources` already carry all four loop states, and
  an observation is a Node. So nothing in Phases 8–11 exists to serve intelligence,
  and deferring it changes not one line of the core.

  *That a Tier-2 concern can be parked without touching Tier 1 is the second
  confirmation that [ADR-0024](0024-three-tier-dependency-inversion.md)'s tiering is
  real rather than decorative — the first was ADR-0035 needing no new primitives.*

- **Phase 7 loses its dual purpose and shrinks accordingly.** With no substrate to
  build, Gate 1 is measured retrospectively from stored transcripts
  ([ADR-0037](0037-gate1-measurement-protocol.md)) and the phase writes no product
  code at all.

- **The historical record during the park is whatever agents retain.** Stored agent
  transcripts are the de-facto log — one vendor's format, one agent, unknown
  retention. This is accepted, not mitigated. If those transcripts disappear, the
  loop starts from the usage that follows v1.0, which is the usage that matters.

- **FEAT-008** (event-log compaction) parks with Phase 12 and its urgency drops to
  zero — no log accumulates, so nothing needs compacting. **FEAT-005**'s
  `contradicts` parks with Phase 13; it still requires code behind it before it can
  become a closed relation type ([ADR-0022](0022-relations-in-frontmatter.md)).

- The roadmap becomes honest. Phases 12–13 stop appearing scheduled when the ADR
  defining them says they cannot be.
