# 0033 — `format` takes content, not a path; the inbox is a buffer

> **Status**: accepted
> **Date**: 2026-08-10
> **Deciders**: Avinash Kumar Singh
> **Refines**: [ADR-0026](0026-validation-gates-promotion.md)

## Context

The v1 verb set implied a pipeline: `capture → refine → link`. The first v2
architecture sketch preserved the shape as `capture → format → promote`, which
makes **capture a prerequisite for formatting**.

It is not, and the counter-example is the primary use case. A user says to their
agent: *"here are my raw notes — format these into the vault."* The content is
already in the agent's context. There is no file. There is nothing to capture.
Under a capture-first pipeline the agent would have to write a throwaway inbox file
purely to satisfy the tool's ordering.

More broadly, content arrives from many places: stdin, a clipboard paste, a URL an
agent fetched, prose the agent itself just wrote, a file already in the tree, or an
inbox file. Only one of those six starts as a capture.

## Options Considered

### Option A — Keep the pipeline; `format` takes a path
**Pros:** one code path; everything is a file, so provenance of the raw input is
always recoverable.
**Cons:** forces a spurious write for the most common agent interaction; makes the
inbox mandatory rather than useful; couples an operation to storage for no reason.

### Option B — `format` takes content; `capture` becomes optional
**Pros:** matches how content actually arrives; the inbox becomes a convenience
rather than a toll gate; `format` is a pure function of content plus hints, which
makes it trivially testable.
**Cons:** the raw input is not always preserved, so "what did this come from" is
answerable only via `sources`.

## Decision

**Option B.**

```
content (from anywhere) → format → [write gate] → node(s) + relations
```

- **`format(content, hints)`** — content is a string or a set of strings. Hints
  carry what the user said (*"file this under the retrieval project"*, *"this
  replaces the March decision"*). It returns a **proposed change**, which then goes
  through the write gate like every other write ([ADR-0024](0024-three-tier-dependency-inversion.md)).
- **`capture(content)`** is a **durability step, not a stage.** It exists for the
  moments you cannot process now — on a phone, offline, mid-meeting, no time. If
  you can format now, you skip it entirely.
- **`inbox/` is a buffer, not a pipeline stage.** Nothing is required to pass
  through it.

**Raw-input preservation is opt-in, not structural.** When the source matters —
a fetched article, a pasted transcript — the agent records it under `sources/` and
links it via `sources:`, which is the mechanism that already exists
([ADR-0020](0020-adopt-okf-v02.md)). Preserving every scratchpad by default would
turn the vault into a paste bin.

## Consequences

- The most common interaction — *"format this for me"* — has no ceremony.
- `format` becomes a pure function over content, so it is testable without a
  filesystem, which composes with [ADR-0032](0032-internal-model-versioned-codecs.md)'s
  in-memory ports.
- [ADR-0026](0026-validation-gates-promotion.md) is unchanged in substance —
  validation still gates the durable write and never the raw capture — but its
  framing improves: the gate is on *entering the tree*, not on *leaving the inbox*.
- `promote` remains for the inbox→tree case; it is `format` with the content read
  from an inbox file, not a distinct concept.
- Losing raw input is possible when the user does not ask for it to be kept. Named
  here so it is a known trade rather than a surprise.
