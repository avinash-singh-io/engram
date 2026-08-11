# 0032 — An internal model with versioned codecs, not a format-shaped core

> **Status**: accepted
> **Date**: 2026-08-10
> **Deciders**: Avinash Kumar Singh
> **Refines**: [ADR-0020](0020-adopt-okf-v02.md), [ADR-0024](0024-three-tier-dependency-inversion.md)

## Context

The first v2 architecture sketch placed `core/okf.ts` — a single module that
parses, validates, and serializes OKF — inside Tier 1. Review found this violates
two of the principles the architecture claims to follow.

1. **Open/closed.** OKF v0.1 → v0.2 already happened
   ([ADR-0020](0020-adopt-okf-v02.md)); v0.3 will happen. A single `okf.ts` must be
   *edited* for every version, and versions must then coexist because vaults in the
   wild will be on different ones.
2. **Dependency inversion.** If the core's in-memory types mirror OKF v0.2's
   frontmatter shape, the core depends on a **detail** — someone else's YAML schema,
   governed by someone else's release cycle — rather than on the abstraction
   ([ADR-0019](0019-node-edge-primitives.md)'s Node and Edge). ADR-0024 says every
   arrow points inward; this one pointed out.

A related smell: `substrate/` was specified as one interface covering filesystem
access, environment detection, and time. That is an interface-segregation
violation — every consumer takes a dependency on capabilities it does not use, and
every test must stub all of them.

## Options Considered

### Option A — One `okf.ts`, version branches inside it
**Pros:** fewest files; everything about the format in one place.
**Cons:** edited on every spec release; version logic tangles with domain logic;
the core's types drift toward whichever version was written last.

### Option B — Version the whole core (`core-v1/`, `core-v2/`)
**Pros:** clean separation per version.
**Cons:** duplicates the domain model per format revision; the graph, identity, and
traversal logic have nothing to do with serialization and must not be forked with it.

### Option C — Internal model + codec registry (anti-corruption layer)
Engram owns its model; OKF is one *serialization* of it; translation is isolated
per version.
**Pros:** adding a version is adding a file; the core never changes; the model is
governed by ADR-0019 rather than by an external spec.
**Cons:** one more indirection; a normalization layer that must be tested per version.

## Decision

**Option C.**

```
core/
├── model.ts        Node · Edge · assertion stamps.  ENGRAM'S model. Version-free.
├── ports.ts        the narrow interfaces the core needs (see below)
└── graph.ts        identity, traversal, validity — pure, in-memory

format/             codecs. one file per spec version. ADDITIVE, never edited.
├── okf-v0_1.ts     reader + writer
├── okf-v0_2.ts     reader + writer
└── registry.ts     detect version → select codec
```

- **Read:** detect the vault's `okf_version` → dispatch to that codec → **normalize
  into `model.ts`'s types.** Nothing above the codec sees OKF-shaped data.
- **Write:** internal model → the codec pinned to the vault's declared version.
- **Adding OKF v0.3 is adding a file.** No existing code changes. That is
  open/closed satisfied rather than claimed.
- **The internal model is derived from ADR-0019**, not from any spec revision. If a
  future OKF cannot express something the model holds, that is a codec-level lossy
  warning, not a change to the core.

**The closed relation set is a registry, not a switch.** Adding `contradicts` later
means registering a handler with its validity semantics and its detective check —
not editing `gate.ts`. Open/closed applies to relations for the same reason it
applies to formats.

**Ports are narrow (interface segregation).** `substrate/` is not one interface:

| Port | Used by | Stubbed in tests as |
|---|---|---|
| `FileStore` | ops, views | an in-memory map |
| `Detector` | surface, doctor | a fixed fact set |
| `Clock` | model stamps, staleness | a fixed instant |

`core/` names these interfaces; `substrate/` implements them; **`core/` imports
nothing from `substrate/`.**

## Consequences

- The core is exercisable entirely in memory. No temp directories, no fixtures on
  disk, no clock flakiness.
- Multiple OKF versions coexist. A vault declares its version; engram reads older
  ones and can offer an explicit upgrade, never a silent rewrite.
- Migrating a vault between versions becomes a codec-to-codec transform through the
  internal model — one well-defined operation rather than a rewrite.
- One more layer to keep honest: if a codec ever leaks format-shaped types upward,
  the whole benefit is lost. Enforce with a lint rule on imports, not with discipline.
- Retroactively strengthens [ADR-0020](0020-adopt-okf-v02.md): adopting an external
  spec is safe precisely *because* it sits behind a codec.
