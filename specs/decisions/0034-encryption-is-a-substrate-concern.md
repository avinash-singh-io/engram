# 0034 — Encryption is a substrate concern; the agent is the egress path

> **Status**: accepted
> **Date**: 2026-08-10
> **Deciders**: Avinash Kumar Singh
> **Relates to**: [ADR-0030](0030-boundaries-are-repos.md)

## Context

A vault holds notes that range from public drafts to health records. The natural
question is whether engram should encrypt them, and whether it should offer
end-to-end encryption the way sync products do.

**How the comparable system works.** An Obsidian vault is a plain local folder;
files are **plaintext on disk, always**. Obsidian Sync (paid) adds end-to-end
encryption *in transit and on their servers* — the local copy stays plaintext.
Community plugins can encrypt individual notes, at the cost of removing them from
search, graph, and indexing.

That cost generalises, and it is decisive:

> **An encrypted note is a note engram cannot help with.** It is opaque to
> retrieval, to relation extraction, to validity filtering, and to views.
> Encrypting a note is functionally deleting it from the system.

## Options Considered

### Option A — Engram encrypts notes at rest
**Pros:** a checkbox users ask for.
**Cons:** every encrypted note leaves the graph, so the feature deletes the product
for exactly the notes it covers. Adds key management — a whole product of its own —
and key loss is unrecoverable data loss on a twenty-year artifact.

### Option B — Engram offers E2E sync
**Pros:** matches Obsidian Sync.
**Cons:** requires a server, an account, and a business model. Contradicts
[ADR-0004](0004-git-source-of-truth.md) and the no-hosted-dependency principle.
Engram would become a sync company.

### Option C — Encryption is the substrate's job; engram has no network
**Pros:** the existing tools are better at this than anything engram would ship,
and the strongest privacy property is architectural rather than a feature.
**Cons:** no checkbox to point at; users must configure their own disk/remote encryption.

## Decision

**Option C.** Engram ships no encryption and no network.

| Threat | Correct answer | Owner |
|---|---|---|
| Stolen or lost device | Full-disk encryption (FileVault / LUKS / BitLocker) | OS — already on, free, actually effective |
| Remote copy at rest | Private repo; encrypted remote | forge / host |
| A few specific paths | `git-crypt` or `age`, **accepting those files leave the graph** | user, explicitly |
| Third-party servers | **Engram has none** — no account, no telemetry, no calls out | architecture |

**Engram's privacy posture is a property, not a feature: it never transmits
anything.** That is stronger than any encryption option it could ship, and it is
free to maintain because it is structural.

### The threat that actually changed

In an agent-native product the meaningful new exposure is not disk at rest:

> **The agent is a network egress path.** When an agent reads the vault, that
> content goes to a model provider. Encryption at rest is irrelevant to it.

Answers, in order of effectiveness:

1. **[ADR-0030](0030-boundaries-are-repos.md)** — the private vault is a separate
   repository, in a location the working agent has no reason to be. This is the
   real control, and it is already decided.
2. A local model for that vault, when quality permits. Out of scope now; the
   architecture permits it because engram has no opinion about which agent is used.
3. Guardrail `path-scope` limits what an engram-mediated agent touches — but per
   [ADR-0024](0024-three-tier-dependency-inversion.md) that is preventive-only and
   does not bind an agent with a shell.

## Consequences

- Requests for "encrypt my vault" have a documented answer: full-disk encryption
  plus a separate repo, not a feature.
- Engram stays installable with zero trust in its author — nothing leaves the machine.
- A user who does encrypt specific paths must accept those notes are invisible to
  retrieval. `doctor` should report them as unreadable rather than missing.
- If engram ever gains a network call — telemetry, a hosted index, a sync service —
  this ADR must be revisited first. That is the point of recording it.
