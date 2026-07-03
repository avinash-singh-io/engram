# 0008 — Write-hook as a hidden subcommand driven by PostToolUse

> **Status**: accepted
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

## Context

The vault must stay OKF-conformant and index-fresh **by construction**
(Principle 2, [ADR-0006](0006-auto-generated-indexes.md)): whenever an agent
writes a concept, it should be revalidated, the affected indexes regenerated,
and the change logged — without the human running a command. How should that
automation be delivered?

## Options Considered

### Option A — A standalone shell script the user wires up
**Pros:** transparent.
**Cons:** per-shell/per-OS fragility; another artifact to install and version;
not self-contained in the published binary.

### Option B — A git pre-commit hook
**Pros:** familiar.
**Cons:** fires at commit time, not write time (stale between saves); couples a
knowledge vault to git mechanics; momentum already owns git hooks here.

### Option C — A hidden `engram hook` subcommand driven by the agent's PostToolUse
**Pros:** self-contained in the published binary; portable across OSes; unit-testable
(it's just a function over a payload); fires exactly on Write/Edit; reuses the
Phase 0 validator and the reindex/log libs.
**Cons:** agent-specific wiring (each adapter scaffolds its own hook entry).

## Decision

**Option C.** `engram init` scaffolds a Claude Code PostToolUse hook
(`Write|Edit|MultiEdit → engram hook`). The hidden `engram hook` command reads
the tool payload on stdin, and for each written concept: revalidates with
`validateConcept`, regenerates the affected indexes, and appends an `Updated`
entry to `log.md`. It is **fail-loud**: on a validation error it writes the
errors to stderr and exits non-zero so the agent sees the feedback. Non-concept,
reserved, inbox, and non-vault writes are silent no-ops.

## Consequences

- Conformance + index freshness are enforced at write time with no human step.
- The mechanism is agent-specific; other agents (Phase 4) scaffold their own hook
  entry via their adapter, reusing the same `engram hook` command.
- A PostToolUse hook cannot *undo* a write, so "fail-loud" surfaces errors rather
  than truly blocking; the agent is expected to fix and rewrite.
- Payload-shape drift is a risk — mitigated by a tolerant parser and a payload
  fixture test.
