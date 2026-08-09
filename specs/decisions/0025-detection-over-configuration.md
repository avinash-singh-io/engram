# 0025 — Detection over configuration

> **Status**: accepted
> **Date**: 2026-08-09
> **Deciders**: Avinash Kumar Singh

## Context

Engram runs against many environments — git or not, Obsidian or not, cloud-synced
or not. The instinctive response is a config file: let the user declare their
setup. The design review rejected this, for reasons worth recording because the
instinct will recur.

## Options Considered

### Option A — Configuration flags
**Pros:** appears to support everything; user is in control.
**Cons:** three fatal ones.
1. **Config cannot grant a capability.** `storage: drive` does not remove the need
   for engram to work without git history — it only announces the absence. The core
   must be designed for the floor anyway, so the flag buys nothing.
2. **It contradicts "whatever directory you open is the world."** A tool that must
   be configured does not just work in whatever directory you open it in.
3. **It forks the agent's contract.** Six combinations of two flags is six
   different behaviors an agent must reason about, in every session, forever. That
   is a direct tax on the founding premise that an agent is a first-class writer.

### Option B — Detect facts; decide the rest once
**Pros:** zero configuration; one behavior an agent can depend on; the filesystem
is already the source of truth.
**Cons:** less apparent user control; detection can be wrong in exotic setups.

## Decision

**Option B**, governed by one test:

> **Is there a fact of the matter?**
> **Yes** → detect it. Never ask.
> **No, it is genuine taste with no wrong answer** → configure it.
> **No, it is a decision being avoided** → decide it. Once. For everyone.

Almost everything reachable is category one and costs a single syscall:

| Question | Answer |
|---|---|
| Is this a git repo? | `existsSync('.git')` |
| Is Obsidian in use? | `existsSync('.obsidian')` |
| Is this cloud-synced? | Irrelevant — the core is designed for no-history anyway |

Detected facts unlock **optional enrichment only**. They never gate correctness,
because the core already works without them (ADR-0024).

The legitimate residue of real configuration is small and boring: whether `refine`
moves or copies its source, the default type vocabulary, which agent contract to
emit, and **link format** — the one genuine case, since detection reveals that
Obsidian is installed but not which link style the user wants.

## Consequences

- No `engram init` ceremony is required for detection to work; a directory can be
  operated on immediately.
- A config file cannot drift out of sync with reality and then lie — a real failure
  mode on a twenty-year horizon.
- The agent contract (`AGENTS.md`) describes exactly one behavior.
- Exotic setups that detection gets wrong need an explicit override; those are
  bugs to fix in detection, not reasons to add flags.
