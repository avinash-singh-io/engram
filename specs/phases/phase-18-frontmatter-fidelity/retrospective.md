# Phase 18 — Retrospective

> **Frontmatter fidelity**, released as **v0.15.0**. engram reads the frontmatter
> Obsidian actually writes, and a line it cannot read never costs a note its identity.
>
> Fixes **BUG-011 (P0)**, reported from real use against v0.14.0.

## What shipped

| | |
|---|---|
| The subset | Stated in `src/format/subset.ts` as data — 24 guaranteed constructs, 5 named refusals — and iterated by the tests, so a construct cannot be claimed without being exercised |
| Blast radius | Per key, never per document. An unreadable line costs you that line |
| The two missing families | Block sequences (indented, unindented, single-item, bare-dash) and block scalars (`\|`, `>`, chomping) |
| Style | Recorded on read, given back on write. engram and Obsidian stop undoing each other |
| Policy | Notes recover · `guardrails.md` fails closed · skills reject |
| `doctor` | `[frontmatter]` names the line and what engram reads instead; `[identity-lost]` fires only when path-as-identity was *caused by* a parse failure |
| `upgrade` | Reports and rewrites nothing — the files were always valid YAML |
| Docs | The workaround this bug forced people to write is explicitly retracted |

[ADR-0047](../../decisions/0047-the-frontmatter-subset.md).

## What the phase actually taught

### The defect was the missing promise, not the missing constructs

The subset had been implicit since Phase 8. Nothing stated what engram promised to
read, so nothing could be tested against the promise, and a gap this size stayed
invisible for ten releases. `registry.ts` even justified itself with "OKF frontmatter
is flat by design (ADR-0020)" — ADR-0020 says nothing of the kind, and no ADR does.
The parser was built around an unwritten rule and diverged from it unobserved.

Writing the rule down as *data the tests iterate* found four more defects within an
hour of it existing. That is the argument for §1, made by §1.

### Stating a promise is what makes it checkable

ADR-0047 claimed excluded constructs are "warned about by name". Writing the test that
asserts it showed four of five were not warned about at all: `&anchor value`, `*anchor`
and `!!timestamp …` each parsed cleanly as their **literal string**, which is worse
than a refusal because nothing warns and the value is quietly wrong. Worst was nesting
beyond one level, which **silently flattened** a depth-3 key into depth 2 — the same
silent hoist a Phase 17 comment says it was added to prevent, reproduced one level
deeper.

None of these were in the bug report. None would have been found by fixing block
sequences.

### The report's scope estimate was too broad, and measuring mattered

It predicted the line-based parser would also fail on quoted values containing colons
and on nested maps. Probing 16 constructs first showed both already passed. That
turned "replace the parser, take a YAML dependency" into "add two constructs and one
recovery rule" — and a dependency would have been the wrong call for a package the
Obsidian plugin bundles and runs on mobile.

Estimating the gap would have produced a much larger and worse phase.

### Splitting the identity fix from the parser fix was the right call

Group 1 ended the identity loss while block sequences were *still unreadable*. Its
tests deliberately use only content engram cannot parse, so they assert blast radius
rather than coverage — which means a construct invented tomorrow cannot reopen BUG-011.
When Group 2 landed, three of those tests started failing because their fixture had
become readable. That is the tests noticing the fixture changed meaning, which is what
they are for.

### The same quiet-lie shape appeared three times

A failed block left `part-of: {}`. Then, with deep nesting refused, it left
`a: {b: null}`. Both look complete, warn about nothing downstream, and are worse than
an absent key. And in `doctor`, `[path-as-identity]` on a note that never had an `id`
would have read as the same defect as one that lost it. Each time the fix was the
same: say the true thing, or say nothing — never a plausible wrong thing.

### The smoke caught the phase's own conflation

`smoke-obsidian.mjs` first asserted no note is reduced to path-as-identity, and failed
on a tldraw note that has no `id` at all — correct ADR-0021 behaviour, not the bug.
The test written to prove T5.2 works made exactly the mistake T5.2 exists to prevent.

## Verification Evidence

