# Engram

> **An OKF-native knowledge base that agents and humans read and write together.**
> Durable, cross-project memory for your work — designed so an LLM can find the
> right knowledge by *navigating* it, without ingesting the whole vault.
>
> Sibling to [`momentum`](https://trymomentum.github.io): **momentum is motion, Engram is memory.**

*(Named for the neuroscience term **engram** — a stored memory trace.)*

[![npm](https://img.shields.io/npm/v/@avinash-singh-io/engram?logo=npm)](https://www.npmjs.com/package/@avinash-singh-io/engram)
&nbsp;[![node](https://img.shields.io/node/v/@avinash-singh-io/engram)](https://nodejs.org)
&nbsp;[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## What is it?

Engram is a small command-line tool that turns a folder of Markdown into a
**living, agent-navigable knowledge base** conformant with Google's
[Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog).

- **Agents write it** (via commands like `capture` / `refine` / `link`) and
  **humans edit it** in [Obsidian](https://obsidian.md) — the *same* Markdown
  files, no build step, no divergence.
- **Retrieval is progressive-disclosure**: `recall` answers by descending
  `index → tags → link → file`, reading only what a task needs. Loading the whole
  vault is prohibited by design — it stays fast as the vault grows.
- **Conformance is enforced**: every concept has required frontmatter, indexes
  are auto-generated, and a write-hook keeps the vault valid, indexed, and logged
  on every save.
- **Free and yours**: plain files, git-first, no account, no hosted dependency.

### Why

Durable knowledge (design notes, runbooks, learnings, decisions) piles up in
scattered chats and docs. Agents re-derive the same concepts every session, and
once the pile is large, an agent that reads all of it hits *context rot*. Engram
makes knowledge a shared library that **compounds** — and that an agent can
search cheaply by navigating structure instead of stuffing everything into
context.

---

## Install

Published as **[`@avinash-singh-io/engram`](https://www.npmjs.com/package/@avinash-singh-io/engram)**
(the bare name `engram` was taken). The scoped name is just the package — **the
CLI command is `engram`**. Requires **Node.js ≥ 20**.

```bash
npm install -g @avinash-singh-io/engram
engram --version   # 0.5.1
engram --help
```

Or run it without installing:

```bash
npx @avinash-singh-io/engram --help
```

<details>
<summary><b>Build from source</b> (for contributing)</summary>

```bash
git clone https://github.com/avinash-singh-io/engram.git
cd engram
npm install
npm run build
npm link          # puts `engram` on your PATH
```
</details>

---

## Quick start

```bash
# 1. Scaffold a vault (creates OKF root files, inbox/, .engram/, Claude Code adapter)
engram init my-vault && cd my-vault

# 2. Capture a raw thought — lands in inbox/
engram capture "Temporal makes workflows durable via deterministic replay"

# 3. File it as a proper, validated concept
engram refine inbox/*.md \
  --type Reference \
  --title "Temporal Internals" \
  --description "How determinism and replay make workflows durable." \
  --tags temporal,distributed-systems \
  --to system-design/temporal.md

# 4. Ask for it back — reads only the files it needs
engram recall "durable workflow execution"

# 5. Health-check the vault any time
engram doctor
```

`refine` validates OKF conformance and **refuses to write a non-conformant
concept**; indexes and `log.md` update automatically.

---

## Commands

| Command | What it does |
|---|---|
| [`init`](#engram-init-dir) | Scaffold an OKF-conformant vault |
| [`capture`](#engram-capture-text) | Drop a raw note into `inbox/` |
| [`refine`](#engram-refine-inbox) | Turn an inbox item into a filed, validated concept |
| [`link`](#engram-link-concept) | Suggest + insert cross-links between concepts |
| [`reindex`](#engram-reindex) | Regenerate `index.md` files from frontmatter |
| [`recall`](#engram-recall-query) | Navigate the vault, return the minimal relevant concepts |
| [`promote`](#engram-promote-source) | Import a momentum ADR/learning as an OKF concept |
| [`doctor`](#engram-doctor-dir) | Validate every concept + check sync health (read-only) |

### `engram init [dir]`
Scaffold a vault in `[dir]` (default: current directory). Non-destructive — it
never overwrites your files, and deep-merges an existing `.claude/settings.json`.

```
--force         overwrite existing managed files
--agent <id>    adapter to scaffold: claude | codex | antigravity | all   (default: claude)
```
Creates: `index.md`, `AGENTS.md`, `log.md`, `inbox/`, `.engram/` (config +
templates), the agent adapter's slash-commands + write-hook, and an Obsidian
setup guide.

### `engram capture [text]`
Write a raw note into `inbox/` for later refinement. Reads from stdin if `text`
is omitted: `echo "a thought" | engram capture`.

### `engram refine <inbox>`
Turn an inbox item into a filed, frontmatter-complete concept. Validated before
writing; the inbox item is archived non-destructively; indexes + log update.

```
--to <path>           destination, e.g. system-design/x.md   (required)
--title <title>       concept title                          (required)
--description <text>  one-sentence description                (required)
--type <type>         OKF type                               (default: Concept)
--tags <csv>          comma-separated tags
--force               overwrite an existing destination
```

### `engram link <concept>`
Suggest or insert cross-links (tag-overlap based — no embeddings).

```
--suggest         list related concepts by shared tags
--to <concept>    insert an absolute markdown link to <concept> under "See also"
```

### `engram reindex`
Regenerate every directory's `index.md` from concept frontmatter. Deterministic
and idempotent.

```
--check    report drift without writing (exit 1 if any index is stale)
```

### `engram recall [query]`
Progressive-disclosure retrieval — returns a **minimal ranked set of references**
(path + title + description + why-matched), not full bodies, while reading only a
bounded fraction of the vault.

```
--tag <tags...>   require at least one of these tags
--type <type>     require this concept type
--max <n>         max references to return                  (default: 5)
--hops <n>        one-hop link expansion from the top hit    (default: 0)
--sections        extract matched headings (reads bodies, bounded)
--json            machine-readable output incl. the read-cost report
--explain         show scores, match trail, and read tiers
--vault <path>    vault root (default: discover from cwd)
--check-index     verify indexes are navigation-grade, then exit
--emit-contract   (re)write the AGENTS.md traversal contract, then exit
```

### `engram promote <source>`
Import a momentum ADR or learning entry (read by file path only — no momentum
dependency) as a one-way OKF `Reference` concept with a `# Source` provenance
block. Validated before writing.

```
--to <dir>            target directory                 (default: references)
--type <type>         OKF type                         (default: Reference)
--description <text>  override the derived description
--tags <csv>          extra tags
--dry-run             render + validate + print the plan; write nothing
--force               overwrite an existing destination
```

### `engram doctor [dir]`
Read-only health check: validates every concept (OKF), checks index freshness,
and flags sync hazards (VCS conflict markers, CRLF/BOM, case-fold collisions,
missing git spine). Exits non-zero on errors.

```
--json    emit the full report as JSON
```

---

## How it works

A vault is just Markdown + auto-maintained navigation:

```
my-vault/
├── index.md          # root map (progressive-disclosure entry) — tool-generated
├── AGENTS.md         # how an agent should traverse THIS vault
├── log.md            # append-only change log (newest first)
├── inbox/            # raw captures awaiting `refine`
├── .engram/          # tooling sidecar (config, templates, archive) — not knowledge
└── system-design/
    ├── index.md      # subdirectory map — tool-generated
    └── temporal.md   # a concept
```

**A concept** is one file = one idea, with required OKF frontmatter:

```markdown
---
type: Reference
title: Temporal Internals
description: How determinism and replay make workflows durable.
tags: [temporal, distributed-systems]
timestamp: 2026-07-03T00:00:00Z
---

# Model
Workflows are deterministic functions replayed against an event history.

# See also
- [Idempotency Patterns](/system-design/idempotency-patterns.md)
```

- **Indexes are tool-owned** — never hand-edit `index.md`; run `reindex`. They're
  deterministic and idempotent, so they never drift.
- **The write-hook** (a Claude Code PostToolUse hook `init` scaffolds) revalidates
  a concept on every save, reindexes the affected directories, and appends to
  `log.md` — conformance and freshness by construction.
- **Links** are standard, absolute (`/dir/file.md`) — OKF-conformant and readable
  by agents, `grep`, and GitHub alike. A link to a not-yet-written concept is
  valid, not an error.

---

## Agents & editors

- **Coding agents** — `init --agent claude|codex|antigravity|all` scaffolds that
  agent's slash-commands + the write-hook. A new agent is a thin descriptor, so
  adding one is cheap.
- **Obsidian** — humans edit the same files. One-time setup (wikilinks off,
  absolute links, Properties): see [`docs/obsidian-setup.md`](docs/obsidian-setup.md).
- **Multi-device sync** — git is the source of truth; phone is a read-mostly leg.
  Free recipes (Obsidian Git, Remotely Save → S3) in [`docs/sync/`](docs/sync/).

---

## Development

```bash
npm run build        # bundle to dist/ (tsup, ESM + types)
npm test             # vitest
npm run check        # typecheck + lint + format:check + test + build (CI gate)
```

Layout: `src/` (source) · `tests/` (+ `tests/benchmarks/` locked evaluators) ·
`docs/` (guides) · `specs/` (specs, decisions/ADRs, phase history).

---

## Status

**v0.5.0** — Phases 0–4 shipped: the format core, the vault + write-hook,
progressive-disclosure `recall`, the ecosystem adapters + `promote`, and the sync
recipes + `doctor`. Phase 5 (an optional semantic/embeddings layer) is deferred.

- Current state: [`specs/status.md`](specs/status.md)
- Roadmap: [`specs/planning/roadmap.md`](specs/planning/roadmap.md)
- Design decisions (ADRs): [`specs/decisions/`](specs/decisions/)

## License

MIT
