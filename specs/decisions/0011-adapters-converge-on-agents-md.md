# 0011 — Multi-agent adapters converge on AGENTS.md; a new agent is a descriptor

> **Status**: accepted
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

## Context

Phase 1 shipped one adapter (Claude Code) over a file-based seam
(`Adapter.files(assetsRoot): AdapterFile[]`). Phase 4 adds Codex and Antigravity.
The risk is per-agent forking: if each adapter carries its own copy of every
command's instruction text, the command semantics drift across agents and adding
an agent means re-authoring the whole surface.

Codex and Antigravity both consume the OKF-mandated root `AGENTS.md` natively,
which already carries the vault traversal contract and is emitted once by
`engram init` (agent-agnostic).

## Options Considered

### Option A — Per-agent asset trees (one copy of each command per agent)

**Pros:** dead simple; each adapter is self-contained.
**Cons:** command semantics triplicate and drift; a new agent is a fork of the
whole surface; the shared `AGENTS.md` contract is duplicated per agent.

### Option B — One shared command-definition set, thin per-agent wrapper

**Pros:** command semantics live once in `COMMAND_DEFINITIONS`; each adapter only
maps a definition to its file convention (Claude slash-command, Codex prompt,
Antigravity command); a new agent is a descriptor + one registry entry. The root
`AGENTS.md` stays the single shared traversal contract.
**Cons:** adapters can no longer diverge command *content* per agent (acceptable —
per-agent divergence is the anti-goal).

## Decision

**Adopt Option B.** Reuse the shipped `Adapter.files(assetsRoot)` seam unchanged,
extended with an inline `content?` field on `AdapterFile` so an adapter can render
a command surface in-code from the shared `COMMAND_DEFINITIONS` set instead of
copying asset files. Codex emits `.codex/prompts/<name>.md`; Antigravity emits
`.antigravity/commands/<name>.md`; Claude emits `.claude/commands/<name>.md`
(plus its PostToolUse hook). The root `AGENTS.md` remains the single shared
agent-guidance source, emitted once by `engram init`.

## Consequences

- Adding an agent = a descriptor module + one `ADAPTERS` registry entry; no new
  command copies. `engram init --agent <id>|all` routes through the registry.
- Command semantics are locked once and rendered per agent; golden fixtures under
  `tests/fixtures/adapters/` (v1) pin each agent's output.
- The former per-agent Claude command assets (`assets/claude/commands/*.md`) are
  removed — their content now lives in `COMMAND_DEFINITIONS`.
- Codex/Antigravity config conventions are young; keeping each surface a thin
  descriptor centralizes the churn if a convention shifts.
