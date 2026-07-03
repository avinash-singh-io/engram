# 0017 — Agent contract files carry the full contract (not a pointer)

> **Status**: accepted · **Amends**: [ADR-0011](0011-adapters-converge-on-agents-md.md)
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

## Context

[ADR-0011](0011-adapters-converge-on-agents-md.md) said all agents converge on
the OKF-mandated root `AGENTS.md`. Phase 6 implemented the Claude adapter's
`CLAUDE.md` as a thin **pointer** ("read AGENTS.md"). That is unreliable:

- Each agent loads only its **own** native instructions file — Claude Code reads
  `CLAUDE.md`; Codex and other agents read `AGENTS.md`.
- An agent that loads `CLAUDE.md` does **not** reliably go and read a *referenced*
  `AGENTS.md`. So a pointer means the agent never actually gets the contract.

The contract must therefore live **in full** in each agent's native file.

## Options Considered

### Option A — Pointer (`CLAUDE.md` → "see AGENTS.md")  *(rejected — was the Phase 6 bug)*
**Cons:** agents don't follow cross-file references reliably; Claude Code gets no contract.

### Option B — Hand-maintain the contract in each file
**Cons:** duplication drifts — the exact problem ADR-0011 wanted to avoid.

### Option C — One source, rendered in full into each agent's native file
**Pros:** each agent's file is self-contained (agents load only their own);
no manual duplication — the tool generates all of them from one template, so
they stay in sync.
**Cons:** the same content exists in two files on disk (intended — that's what
lets each agent read its own file).

## Decision

**Option C.** Each adapter declares a `contractFile` (Claude → `CLAUDE.md`;
Codex / Antigravity → `AGENTS.md`). `engram init` renders the **full** traversal
contract (one source asset) into every distinct contract file — so `AGENTS.md`
and `CLAUDE.md` are byte-identical complete contracts, not a file and a pointer.
A new agent that reads a different file is one descriptor (`contractFile: '…'`);
the tool renders the contract into it.

This **amends ADR-0011**: the single-source, descriptor-per-agent principle
stands, but the output is *rendered in full per agent*, never referenced across
files.

## Consequences

- Claude Code (and any agent) loads a self-contained contract from its own file.
- One template → many generated files; no manual duplication or drift.
- Regenerating (re-`init`) keeps them in sync from the single source.
