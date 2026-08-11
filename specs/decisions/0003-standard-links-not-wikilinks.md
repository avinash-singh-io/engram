# 0003 — Standard markdown links, not wikilinks

> **Status**: accepted, amended by [ADR-0022](0022-relations-in-frontmatter.md) (2026-08-09)
> **Date**: 2026-07-03
> **Deciders**: Avinash Kumar Singh

> **Amended.** Standard markdown links remain the body-level, human-facing,
> graph-drawing layer and stay untyped. ADR-0022 adds a separate machine-facing
> channel: typed relations in frontmatter, following OKF v0.2's `sources` shape.
> A markdown link has nowhere to carry a relation type.

## Context

The vault is dual-authored: agents write it and humans edit it in Obsidian —
the *same* files, no build step. Obsidian defaults to `[[wikilinks]]`, but OKF
requires standard `[text](/path.md)` links. We cannot have both syntaxes in one
source of truth.

## Options Considered

### Option A — Obsidian wikilinks `[[note]]`
**Pros:** Obsidian auto-rename on move, `![[embeds]]`, native backlinks, zero
friction for the human author.
**Cons:** not OKF-conformant; agents (and `grep`, GitHub, any non-Obsidian tool)
must resolve Obsidian's non-standard link resolution; breaks interoperability.

### Option B — Standard markdown links, absolute bundle-relative
**Pros:** OKF-conformant; single source of truth; agent- and tool-readable;
stable across moves (absolute paths); GitHub renders them.
**Cons:** lose some Obsidian automation (wikilink auto-rename, `![[embed]]`, and
— on older versions — full backlinks). Requires a one-time Obsidian setting.

## Decision

**Use standard markdown links, absolute bundle-relative**
(`[Idempotency](/system-design/idempotency-patterns.md)`). Links are **untyped** —
the relationship is conveyed in prose, not the link. Setup instructs the user to
set Obsidian → Settings → Files & Links → **"Use [[Wikilinks]]" OFF**, new-link
format = absolute.

## Consequences

- **Gain:** conformance + single source of truth + agent-readability + GitHub
  rendering + stability across moves.
- **Lose (documented for the user):** wikilink auto-rename, `![[embeds]]`, and
  on older Obsidian versions full backlinks. Graph view still works. Frontmatter
  (`type`/`tags`/`description`) still surfaces as Obsidian Properties for free.
- Consumers/tools MUST tolerate broken links — a link to a not-yet-written
  concept is valid (NFR-5).