Every claim below was produced by running the command in this session and reading its
output. Where something is not verified, it is listed at the end as not verified.

### `npm run check` — exit 0

```
Test Files  50 passed (50)
     Tests  883 passed (883)
CLI smoke passed — the built binary works as installed.
plugin smoke passed — loading and wiring verified.
skills smoke passed — the rendered skill surface is what a person would see.
obsidian smoke passed — the frontmatter a real editor writes reads correctly.
```

### BUG-011, on the built binary, using the reporter's file verbatim

| | before (v0.14.0) | after |
|---|---|---|
| `node.id` | `/3-resources/finance/finance-glossary.md` | `finance-glossary` |
| `author` | `unknown` | `avinash` |
| `timestamp` | `1970-01-01T00:00:00.000Z` | `2026-08-23T20:28:29.392Z` |
| edges | none | `part-of → finance` |
| codec | okf **0.1** — the file declares 0.2 | okf 0.2 |

`engram doctor` on that vault reports `nodes: 2   edges: 1` with no parse warning, no
`[path-as-identity]` and no `[identity-lost]`.

### Style is given back, not imposed

After `engram link` touched the file:

```yaml
part-of:
  - finance
```

Still block. Byte-identical over two read→write cycles, asserted in
`round-trip.test.ts`.

### The original probe, re-run

All **16** constructs from the pre-phase measurement now pass; 6 had failed. The probe
is permanent as `SUBSET`, now 24 entries, iterated by `yaml.test.ts`.

### Every new check verified by breaking the code it guards

| Reverted | What failed |
|---|---|
| The block-sequence branch | 21 tests, plus 3 assertions in `smoke-obsidian` |
| Style preservation in the codec | 2 round-trip assertions |
| Per-key recovery → per-document | 8 of 13 recovery tests, including all four identity assertions |

### The exclusions now name themselves

```
anchor        base: engram does not read a YAML anchor; this key was skipped
alias         ref:  engram does not read a YAML alias; this key was skipped
tag           when: engram does not read a YAML tag; this key was skipped
complex key   ? [a, b]: engram does not read a YAML complex key; skipped
deep nesting  a: engram reads one level of nesting; `c` is deeper and was skipped
```

`id: x` survives all five. Before this phase, the first three parsed silently as their
literal string and the last silently flattened.

### Guardrails fail closed

`engram/guardrails.md` with one unreadable line applies `DEFAULTS` — every rule on —
and says `this file was NOT applied`. Asserted including the case where the readable
half (`enabled: []`) would have been *more* permissive than the defaults.

### Acceptance criteria

| # | Criterion | Evidence |
|---|---|---|
| 1 | `npm run check` green incl. `smoke-obsidian` | above |
| 2 | Reporter's file identical in flow and block | `recovery.test.ts`, and on the binary |
| 3 | One bad key, everything else survives, key named | `recovery.test.ts` |
| 4 | Block style survives engram touching the file | `smoke-obsidian`, and on the binary |
| 5 | Guardrails fail closed, loudly | `recovery-policy.test.ts` |
| 6 | Test per guaranteed construct and per exclusion | `yaml.test.ts`, iterating `SUBSET`/`EXCLUDED` |
| 7 | `doctor` prints what to do | `doctor-remedy.test.ts` |
| 8 | Docs retract the workaround | `using-engram.md`, `obsidian-setup.md` |

### Not verified

**Obsidian itself was not run.** The corpus is the frontmatter Obsidian produced,
captured from a real vault and used verbatim, but no assertion in this phase watched
Obsidian write a file. What is verified is that engram reads what it wrote and writes
back the same shape.

**Chomping is deliberately partial.** engram clips trailing newlines in every case, so
`|` and `|-` agree. OKF has no field where a trailing blank line carries meaning;
ADR-0047 states the simplification rather than implying a precision that is not there.

**BUG-013 found and not fixed.** `engram link` appends an edge that already exists,
giving `part-of: [b, b]`. Present since Phase 8, reproduces in flow form too — block
style merely renders it where a bracket had hidden it. Filed; out of scope here.
