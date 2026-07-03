# AGENTS.md — How to navigate this vault

This is an OKF (Open Knowledge Format) knowledge vault maintained by `engram`.
Read this before answering from the vault.

## Traversal contract (progressive disclosure)

1. **Start at `/index.md`** — the root map. Read it plus concept frontmatter first.
2. **Filter by `tags` / `type`** in frontmatter (grep the YAML) — do not open bodies to filter.
3. **Descend** — root index → a subdirectory `index.md` → the specific concept.
4. **Follow links** — concepts link related concepts with absolute markdown links (`/dir/file.md`).
5. **Open only what the task needs. NEVER read the whole vault.**

## Read budget (progressive disclosure)

Retrieval must stay **bounded and sublinear** in vault size — never a whole-vault load:

- **Map first (cheap):** read `index.md` files (the per-directory maps) and concept frontmatter. These return one line per concept — title, description, tags — not bodies.
- **Bodies last (costly):** open a concept's full body only once its index/frontmatter line says it is relevant. The count of full-body reads is what stays bounded.
- **Budget:** locating an answer should touch only a small fraction of files and read a handful of bodies at most, regardless of how large the vault grows.

## `engram recall`

`engram recall "<query>"` runs this contract for you and returns the **minimal
relevant set** — ranked concept references (path + title + description + why it
matched), not full bodies. It reads the index map, not the vault.

- `engram recall "<query>"` — ranked references you then open as needed.
- `--tag <t...>` / `--type <t>` — filter by frontmatter tags or type.
- `--sections` — also return the matched headings within each reference.
- `--json` — machine output including a `ReadReport` (how many files/bodies were read).
- `--explain` — show scores, the match trail, and per-tier read counts.

`recall` returns the map to the answer; you open only what the task needs.

## Writing

- Capture a raw note:  `engram capture "…"`  → lands in `inbox/`.
- File a concept:      `engram refine <inbox> --type … --title … --description "One sentence." --tags a,b --to dir/slug.md`
- Cross-link:          `engram link <concept> --to <other>`
- Indexes and `log.md` are auto-maintained — never hand-edit `index.md`.

Every concept carries required frontmatter: `type`, `title`, `description`
(one sentence), `tags`, `timestamp`. Non-conformant writes are rejected.
