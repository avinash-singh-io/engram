# 0028 — Obsidian owns link rewriting; engram verifies only

> **Status**: accepted
> **Date**: 2026-08-09
> **Deciders**: Avinash Kumar Singh

## Context

The intended setup is a laptop, an Android phone, and a tablet, all editing the
same vault through Obsidian, with engram operating on the same files.

Obsidian's *"Automatically update internal links"* rewrites link targets when a
file moves, in whichever format the *"New link format"* setting specifies
(shortest path / relative / absolute). Engram's write-hook also rewrites links.

That is **two writers, two formats, three devices**, and the settings are not
guaranteed to match across devices because they are per-vault-per-install.

The design review's pre-mortem ranked this as the single most likely cause of
actual vault corruption — and notably it has nothing to do with any primitive.
It is an operational collision, and it will happen whether or not the rest of the
architecture is right.

## Options Considered

### Option A — Engram owns rewriting; Obsidian's auto-update disabled
**Pros:** engram controls format precisely; one writer.
**Cons:** requires a setting to be off on **every** device forever. Any new install
or a settings sync silently re-enables it. Obsidian's rewrite is also the better UX
in-app — a user dragging a file expects links to follow.

### Option B — Obsidian owns rewriting; engram never rewrites
**Pros:** one writer, and it is the one the human interacts with directly. Engram
becomes read-only with respect to link targets, which is a much smaller surface.
**Cons:** engram cannot repair a link during its own operations; format is whatever
Obsidian is set to, which may vary by device.

### Option C — Both rewrite, coordinated by a lock or convention
**Pros:** none that survive contact with three devices and an offline phone.
**Cons:** distributed coordination over a synced folder. No.

## Decision

**Option B — single writer, and the writer is Obsidian.**

- **Engram never rewrites link targets.** It verifies, reports, and repairs *only*
  when explicitly asked (`engram doctor --fix`), never as a side effect of another
  operation.
- **`doctor` reads the Obsidian link-format setting** from `.obsidian/app.json`
  and warns when a device's setting differs from what the vault's links actually
  use. Detected, not configured (ADR-0025).
- **A broken link is repairable, not fatal.** [ADR-0021](0021-identity-slug-path-aliases.md)'s
  `aliases` make a dangling path resolvable to the node that moved, and link text
  carries the title as a second repair signal.

## Consequences

- Engram's write surface shrinks: it writes frontmatter, bodies, and derived views,
  but never edits a link target in someone else's file as a side effect.
- The failure mode degrades from *corruption* to *a dangling link `doctor` can
  name and fix*.
- Non-Obsidian users (CLI-only, another editor) have no rewriter at all — moves are
  either done through `engram` (which updates `aliases` and can offer `--fix`) or
  leave dangling links that repair on demand. Acceptable, and it keeps the rule
  uniform.
- This decision is independent of every primitive and should be implemented early,
  because the risk exists from the first day of multi-device use.
