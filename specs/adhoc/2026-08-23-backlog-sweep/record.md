# Ad-hoc Work Record: 2026-08-23-backlog-sweep

> **Type**: quick-task
> **Created**: 2026-08-23
> **Branch**: `fix/backlog-sweep-v0.15.1`
> **Backlog**: BUG-012, BUG-013, ENH-002, ENH-008, TD-007
> **Status**: shipped

A sweep of the small open items after v0.15.0 — three defects, one check that was
deferred and never picked up, and one stale index. Each is independent; none needs a
decision; together they are a bounded quick-task under Rule 14.

**Deliberately excluded, and why** — the same list, so what was *not* done is on the
record too:

| Item | Why not here |
|---|---|
| TD-008 (P1) | Needs an ADR: carrying the structure guidance rather than pointing at it amends ADR-0017's scope, and "where does a vault declare conventions" is a design question. That is a phase |
| ENH-004 (P3) | Lives in `.githooks/contract.js`, which **momentum** owns. Patching it here is overwritten on `momentum upgrade`; it is correctly filed as upstream |
| Gate 2 | 48 blind edge judgements. Blind **by design** — an agent adjudicating engram's own extraction output is exactly what the protocol prevents (Rule 11). Not mine to do |
| The other 10 | Roadmap, not defects: connectors, local model, real-time sync, engine extraction, `EditorAdapter`, derived-node staleness. Several parked by ADR-0038 pending evidence |

## Current Behavior

**BUG-012.** `stripFlags` removes `--help` before the dispatch sees it, so for the two
commands that read content from stdin, `engram format --help` fell through to
`readStdin()` and blocked forever. `-h` was worse: not stripped at all, so it was
passed along as the *content to format*. A `--help` that hangs reads as the tool being
broken rather than as a missing flag.

**BUG-013.** `link` appended unconditionally, so `engram link a.md b part-of` twice
wrote `part-of: [b, b]`. Present since Phase 8 (`da830ff`). Invisible in flow style,
where a bracket hid it; Phase 18's block style put the duplicate on its own line.

**ENH-002.** Deferred from BUG-001 and never picked up. Frontmatter relations each
have a detective; links in the **body** had none, so a link to a note that was renamed
or never existed read as a clean bill of health.

**ENH-008.** ADR-0044 refused to write to `.agents/skills/` because it could not be
verified as read. Phase 17 found the Gemini CLI documents it at both tiers, taking
precedence over `.gemini/skills/`.

**TD-007.** The ADR index stopped at 0017 (2026-07-03). Thirty ADRs existed with no
row, so the index read as a complete list and was not one.

## Expected Behavior

- `--help` and `-h` print usage and exit 0 from any command, handled once in the
  dispatch rather than per command, so a third stdin-reading command cannot
  reintroduce it.
- `link` adds nothing when the identical edge is already present, and **says so** —
  an agent calling it cannot see the file, so a silent no-op reads as success and
  teaches it nothing.
- `doctor` reports `[link-unresolved]` for a body link that resolves to nothing, and
  **repairs nothing**: ADR-0028 gives link rewriting to Obsidian.
- ENH-008 needs no code. The precedence is already stated in the gemini descriptor's
  caveats — written in Phase 17 at the point of discovery. Resolved as documented.
- The ADR index lists all 48 ADRs with real titles, statuses and dates.

## Unchanged Behavior

- No change to the frontmatter parser, the codecs, or anything Phase 18 touched.
- `doctor` stays read-only. `[link-unresolved]` is a warning, not a failure — the
  same posture ADR-0021 sets for a missing slug.
- `link` still adds genuinely new edges, including a different relation kind to the
  same target.
- External URLs and pure anchors are not link-checked.
- The word `help` as *content* still captures: only the flag forms `--help` and `-h`
  short-circuit, asserted end to end against a real vault.

## Verification Evidence

`npm run check` — exit 0:

```
Test Files  51 passed (51)
     Tests  897 passed (897)
CLI smoke passed — the built binary works as installed.
plugin smoke passed — loading and wiring verified.
skills smoke passed — the rendered skill surface is what a person would see.
obsidian smoke passed — the frontmatter a real editor writes reads correctly.
```

On the built binary:

```
$ engram link a.md b part-of          # second time
warning: a --part-of--> b already exists; nothing was added
a --part-of--> b
$ grep part-of a.md
part-of: [b]

$ engram format --help
engram — a notes system where the organizing work is done by an agent
$ engram capture -h
engram — a notes system where the organizing work is done by an agent

$ engram doctor
  • [link-unresolved] /a.md: [gone](missing-note.md) resolves to nothing. Obsidian
    owns link rewriting (ADR-0028), so engram reports this rather than repairing it
```

The live link and the `https://` link in the same file were not flagged.

**Each fix verified by reverting it** — 6 of 14 tests fail: four `--help` cases, the
`link` duplicate case, and the `[link-unresolved]` case. Restored, all 14 pass.

ADR index: 48 rows, up from 18. Spot-checked 0021, 0043–0047 against their files.

## Not verified

`engram capture --help` is asserted through `main()` with a 5-second timeout rather
than a spawned process. If it regresses, the command blocks on stdin and the test
times out — a failure, but a slower signal than the smoke checks give.
