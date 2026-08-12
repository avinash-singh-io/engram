# Phase 9 — Retrospective

> **Closed**: 2026-08-12 · **Outcome**: structure, views and health shipped
> **Target release**: v0.8.0 · All 7 groups verified.

## What the phase produced

`init`, `reindex`, `doctor`, four generated views, and a walker that refuses to
enumerate a nested vault. 262 tests, up from 171.

| | Phase 8 | Phase 9 |
|---|---|---|
| Commands | `capture`, `link` | + `init`, `reindex`, `doctor` |
| Closed relations | 2 | 3 (`part-of` registered) |
| Tests | 171 | 262 |

## What went right

- **The detective forms earned their keep immediately.** Phase 8 required every
  closed relation to carry one, which felt like ceremony at the time. The first
  `doctor` run using them found that the v0.2 codec had a hardcoded relation list,
  so `part-of` was registered but silently never serialized. Nothing else would
  have caught it — no test failed, the relation simply did not exist in any file
  that was read.
- **Both defects found this phase were in Phase 8 code, found by Phase 9 usage.**
  The codec's hardcoded list, and `nodeFileStore.list()` never walking the disk.
  Both had passing tests. That is the honest argument for building the consumer
  before trusting the port.
- **ADR-0029's safety claim is now tested three ways** — in memory, on a real
  filesystem, and through the built binary — rather than asserted in prose.
- **The disclosure guard was verified end to end**, not just unit tested: a real
  vault with a nested private root, reindexed by the built binary, with a grep
  proving nothing private reached the derived state.

## What went wrong

- **A property proven at two of three sites read exactly like one proven
  everywhere.** Phase 8's open/closed test showed that adding a relation needed no
  edit to `gate.ts` or `graph.ts`. True — and it never touched the codec, which did
  need one. The test passed throughout. Coverage of a *claim* is not coverage of its
  *sites*.
- **A port with two implementations was only ever exercised through the easy one.**
  `memoryFileStore.list()` was correct; `nodeFileStore.list()` was a stub that
  satisfied every test because they all wrote before listing. Nothing needed to
  enumerate a vault it had not just created until `reindex` did.
- **Two of ADR-0023's four named views could not be built.** Not a failure of this
  phase, but it means ADR-0023 has read as fulfilled since 2026-08-09 while
  describing views whose backing data does not exist.

## Carried forward

| Item | Owner |
|---|---|
| `doctor --fix` — explicit link repair via `aliases` | future, own pass |
| `views/by-tag.md` — needs tag extraction | Phase 10 |
| `views/unread-sources.md` — needs a notion of "read" | unscheduled |
| `format()`, guardrails, skills, MCP, adapters | Phase 10 |
| Traversal retrieval; `recall-v1` still orphaned | Phase 11 |

**TD-004 is resolved** and closed in the backlog.

## Verification Evidence

Captured fresh on 2026-08-12 from `phase-9-structure`. Exit codes verbatim.

### `npm run check` — exit 0

```
CLI tsup v8.5.1
CLI Using tsup config: /Users/avinash/Workspace/Projects/engram/tsup.config.ts
CLI Target: node20
CLI Cleaning output folder
ESM Build start
ESM dist/index.js     26.93 KB
ESM dist/cli.js       28.42 KB
ESM dist/index.js.map 75.62 KB
ESM dist/cli.js.map   81.69 KB
ESM ⚡️ Build success in 10ms
DTS Build start
DTS ⚡️ Build success in 499ms
DTS dist/cli.d.ts   95.00 B
DTS dist/index.d.ts 21.87 KB
```

### Built binary — `node dist/cli.js` on a real vault

```
$ node dist/cli.js reindex --vault $SMOKE
warning: /private/ is its own vault root (.engram/) — skipped entirely, nothing
         under it was read. ADR-0030: boundaries are repositories.
2 node(s), 2 edge(s) -> 4 derived file(s)

$ cat $SMOKE/index.md
## decisions
- [june](/decisions/june.md)
## Unfiled
- [march](/decisions/march.md)

$ grep -ri "medical" index.md views/
✓ nothing private leaked into derived state
```

### `doctor` — exit 0 on a warning, detectives reported by name

```
warnings (1) — none of these are errors
  • [dangling-edge] part-of edge from "a" points at "ghost-container", which has no node yet

detective checks (3 registered relations)
  part-of: find part-of targets that are not themselves nodes (a container that does not exist)
    • a --part-of--> ghost-container (target has no node)
  sources: find synthesis nodes carrying no sources edge
    clean
  supersedes: find supersedes targets that are still presented as current
    clean
doctor exit=0
```

### ADR-0029 — delete-and-rebuild is byte-identical

```
✓ delete-and-rebuild byte-identical
  sha256 d686efbb941a9e0e1eea6439e1429081ff75eea3c9dfe60117071b046e2ccf02
```

### Architecture rules still fire

```
3 violations caught (no-restricted-imports)
no describe.skip survives    ✓
core/ has zero non-core imports    ✓
```
