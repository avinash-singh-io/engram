# Phase 18 — Frontmatter fidelity

> **Goal**: engram reads the frontmatter Obsidian actually writes, and a line it
> cannot read never costs a note its identity.
>
> **Target release**: v0.15.0
> **Branch**: `phase-18-frontmatter-fidelity`
> **Fixes**: BUG-011 (P0)

## The bug, measured

engram's frontmatter subset accepts flow sequences (`part-of: [a, b]`) and not block
sequences. Obsidian's Properties panel rewrites the first into the second the moment
you edit any property — in the editor engram is explicitly built to sit beside.

Reproduced on v0.14.0 against the reporter's file:

| | flow | block, after one Properties edit |
|---|---|---|
| `node.id` | `finance-glossary` | `/3-resources/finance/finance-glossary.md` |
| `author` | `avinash` | `unknown` |
| `timestamp` | `2026-08-23T20:28:29.392Z` | `1970-01-01T00:00:00.000Z` |
| edges | `part-of → finance` | none |
| codec | okf 0.2 | **okf 0.1** — the file declares 0.2 |

Per [ADR-0021](../../decisions/0021-identity-slug-path-aliases.md) slug is identity
and path is address. Losing `id` falls the note back to path-as-identity, so moving
it breaks every relation pointing at it. **A cosmetic edit silently converted a
stable identity into a fragile one**, reported as a formatting warning.

Present since Phase 8 (`a78b260`), so it has shipped in every v2 release.

## Four defects, not one

1. **The parser cannot represent a sequence item.** It splits each line on the first
   `:`; `  - finance` has none, so it throws.
2. **Failure is total, not local.** `parseFrontmatter` returns `frontmatter: null` for
   the whole document and both codecs do `parsed.frontmatter ?? {}`. One bad line
   discards every good one.
3. **The wrong codec is then selected.** `detectVersion(null)` falls back to okf 0.1,
   which has no closed relations by construction — edges are lost a second time, by a
   different mechanism. This was not in the bug report.
4. **`write` always emits flow.** Even with reading fixed, engram would rewrite block
   back to flow and Obsidian would re-normalise on the next edit — a churn loop in a
   directory that is also a git repo.

## Measured scope

16 constructs probed against the shipped parser. The gap is two families, not the
whole parser:

```
FAIL  block sequence — indented, unindented, single-item
FAIL  block scalars  |  and  >

PASS  quoted scalar containing a colon      PASS  nested map (skills metadata)
PASS  unquoted scalar containing a colon    PASS  empty property, comments
PASS  empty flow sequence                   PASS  booleans, dates
```

The bug report predicted quoted colons and nested maps would also fail. They don't.
That narrows this from "replace the parser" to "the parser is missing two constructs
and one recovery rule".

## Key decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Warn and keep going** outside the subset | Owner's call. Consistent with ADR-0026 — capture never rejects — and with a tool whose premise is that your files are yours. Refusing the write would make engram the gatekeeper of a file it does not own |
| 2 | **Degrade per key, never per document** | The data-integrity fix, and independent of which constructs the parser knows. A line engram cannot read costs you that line |
| 3 | **Keep the subset; no YAML dependency** | Zero runtime dependencies is load-bearing — the Obsidian plugin bundles engram and runs on mobile. But the subset stops being implicit: ADR-0047 states what is guaranteed, and the parser is tested against that statement |
| 4 | **Preserve the style a file arrived in** | Read block, write block. Round-tripping a user's file into a different style is its own damage and causes needless git churn |
| 5 | **Recovery policy is per consumer** | Notes recover what parsed. `guardrails.md` **fails closed** to defaults — a security config that half-parses must never permit more than its author wrote. Skills still reject loudly |

## In scope

- Block sequences: indented, unindented, single-item, empty
- Block scalars `|` and `>`, including the common `|-` / `>-` chomping indicators
- Per-key recovery, with the failing key named in the warning
- Correct codec selection when frontmatter partially parses
- Style recorded on read and preserved on write
- Per-consumer recovery policy
- `doctor` names the remedy, not just the symptom
- ADR-0047 — the guaranteed subset and what happens outside it
- Retracting the workaround this bug forced users to adopt

## Out of scope

- **A YAML dependency.** Decision 3
- **Full YAML 1.2** — anchors, aliases, tags, multi-document streams, complex keys.
  Named as out of subset in ADR-0047 rather than left ambiguous
- **Rewriting anyone's frontmatter to a preferred style.** Decision 4 is the opposite
- **Changing OKF.** The format is unchanged; this is about reading it faithfully
- **Surfacing user-authored filing conventions to agents.** Real gap, found while
  scoping this phase, filed as TD-008. Different subsystem, different ADR, and folding
  it in would delay a P0

## Deliverables

| Deliverable | Verification |
|---|---|
| Block sequences parse, all four shapes | `npm test -- yaml` |
| Block scalars parse | `npm test -- yaml` |
| Per-key recovery, failing key named | `npm test -- recovery` |
| `id`/`author`/`timestamp`/edges survive a bad line | `npm test -- recovery` |
| Correct codec on partial parse | `npm test -- registry` |
| Style preserved read → write → read | `npm test -- round-trip` |
| `guardrails.md` fails closed | `npm test -- config` |
| `doctor` names the remedy | `npm test -- doctor` |
| The reporter's exact file | `node scripts/smoke-obsidian.mjs` |
| Whole suite + four smokes | `npm run check` |

## Acceptance criteria

1. `npm run check` green, including a new `smoke-obsidian` over an Obsidian-normalised corpus
2. The reporter's file reads identically in flow and block form — `id`, `author`, `timestamp`, and the `part-of` edge all present
3. A note with one unparseable key keeps every other key, and the warning names that key
4. A file that arrives in block style is still block style after `engram format` touches it
5. `guardrails.md` with an unparseable line applies defaults and says so loudly — never a looser config than written
6. Every construct ADR-0047 guarantees has a round-trip test; every construct it excludes has a test asserting the warning
7. `engram doctor` on an affected vault prints what to do, not only what broke
8. The docs state the Properties panel is safe again, so users can delete the workaround this bug forced them to write
