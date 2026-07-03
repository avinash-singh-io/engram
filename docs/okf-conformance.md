# OKF v0.1 Conformance Spec (Engram profile)

> **Status:** normative for Engram v0.x · **Base:** Google Open Knowledge Format
> (OKF) v0.1 · **Owner:** Engram format core
>
> This document is the **contract the validator implements** (`src/format/`).
> It restates the OKF v0.1 rules Engram enforces and adds Engram's stricter
> profile. When code and this doc disagree, this doc wins — fix the code.
> Related: [ADR-0002](../specs/decisions/0002-okf-v01-format.md) (OKF as the
> format), [ADR-0003](../specs/decisions/0003-standard-links-not-wikilinks.md)
> (links), [ADR-0006](../specs/decisions/0006-auto-generated-indexes.md)
> (indexes).

## 1. File kinds

A vault contains four kinds of markdown file. Only **Concept** files carry
frontmatter and are validated as concepts.

| Kind | Path pattern | Frontmatter | Validated as |
|------|--------------|-------------|--------------|
| **Concept** | any `*.md` except the reserved names below | **required** | concept |
| **index.md** | `index.md` in any directory | none (root `index.md` MAY carry `okf_version`) | index |
| **log.md** | `log.md` (usually vault root) | none | log |
| **AGENTS.md** | `AGENTS.md` (vault root) | none | reserved / passthrough |

Reserved filenames (case-sensitive): `index.md`, `log.md`, `AGENTS.md`,
`CLAUDE.md`. These are **not** concepts and are exempt from concept frontmatter
rules (`AGENTS.md` / `CLAUDE.md` are agent-instruction files, not vault knowledge).

## 2. Concept frontmatter

A concept file MUST begin with a YAML frontmatter block delimited by `---` lines,
followed by a markdown body.

```yaml
---
type: Reference
title: Temporal Internals
description: How determinism, replay, and event history make workflows durable.
tags: [distributed-systems, temporal, interview]
timestamp: 2026-07-03T00:00:00Z
---
```

### 2.1 Required fields (ERROR if missing/invalid → file rejected)

| Field | Rule |
|-------|------|
| `type` | non-empty string |
| `title` | non-empty string |
| `description` | non-empty string (see §2.3) |
| `tags` | an array; every element a string |
| `timestamp` | a string parseable as an ISO-8601 date-time |

A file that fails any ERROR rule is **non-conformant** and MUST be rejected by
the validator. Rationale: Google's reference parser rejects files missing
`type`/`title`/`description`/`timestamp`; Engram additionally requires `tags`
because retrieval filters on them.

### 2.2 `type` vocabulary (open set)

`type` is an **open vocabulary** — any non-empty string is valid. Recommended
values: `Concept`, `Reference`, `Playbook`, `MOC`, `Drill-Map`. Unknown types
are allowed (no warning) so the vault can grow new kinds without a code change.

### 2.3 `description` — the load-bearing field

`description` is a **single sentence**. It is the index snippet and the signal an
agent scans to decide whether to open the file, so it must be short and complete.

- ERROR: missing or empty.
- WARNING (`description-not-one-sentence`): more than one sentence — heuristic:
  contains more than one sentence-terminator (`.`/`!`/`?`) that is followed by a
  space + capital or end-of-string. A single trailing period is fine; internal
  abbreviations (`e.g.`) should not trip it (best-effort).
- WARNING (`description-too-long`): length > 200 characters.

### 2.4 `tags`

- ERROR (`tags-not-string-array`): `tags` present but not an array of strings.
- WARNING (`tags-empty`): `tags: []` — a concept with no tags is hard to find.

### 2.5 `timestamp`

- ERROR (`timestamp-unparseable`): not parseable as an ISO-8601 date-time.
- Storage form SHOULD be UTC (`...Z`). Non-UTC offsets are accepted.

## 3. Body conventions

- Favor **structural markdown** — headings, lists, tables, fenced code — over
  long prose. Structure lets an agent pull a single section.
- Conventional headings where relevant: `# Schema`, `# Examples`, `# Citations`,
  `# See also`.
- Body conventions are advisory in v1 (no ERROR); the validator MAY emit a
  WARNING (`body-no-headings`) if a concept body has no heading at all.

## 4. Links

Per [ADR-0003](../specs/decisions/0003-standard-links-not-wikilinks.md):

- Use **standard markdown links**, **absolute bundle-relative**:
  `[Idempotency](/system-design/idempotency-patterns.md)`.
- Links are **untyped** — express the relationship in prose, not the link.
- **Broken-link tolerance (NFR-5):** a link whose target file does not exist is
  **valid** (knowledge grows forward). The validator MUST NOT error on a missing
  target.

Link-form checks (WARNING only — never block):

| Code | Trigger |
|------|---------|
| `link-wikilink` | `[[...]]` wikilink syntax found |
| `link-not-absolute` | a markdown link to a `.md` whose target is relative (does not start with `/`) |

## 5. index.md

- **No frontmatter**, except the root `index.md` MAY carry a single
  `okf_version` field.
- Body is sections of bullets, one per concept:
  `* [Title](/abs/path.md) - one-line description`
- The description in each bullet is the target concept's `description`
  frontmatter. Indexes are **auto-generated** and idempotent
  ([ADR-0006](../specs/decisions/0006-auto-generated-indexes.md)); hand edits are
  overwritten on `/reindex`.

## 6. log.md

- Append-only change log; **no frontmatter**.
- ISO-8601 date headings, **newest first**, actions in bold verbs:
  ```markdown
  ## 2026-07-03
  - **Added** [Idempotency Patterns](/system-design/idempotency-patterns.md)
  ```

## 7. Concept identity

A concept's **ID is its vault-relative path minus the `.md` extension**.

| Path | Concept ID |
|------|-----------|
| `system-design/temporal-internals.md` | `system-design/temporal-internals` |
| `index.md` | *(reserved — not a concept)* |

Identity is the path: moving a file changes its ID. Absolute bundle-relative
links (§4) keep references stable across moves because they encode the full path.

## 8. Validator contract (summary)

The Phase 0 validator exposes, per file:

```
validateConcept(fileText, path) -> {
  ok: boolean,                 // false iff any ERROR
  errors: Issue[],             // conformance violations (reject)
  warnings: Issue[],           // conformant-but-flagged
}
Issue = { code: string, message: string, field?: string }
```

- `ok === true` ⇔ zero ERROR issues. WARNINGs never set `ok` to false.
- Reserved files (`index.md`, `log.md`, `AGENTS.md`) return `ok: true` with no
  concept checks applied.

### Error codes (reject)
`missing-frontmatter`, `invalid-yaml`, `missing-field:<name>`,
`type-not-string`, `title-not-string`, `description-empty`,
`tags-not-string-array`, `timestamp-unparseable`.

### Warning codes (allow)
`description-not-one-sentence`, `description-too-long`, `tags-empty`,
`body-no-headings`, `link-wikilink`, `link-not-absolute`.

> This code list is **locked** alongside the fixtures corpus (Rule 11). New
> codes or rule changes go to a v2 spec + v2 corpus; do not mutate v1.
