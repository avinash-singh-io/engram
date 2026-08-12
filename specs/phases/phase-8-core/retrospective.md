# Phase 8 — Retrospective

> **Closed**: 2026-08-12 · **Outcome**: v2 core shipped · **Target release**: v0.7.0
> All 8 groups complete and verified. Every acceptance criterion evidenced.

## What the phase produced

A clean-room `src/` in 8 commits: 20 source files, 171 tests, zero v1 code carried
forward. `capture` and `link` run against a real vault.

| | v1 (deleted) | v2 (this phase) |
|---|---|---|
| Source files | 40 (~4,212 LOC) | 20 |
| Tests | 229 | 171 (+36 Phase 7 instrument) |
| Primitive | one `Concept` with an inert `type` | Node + Edge |
| Identity | path | slug, with path as address and `aliases` as repair |
| Format | one parser | internal model + versioned codecs |
| Capture | five required fields; could reject | never rejects |

## What went right

- **The sweep paid for itself immediately.** Reading v1's tests before deleting them
  rescued two behaviours, not the one that was known. BUG-001's 17-case encoding
  matrix would have been expensive to rediscover; frontmatter totality turned out to
  be load-bearing for ADR-0026 and would likely have been rediscovered as a bug
  report rather than a spec.
- **Verifying the lint rules caught a real defect.** Both architecture rules were
  written, and one of them did nothing: eslint flat config is last-wins per rule, so
  the broad `src/**` block silently replaced the `core/` patterns. A rule nobody has
  watched fire is not a control. It is now watched twice — once at Group 0, once in
  the Group 7 sweep.
- **TDD was genuinely cheap where it was claimed to be.** `core/` and `format/` are
  pure and sit behind narrow ports, so 111 of the tests need no fixtures, no temp
  directories and no clock stubbing. The one place it felt like overhead was CLI
  wiring, exactly as the plan predicted.
- **The window closed in one session.** The plan budgeted a real cost for `main`
  being unreleasable between Groups 0 and 6; in practice it lasted hours.

## What went wrong

- **"Land failing specs" was the wrong instruction and had to be changed mid-phase.**
  22 known-red tests would have made the suite useless as a signal for Groups 1–2.
  Skipping with an explicit unskip marker preserved both the specification-first
  discipline and the signal. The plan should have said this.
- **Group 0's task list was written before anyone knew the shape of the work.** The
  rescued specs could not typecheck without the `format/` signatures existing, which
  meant Group 0 quietly did a slice of Group 3's design work. Not harmful, but the
  group boundary was drawn in the wrong place.
- **The phase shipped a YAML subset rather than a decision about YAML.** ~40 lines
  covering flat scalars, inline lists and inline maps is right for OKF today. It is
  the kind of thing that becomes a real problem the first time frontmatter needs
  nesting, and nothing currently forces that conversation.

## Carried forward

| Item | Owner |
|---|---|
| `format(content, hints)`, guardrails, skills, MCP, adapters | Phase 10 |
| `reindex`, `doctor`, views, `init --structure` | Phase 9 |
| TD-004 — walker must detect and refuse a nested vault root | Phase 9 |
| Reserved-file detection + enumeration counting (found in the sweep) | Phase 9 |
| Traversal retrieval; `recall-v1` is orphaned until adopted or superseded | Phase 11 |
| YAML subset vs a real parser, if frontmatter ever nests | unscheduled |

## Verification Evidence (Rule 12)

Captured fresh on 2026-08-12 from `phase-8-core`. Exit codes verbatim.

### `npm run check` — exit 0

```
   Start at  19:00:34
   Duration  688ms (transform 330ms, setup 0ms, collect 577ms, tests 498ms, environment 2ms, prepare 726ms)
> @avinash-singh-io/engram@0.6.8 build
> tsup
CLI Building entry: src/cli.ts, src/index.ts
CLI Using tsconfig: tsconfig.json
CLI tsup v8.5.1
CLI Using tsup config: /Users/avinash/Workspace/Projects/engram/tsup.config.ts
CLI Target: node20
CLI Cleaning output folder
ESM Build start
ESM dist/index.js     15.29 KB
ESM dist/cli.js       12.98 KB
ESM dist/index.js.map 45.79 KB
ESM dist/cli.js.map   39.83 KB
ESM ⚡️ Build success in 11ms
DTS Build start
DTS ⚡️ Build success in 392ms
DTS dist/cli.d.ts   95.00 B
DTS dist/index.d.ts 16.16 KB
```

### Architecture rules fire — deliberate violation, then reverted

`core/` importing `node:fs` and `format/registry`, and `ops/` importing a
versioned codec directly. All three caught:

```
3 architecture violations caught (no-restricted-imports)
  - 'node:fs' — core/ is pure and I/O-free (ADR-0024)
  - '../format/registry.js' — core/ may import only core/ (v2-overview §2)
  - '../format/okf-v0_2.js' — a versioned codec is importable only from format/
```

### Acceptance spot-checks

```
no describe.skip / it.skip survives      ✓
core/ has zero non-core imports          ✓
empty node round-trips through codec     empty in -> true | empty out -> true | id preserved -> true
slug collision + missing slug            findings: slug-collision, path-as-identity | all warnings -> true
capture never rejects (15 adversarial)   21 passed
gate1 freeze (Rule 11, both versions)    10 passed
```

### Built binary smoke test — `node dist/cli.js`

A build that typechecks is not the same claim as a binary that runs.

```
captured 36 bytes -> /inbox/2026-08-12T13-29-38-580Z.md
smoke --supersedes--> superseded-thing

---
okf_version: 0.2
id: smoke
timestamp: 2026-08-12T09:00:00Z
author: unknown
supersedes: [superseded-thing]
---
# Smoke
```
