# Phase 14 — Retrospective

> **Branch**: `phase-14-obsidian` · **Released**: v0.11.0 · Not gated on Gate 2.
> **Scope changed mid-phase**: the Obsidian plugin moved to Phase 16 so the agent
> surfaces could get real use first. This phase became **the approval queue, the
> guardrail configuration that feeds it, and the vault's filing convention.**

## What shipped

| | |
|---|---|
| **The approval queue** | The gate's third outcome (ADR-0042). `propose-only` defers instead of refusing; proposals held as plain markdown; approve refuses on drift rather than merging; approve and reject are human-only |
| **Guardrail configuration** | BUG-003: `.engram/guardrails.md`. Three of six rules had been inert since Phase 10 |
| **The contract per agent** | ADR-0017 over ADR-0011: each agent gets the contract in full, spliced into a marked region that preserves the user's own text |
| **Structures** | ADR-0043: `default`, `para`, `zettelkasten`, `custom`, each with a `STRUCTURE.md` guide, rendered into `AGENTS.md` |
| **`raw/` replaces `inbox/`** | An inbox implies an obligation to empty it — a GTD idea that contradicts capture-never-rejects |
| **Multi-membership** | `index.md` honours every `part-of` edge, so one note appears under every container it claims |
| **The Obsidian plugin** | Written, tested, landing **inert** and excluded from the npm tarball. Phase 16 releases it |

## Six bugs, none of which the suite could see

Every one was found by running the artifact, not by testing a function.

| | |
|---|---|
| **BUG-004 (P0)** | The **installed binary was a silent no-op**. The entry guard tested for `cli.js`; npm installs a symlink named `engram`. Every command exited 0 having done nothing, since Phase 8 |
| **BUG-003** | `proposeOnly`, `pathScope`, `rateLimit` unreachable — nothing loaded a config from a vault |
| **BUG-005** | `init` imposed its tree on vaults that already had one; on macOS `projects/` resolved into an existing `Projects/` |
| **BUG-006** | A skipped `CLAUDE.md` left the agent unrouted — the pointer's only job, silently not done |
| **BUG-007** | `--container` slugified the directory, giving `Daily Notes/` a lowercase twin |
| **BUG-008 (P0)** | **`reindex` was not idempotent** — it indexed its own generated `GEMINI.md`, so run 1 and run 2 disagreed |

Plus one regression introduced and caught inside this phase: adding the QUEUE
outcome made `format` fall through to `files.write` for the new arm, so a
guardrail that had been *refusing* writes began *silently applying* them — with
all 464 tests passing.

## What the phase actually taught

**The suite cannot see the gap between "the function works" and "a person can use
it".** Six defects lived there. Two smoke checks now close it and run in
`npm run check`: `smoke-cli.mjs` spawns the built binary through a symlink named
`engram`, and `smoke-plugin.mjs` loads the built plugin against a stubbed Obsidian.

**Restating a list is how this codebase produces bugs.** `RESERVED_FILES` restated
what the adapter registry owned, and `GEMINI.md` was indexed as knowledge.
`STRUCTURE.md` reproduced it *the same day*. Adding another literal would have
armed the trap a third time, so the fix became an invariant instead: **whatever
engram writes into an empty vault, that vault reports zero nodes** — asserted for
every structure, on the first reindex and the second.

**"No opinion" is not the same as "say nothing".** ADR-0023 meant engram should
not prefer a structure. Implemented as silence, it produced vaults where four
filings created three different top-level folders. ADR-0043 separates the two:
engram prefers none, and insists a vault declares one.

## Verification Evidence

Fresh from this session, on `phase-14-obsidian`.

### `npm run check` — exit 0

```
 Test Files  36 passed (36)
      Tests  627 passed (627)

CLI smoke passed — the built binary works as installed.
plugin smoke passed — loading and wiring verified.
```

### All four structures, end to end on real vaults

```
default        dirs: concepts decisions projects raw sources     nodes: 0
para           dirs: 1-projects 2-areas 3-resources 4-archive raw  nodes: 0
zettelkasten   dirs: notes raw                                   nodes: 0
custom         dirs: raw                                         nodes: 0
```

Zero nodes in every empty vault is the invariant that closes BUG-008's class.

### The queue, on the built binary

```
$ engram format '# A decision' --path /decisions/d1.md
queued [propose-only]: /decisions/d1.md is propose-only — held for human review
  not written — review it with: engram queue list

$ engram queue approve decisions-d1-34536b42
applied /decisions/d1.md
```

And the staleness refusal, with a hand edit surviving:

```
refusing: /decisions/d2.md changed since this was proposed.
  Engram will not merge. Review the file, then re-run the change.

$ grep '^#' decisions/d2.md
# My careful original, now revised by hand
```

### Idempotence, restored

```
run 1 -> 1 nodes     (before: 1)
run 2 -> 1 nodes     (before: 2  ← BUG-008)
run 3 -> 1 nodes     (before: 2)
```

### Architecture rules — proven by deliberate violation

```
RULE 1: core/ may import only core/            violations caught: 1
RULE 2: a versioned codec only from format/    violations caught: 1
RULE 3: plugin/ must stay mobile-safe          violations caught: 1
```

### Skills

```
$ engram skill new literature-review
created /.engram/skills/literature-review.md
$ engram skill list
connect-the-dots   [built-in]  uses: capture, format, link
literature-review  [vault]     uses: capture, format
weekly-digest      [built-in]  uses: reindex, doctor, format
```

### A user inventing subfolders under PARA

```
$ engram format '# Raft' --container "3-resources/distributed"
$ engram format '# Q4 plan' --container "1-projects/q4"
2 node(s), 2 edge(s) -> 8 derived file(s)
doctor failures: 0
```

### NOT VERIFIED — carried to Phase 16

**The Obsidian plugin has not been loaded in a real vault.** Its loading and
wiring are proven by `smoke-plugin.mjs` and its behaviour by 15 tests against a
`FileStore`, but **rendering and button behaviour are unverified**. The code ships
inert and is excluded from the npm tarball, so v0.11.0 carries nothing unverified
that a user can run. Phase 16 owns that gate.
