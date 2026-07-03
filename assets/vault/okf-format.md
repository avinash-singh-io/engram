# OKF format — read before writing a concept

This is the authoritative format for concepts in this vault. **Read it before
creating or editing a concept.** The write-hook validates every concept and
**rejects** non-conformant files, so getting this right up front avoids errors.

## A concept file

One file = one idea. YAML frontmatter, then a structural markdown body:

```markdown
---
type: Reference          # Concept | Reference | Playbook | MOC | Drill-Map | …
title: Idempotency Patterns
description: How at-least-once execution plus idempotent operations yields effectively-once.
tags: [distributed-systems, reliability]
timestamp: 2026-07-03T00:00:00Z
---

# Model
Structural markdown — headings, lists, tables, fenced code — over prose.

# See also
- [Temporal Internals](/system-design/temporal-internals.md)
```

## Required frontmatter — all five, or the file is rejected

| Field | Rule |
|-------|------|
| `type` | non-empty string. Open vocabulary: `Concept`, `Reference`, `Playbook`, `MOC`, `Drill-Map`, … |
| `title` | non-empty string |
| `description` | **exactly one sentence** — it is the index snippet and what an agent scans to decide whether to open the file. Keep it short and complete. |
| `tags` | array of strings, e.g. `[a, b]` |
| `timestamp` | ISO-8601 date-time, e.g. `2026-07-03T00:00:00Z` |

## Body

- Prefer **structural markdown** (headings, lists, tables, fenced code) over long
  prose, so a single section can be pulled without the whole file.
- Conventional headings where they fit: `# Model`, `# Examples`, `# See also`, `# Citations`.

## Links

- **Standard markdown, absolute from the vault root:** `[Title](/dir/file.md)`.
- **No `[[wikilinks]]`.** Links are untyped — say the relationship in prose.
- A link to a not-yet-written concept is **valid**, not an error.

## Reserved files — never concepts, never given frontmatter

- `index.md` — per-directory map, **tool-generated**. Never hand-edit; run `engram reindex`.
- `log.md` — append-only change log (ISO dates, newest first).
- `AGENTS.md` / `CLAUDE.md` — agent instructions (this vault's contract).

## Identity

A concept's id is its path minus `.md`. Moving a file changes its id — absolute
links keep references stable across moves.

## Fastest correct path

Don't hand-write the frontmatter — let the tool do it and validate:
`engram refine <inbox> --type … --title … --description "One sentence." --tags a,b --to dir/slug.md`
