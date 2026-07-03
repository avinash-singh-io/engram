# Obsidian setup for this vault

This vault uses **standard markdown links** (OKF-conformant), not Obsidian
wikilinks. Set Obsidian up once so it matches:

**Settings → Files & Links**
- **Use [[Wikilinks]]: OFF**
- **New link format: Absolute path in vault**
- **Default location for new attachments:** anywhere outside concept dirs

## Why

OKF requires standard `[text](/abs/path.md)` links so agents, `grep`, and GitHub
all read the vault the same way ([ADR-0003]). Frontmatter (`type`, `tags`,
`description`, …) shows up automatically as Obsidian **Properties**.

## What you lose (and don't)

- Lost: wikilink auto-rename, `![[embeds]]`, and (older Obsidian) full backlinks.
- Kept: graph view, Properties, search, everything else.

Indexes (`index.md`) and `log.md` are tool-generated — don't hand-edit them.
