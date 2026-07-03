# Project Charter

> **Project**: Engram
> **Created**: 2026-07-03

## Problem Statement

As a technical individual works with AI agents, durable knowledge (system-design
notes, runbooks, interview prep, learnings, decisions) accumulates in scattered
chats, docs, and repos. Two failures follow:

1. **It's siloed and re-derived.** Agents re-explain the same concepts every
   session; nothing compounds.
2. **It doesn't scale to retrieval.** Once the base is large, an agent that reads
   all of it hits *context rot* and the *lost-in-the-middle* problem — quality
   drops, tokens burn. There is no cheap way to find the right note.

`momentum` (Engram's sibling) solves this for **project work-in-motion** — phases,
decisions, history tied to a repo. It deliberately does *not* solve it for
**durable, cross-project, evergreen knowledge**: different lifecycle, different
scope. That gap is Engram. **momentum is motion; Engram is memory.**

## Solution

A distributable npm CLI (like momentum) that turns a folder of markdown into a
**living, agent-navigable knowledge base** conformant with Google's **Open
Knowledge Format (OKF v0.1)**. It:

- **Scaffolds** an OKF-conformant vault from one command (`engram init`).
- **Auto-maintains** navigation indexes and enforces authoring conventions via
  hooks, so the map never goes stale.
- Is **dual-authored** — agents write it via commands (`/capture`, `/refine`,
  `/link`); humans edit the same files in Obsidian. No build step, no divergence.
- Enables **progressive-disclosure retrieval** (`/recall`) so an agent finds
  knowledge by *navigating* (index → descend → open), never by loading the whole
  vault.
- Is **free to run** across MacBook + Android (git spine + cloud-drive leg).

Engram is a **sibling** of momentum, not a feature of it: it **reuses momentum's
engine** (init/scaffold, multi-agent adapters, rules + hooks) but **swaps the
primitives** — a **Concept** (evergreen, never ships) replaces a **Phase**
(terminal, ships). See [ADR-0001](../decisions/0001-separate-product-shared-engine.md).

## Stakeholders

| Role | Name / Team | Responsibility |
|------|-------------|----------------|
| Owner | Avinash Kumar Singh | Final decisions, product direction |
| Users | Technical individual (backend / AI-infra engineer) running AI agents | Primary audience — grows durable personal + professional knowledge with agents |

## Scope

### In

- OKF-conformant vault scaffold + auto-maintenance (indexes, frontmatter, log).
- Multi-agent adapters (Claude Code first) reusing momentum's adapter system.
- Progressive-disclosure retrieval — structural navigation in v1.
- Free Mac + Android sync **recipes** (git spine + cloud-drive leg).
- Promotion bridge: momentum ADR/learning → Engram OKF concept.

### Out

- **N1** — No phase/release/version-bump/PR-per-note lifecycle. Concepts are
  evergreen; they never "ship." (Hard line vs momentum.)
- **N2** — No hosted service, no account, no proprietary store. Files-on-disk only.
- **N3** — No mandatory embeddings/RAG in v1. Semantic search is an optional
  later layer, not the default.
- **N4** — Not a note-taking *UI* — Obsidian is the reader/editor. Engram is the
  format + engine + agent layer beneath it.

## Goals

| ID | Goal |
|----|------|
| G1 | Scaffold and maintain an OKF-conformant vault from one command. |
| G2 | Dual authorship — agents write via commands; humans edit in Obsidian; same files. |
| G3 | Progressive-disclosure retrieval — navigate, never load the whole base. |
| G4 | Multi-agent adapters (Claude Code first) reusing momentum's architecture. |
| G5 | Free to run across MacBook + Android (git + cloud-drive), no paid sync. |
| G6 | Promotion bridge from momentum for knowledge that outgrows a project. |

## Success

See [`success-criteria.md`](./success-criteria.md) for measurable targets.
The one-sentence bar: *from an empty directory, one command yields a vault where
an agent can add a linked, indexed, OKF-valid concept and Obsidian opens it
cleanly — with retrieval that stays bounded as the vault grows.*
