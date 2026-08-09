# 0039 — TypeScript is the language and runtime for v2

> **Status**: accepted
> **Date**: 2026-08-10
> **Deciders**: Avinash Kumar Singh
> **Extends**: [ADR-0007](0007-typescript-single-package.md) — which chose TypeScript
> for the v1 **MVP**. v2 is a clean-room rewrite, so the choice is re-decided here
> rather than inherited.

## Context

[ADR-0007](0007-typescript-single-package.md) reasoned about a single-package MVP.
Since then the roadmap has grown a plugin surface, an MCP server, an intelligence
layer, and a set of post-v2 ambitions that were not in view: engram's own agent,
engram's own UI, consuming third-party plugin ecosystems, and — raised but **not
accepted** — sync with end-to-end encryption.

A language is among the hardest decisions to reverse, so re-deciding it for v2 is
worth an ADR even when the answer does not change.

The relevant fact about the workload is that **nothing in it punishes a managed
runtime.** Per [ADR-0024](0024-three-tier-dependency-inversion.md) the core is pure
and I/O-free; a vault is thousands of small markdown files, not millions of rows.
There is no hot loop, no concurrency requirement, and no memory pressure. The usual
reasons to reach for a systems language do not arise.

## Options Considered

### Option A — TypeScript / Node
**Pros:** Obsidian's plugin API *is* TypeScript, so Phase 14 is native rather than
bridged; `npx engram` is a zero-install trial; the MCP and agent SDKs are
first-class; one codebase for core, CLI, MCP, plugin, and any future UI.
**Cons:** ~80ms cold start on the per-write hook path
([ADR-0008](0008-write-hook-mechanism.md)); requires Node present; no single static
binary; weakest of the candidates for *local* model inference.

### Option B — Rust
**Pros:** single static binary, ~1–5ms startup, strongest crypto story, good local
inference via `candle`.
**Cons:** cannot host a JavaScript plugin ecosystem; Obsidian would need a separate
TS codebase or a WASM bridge; thinner MCP/agent SDKs; slowest to write, which
matters most for a solo project. Note that Tauri — the usual Rust answer for a
desktop UI — still has a **TypeScript frontend**, so it does not avoid TS.

### Option C — Go
**Pros:** static binary, fast startup, quick to write.
**Cons:** same plugin-ecosystem problem as Rust, with fewer compensating strengths.

### Option D — Python
**Pros:** best agent and local-ML ecosystem.
**Cons:** poor CLI distribution, slow startup, and no path to a plugin surface.

### Option E — Hybrid: Rust core, TypeScript shell
**Pros:** theoretically the best split.
**Cons:** two codebases and a bridge, for a project with zero users and one
developer — which is precisely the trade ADR-0007 declined.

## Decision

**Option A — TypeScript**, for v2 and the surfaces above it.

The decisive argument is not fit on any single axis; it is that TypeScript is the
only option that **does not lose badly on any axis**, and the only one that keeps
a JavaScript plugin ecosystem reachable:

> You cannot consume a JavaScript plugin ecosystem from a process that cannot run
> JavaScript.

Under genuine uncertainty about how far the product goes, the correct thing to
optimise is **optionality, not fit**. A language that would have to be abandoned to
reach half the plausible futures is the opposite of optionality.

**The architecture already contains this decision.** Because the core is pure and
sits behind narrow ports ([ADR-0032](0032-internal-model-versioned-codecs.md)), any
component that genuinely needs another language — local inference being the obvious
candidate — arrives as a Tier-3 subprocess or native addon behind an interface, not
as a rewrite. This ADR therefore binds the core, CLI, agent loop, and surfaces; it
does not bind every future component.

## Consequences

- Phase 14's Obsidian plugin is a first-class target rather than a bridged one.
- Distribution stays npm-based; `npx engram` remains the trial path.
- The per-write hook path carries Node's startup cost. This is accepted, and is one
  of the two triggers below.
- Local-model work ([FEAT-007](../backlog/backlog.md)) is *not* prejudged. It lands
  behind a port whenever it lands, in whatever language suits it.
- Throwaway instrument code (e.g. `tools/`) may sit outside the TypeScript build
  when it is explicitly disposable — but that is a scaffolding convenience and must
  be stated, never a silent default.

### Triggers that reopen this decision

Both are measurable rather than speculative, and neither is knowable yet:

1. **Write-hook latency is felt in real use** — Node's cold start becomes a
   noticeable cost on the ADR-0008 path.
2. **"Requires Node" shows up as an actual adoption blocker**, or native mobile
   becomes a first-class surface rather than the sync leg
   ([ADR-0004](0004-git-source-of-truth.md)) describes.

Local-first inference becoming a **core** requirement rather than an eventual one
would also reopen it — though per the port argument above, it more likely would not
need to.
