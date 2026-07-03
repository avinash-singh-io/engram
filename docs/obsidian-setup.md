# Obsidian setup

`engram init` scaffolds a copy of this guide into every vault. It's reproduced
here for repo readers. See also [ADR-0003](../specs/decisions/0003-standard-links-not-wikilinks.md).

This vault uses **standard markdown links** (OKF-conformant), not Obsidian
wikilinks. Configure Obsidian once so it matches:

**Settings → Files & Links**
- **Use [[Wikilinks]]: OFF**
- **New link format: Absolute path in vault**

## Why

OKF requires standard `[text](/abs/path.md)` links so agents, `grep`, and GitHub
all read the vault identically. Frontmatter (`type`, `tags`, `description`, …)
surfaces automatically as Obsidian **Properties**, so the same bytes are
human-filterable in Obsidian and agent-parseable.

## Trade-off (documented)

- **Lost:** wikilink auto-rename, `![[embeds]]`, and (older Obsidian) full backlinks.
- **Kept:** graph view, Properties, search.

Indexes (`index.md`) and `log.md` are tool-generated — never hand-edit them; run
`engram reindex` instead.
