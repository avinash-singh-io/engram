# 0015 — Editor adapters (engram is editor-agnostic)

> **Status**: accepted
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

## Context

A vault is dual-authored: humans edit it in an editor (Obsidian today) and agents
via commands. For OKF conformance the editor must be configured a certain way
(e.g. Obsidian must use standard, absolute links, not `[[wikilinks]]` —
[ADR-0003](0003-standard-links-not-wikilinks.md)). We want engram to *fix* that
setup automatically, but without hard-coding a dependency on Obsidian — other
editors may follow.

## Options Considered

### Option A — Hard-code Obsidian setup into `init`
**Pros:** simplest. **Cons:** couples engram to one editor; adding another means
editing init; engram appears Obsidian-specific.

### Option B — An editor-adapter layer (detect + setup)
**Pros:** engram never *depends* on an editor — it configures one only if it
*detects* it in the vault. Mirrors the agent-adapter seam (a new editor is one
descriptor + one registry entry). Vendor-agnostic.
**Cons:** a small abstraction up front.

## Decision

**Option B.** Introduce `EditorAdapter { id, label, detect(root), setup(root) }`
(`src/editors/`). Obsidian is the first: `detect` = `.obsidian/` exists; `setup`
merges `.obsidian/app.json` to `useMarkdownLinks: true` + `newLinkFormat:
"absolute"` (non-destructive — preserves every other setting; idempotent).
`engram init` runs `setupEditors(root)` for every detected editor (opt-out with
`--no-editor-setup`). engram does not require any editor.

## Consequences

- engram stays editor-agnostic; Obsidian is one adapter, not a dependency.
- New editors (VS Code, Logseq, …) are cheap to add later — one module + one entry.
- `init` also `git init`s a non-repo vault (git is the source of truth,
  [ADR-0004](0004-git-source-of-truth.md)); opt-out `--no-git`.
