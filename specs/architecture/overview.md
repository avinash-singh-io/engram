# Engram — Architecture Overview

> Light architecture reference for a **standard (single-package) repo**. This is
> a starting map, not a constitution — decisions live in `specs/decisions/`.
> (`ecosystem.md` in this directory is momentum's own shipped reference, not
> Engram's.)

## Shape

Engram is a **TypeScript/Node npm CLI** (`bin: engram`) that vendors momentum's
engine pattern ([ADR-0007](../decisions/0007-typescript-single-package.md)). It
operates on a **local folder** (the vault) and is otherwise sync-agnostic.

```
┌─────────────────────────────────────────────────────────────┐
│  Agents (Claude Code, later Codex/Antigravity)   Humans      │
│   via slash commands / CLI                        via Obsidian│
└───────────────┬───────────────────────────────┬─────────────┘
                │  same OKF files, no build step │
        ┌───────▼───────────────────────────────▼───────┐
        │              Engram engine (npm CLI)           │
        │  ┌──────────┐ ┌───────────┐ ┌───────────────┐  │
        │  │ Format   │ │ Index gen │ │ Retrieval     │  │
        │  │ core     │ │ (reindex) │ │ (recall,      │  │
        │  │ (parse/  │ │           │ │  navigate)    │  │
        │  │ validate)│ │           │ │               │  │
        │  └──────────┘ └───────────┘ └───────────────┘  │
        │  Adapters (Claude Code first)  ·  Rules + Hooks │
        └───────────────────────┬────────────────────────┘
                                │ reads/writes
                        ┌───────▼────────┐
                        │  Vault (files) │  ← git = source of truth
                        │  *.md + index  │     (ADR-0004)
                        └────────────────┘
```

## Layers

| Layer | Responsibility | First built |
|-------|----------------|-------------|
| **Format core** | Parse + validate OKF frontmatter; resolve concept IDs (path − `.md`); check link form. The highest-risk, most-tested code. | Phase 0 |
| **Index generation** | Deterministically regenerate `index.md` from `description` frontmatter; idempotent. | Phase 1 |
| **Retrieval** | Progressive-disclosure navigation (index→tags→links→grep); `/recall`. | Phase 2 |
| **Adapters** | Per-agent surface (slash commands / CLI). Claude Code first; Codex/Antigravity later. | Phase 1 / Phase 4 |
| **Rules + Hooks** | PreToolUse/PostToolUse/SessionStart pattern from momentum — validate on write, reindex, append `log.md`. | Phase 1 |

## Primitives (vs momentum)

See [ADR-0001](../decisions/0001-separate-product-shared-engine.md). The engine is
reused; the primitives are swapped: **Concept** (not Phase), **Inbox** (not
Backlog), **log.md** (not History), **Reference/MOC** (not ADR),
`/capture → /refine → /link` (no release gate).

## Vault layout (target)

```
vault/
├── index.md          # root map (progressive-disclosure entry) — may carry okf_version
├── AGENTS.md         # how agents traverse THIS vault
├── log.md            # global change log (ISO, newest first)
├── inbox/            # raw captures awaiting /refine
├── system-design/
│   ├── index.md
│   ├── _moc.md       # optional Map of Content hub
│   └── *.md          # atomic concepts
└── references/
    └── index.md
```

## Key constraints (NFRs)

- **Portability** — plain files, zero tooling to read (GitHub renders them).
- **No lock-in** — no account, no hosted dependency for core use.
- **Determinism** — index generation + navigation are idempotent.
- **Non-destructive** — never hard-delete; edits are git-tracked diffs.
- **Broken-link tolerance** — links to not-yet-written concepts are valid.
- **Cross-platform** — Mac + Android supported paths; Linux/Windows for the CLI.
