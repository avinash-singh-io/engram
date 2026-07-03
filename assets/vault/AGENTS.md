# AGENTS.md — How to navigate this vault

This is an OKF (Open Knowledge Format) knowledge vault maintained by `engram`.
Read this before answering from the vault.

## Traversal contract (progressive disclosure)

1. **Start at `/index.md`** — the root map. Read it plus concept frontmatter first.
2. **Filter by `tags` / `type`** in frontmatter (grep the YAML) — do not open bodies to filter.
3. **Descend** — root index → a subdirectory `index.md` → the specific concept.
4. **Follow links** — concepts link related concepts with absolute markdown links (`/dir/file.md`).
5. **Open only what the task needs. NEVER read the whole vault.**

## Writing

- Capture a raw note:  `engram capture "…"`  → lands in `inbox/`.
- File a concept:      `engram refine <inbox> --type … --title … --description "One sentence." --tags a,b --to dir/slug.md`
- Cross-link:          `engram link <concept> --to <other>`
- Indexes and `log.md` are auto-maintained — never hand-edit `index.md`.

Every concept carries required frontmatter: `type`, `title`, `description`
(one sentence), `tags`, `timestamp`. Non-conformant writes are rejected.
