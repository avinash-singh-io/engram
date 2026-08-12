# 0041 — The MCP surface amends the trust boundary

> **Status**: accepted
> **Date**: 2026-08-12
> **Deciders**: Avinash Kumar Singh
> **Amends**: [ADR-0034](0034-encryption-is-a-substrate-concern.md) §"What leaves the
> machine", as that ADR itself requires.

## Context

[ADR-0034](0034-encryption-is-a-substrate-concern.md) ends with an instruction, not a
suggestion:

> If engram ever gains a network call — telemetry, a hosted index, a sync service —
> **this section must be revisited first.**

Phase 15 ships an MCP server over **stdio and HTTP**. This ADR is that revisit, and
it lands before any HTTP code exists. The ordering is the substance: an amendment
written afterwards documents whatever got built, while one written first forces the
constraints to be chosen before there is code shaped around their absence.

**What actually changes.** Engram's security posture has been *structural* rather
than enforced:

> There is nothing to attack, because nothing listens, nothing authenticates, and
> nothing leaves the machine.

That property is free and unbreakable, and it is the strongest thing ADR-0034 says.
A **stdio** transport preserves it exactly — the client spawns engram as a
subprocess and speaks over pipes; there is no socket, no port, and nothing
reachable. An **HTTP** transport does not. It opens a listening socket, and from
that moment engram has an attack surface that must be reasoned about rather than
dismissed.

The specific danger is not abstract. [ADR-0030](0030-boundaries-are-repos.md)'s
answer to keeping private records isolated is that they live in a **separate
repository the working agent has no reason to be in**. A server started in the wrong
directory reaches straight past that, and does so silently.

## Options Considered

### Option A — stdio only
**Pros:** ADR-0034 stands untouched; no socket, no port, no amendment needed. Covers
the default connection method of every major MCP client.
**Cons:** clients that only speak HTTP cannot connect.

### Option B — stdio now, HTTP behind a later flag
**Pros:** defers the decision.
**Cons:** defers it to a moment when the surrounding code assumes no server exists,
which is when constraints are hardest to add and easiest to skip.

### Option C — stdio and HTTP together, with the boundary amended first
**Pros:** widest client reach; the constraints are decided while the code is being
shaped rather than retrofitted.
**Cons:** engram gains a listening socket, permanently. The structural guarantee
becomes a configured one.

## Decision

**Option C**, with three constraints that are **acceptance criteria, not defaults**.

### 1. HTTP is opt-in and never implicit

`engram mcp` starts **stdio**. HTTP requires an explicit flag. There is no
configuration file setting, no environment variable, and no "remember my choice"
that could turn it on without someone typing it.

### 2. It binds `127.0.0.1`

Loopback only unless a host is deliberately supplied. Binding `0.0.0.0` must be an
act, never an accident.

### 3. It warns at startup, naming the exact root being exposed

```
⚠  MCP HTTP server on 127.0.0.1:<port>
   EXPOSING: /Users/.../vault-private
   Anything with local access can read and write this vault. No authentication.
```

ADR-0030's boundary is only as good as knowing which side of it you are on. The
warning is what makes a server started in the wrong directory visible rather than
silent.

### What this does NOT solve

**There is no authentication.** Any local process can connect. Localhost-bound and
opt-in is the entire control, and it is stated here so it is a known limit rather
than an oversight discovered later. If that ceases to be enough, it is an amendment
to *this* ADR — not a flag someone adds.

**Engram still initiates nothing.** No outbound call, no telemetry, no account, no
hosted index. The amendment covers a socket engram *listens on*, not one it dials.
ADR-0034's core claim — engram never transmits — survives intact.

## Consequences

- The line in ADR-0034 §8 that "Engram has none" of third-party servers now needs
  reading alongside this: engram can *be* a local server, though it still talks to none.
- The threat model gains a local adversary, which it did not have. For a
  single-user local tool that is a modest change; for a shared machine it is not,
  and the warning is the only thing that surfaces it.
- **The agent remains the more consequential egress path.** ADR-0034 named it, and
  it is unchanged: an agent reading the vault sends content to a model provider
  regardless of transport. The HTTP surface adds a second path; it does not replace
  the first, and the first is still the larger one.
- Reverting is cheap. Removing the HTTP transport restores the structural property
  in full, because nothing else depends on there being a socket.
