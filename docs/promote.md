# Promote — momentum → Engram import

> Import a momentum ADR or history/learning entry into the vault as a one-way
> OKF `Reference` concept. See
> [ADR-0012](../specs/decisions/0012-promote-one-way-reference-snapshot.md) and
> [ADR-0001](../specs/decisions/0001-separate-product-shared-engine.md).

## Contract

- **One-way, point-in-time snapshot.** A promoted concept records where it came
  from and when. Engram never syncs changes back to momentum, and it does not
  live-update when the source changes — re-run `engram promote` to refresh.
- **File-path read, no code dependency.** Engram reads the momentum artifact as
  plain text. It imports no momentum SDK or code (ADR-0001, forge-neutral). The
  momentum path is an explicit argument — nothing is auto-discovered.
- **Validate before write (hard gate).** The rendered concept must pass the
  Phase 0 `validateConcept` check; a non-conformant mapping aborts and writes
  nothing, so the vault can never hold an invalid promoted concept.

## Usage

```bash
engram promote <momentum-file> [--type Reference] [--tags a,b] \
  [--description "One sentence."] [--to references] [--dry-run] [--force]
```

- `--dry-run` renders the concept, prints the placement plan + validation
  result, and writes nothing. Non-conformant input exits non-zero either way.
- `--to` sets the target directory (default `references/`).
- `--force` overwrites an existing destination.

Recommended flow: preview first, then write.

```bash
engram promote ../momentum/specs/decisions/0007-vendor-shared-engine.md --dry-run
engram promote ../momentum/specs/decisions/0007-vendor-shared-engine.md --to references
```

## What gets mapped

| OKF field | Source |
| --- | --- |
| `type` | `Reference` (override with `--type`) |
| `title` | ADR title (number stripped) or the learning entry title |
| `description` | first sentence of the ADR `## Decision` (fallback: title; override: `--description`) — the load-bearing retrieval snippet ([ADR-0005](../specs/decisions/0005-navigate-first-retrieval.md)) |
| `tags` | momentum `Topics:` + `momentum` + the kind (`adr`/`learning`); never empty |
| `timestamp` | the ADR/entry date → `YYYY-MM-DDT00:00:00Z` (fallback: now) |
| body | the ADR `##` sections (re-leveled to `#`) or the learning `Detail:` |
| `# Source` | provenance block linking back to the momentum artifact |

Links in the body are rewritten to OKF standard form
([ADR-0003](../specs/decisions/0003-standard-links-not-wikilinks.md)):
`[[wikilinks]]` become standard links, and relative cross-ADR `.md` references
become vault-relative absolute links to promoted siblings (broken-link-tolerant
when a sibling has not been promoted yet).

## Filename

- An **ADR** (one file = one decision) keeps its source basename, e.g.
  `references/0007-vendor-shared-engine.md`, so cross-ADR links resolve to
  promoted siblings.
- A **learning entry** (its file is a container of many entries) is named from
  the entry title, e.g.
  `references/lock-the-evaluator-before-the-optimization-loop.md`.

After a successful write, Engram reindexes the enclosing directory and appends a
newest-first `**Promoted** …` entry to `log.md`.
