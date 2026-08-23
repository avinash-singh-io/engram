# 0047 — State the frontmatter subset, and degrade per key

> **Status**: accepted
> **Date**: 2026-08-23
> **Deciders**: Avinash Kumar Singh
> **Fixes**: BUG-011 (P0)
> **Relates to**: [ADR-0021](0021-identity-slug-path-aliases.md) — the identity this
> protects — and [ADR-0026](0026-validation-gates-promotion.md), whose
> validation-gates-promotion posture this extends to reading.

## Context

engram does not use a YAML library. `parseSimpleYaml` in `src/format/registry.ts`
walks the frontmatter line by line, splits each line on the first `:`, and parses the
right-hand side. That was a deliberate choice — zero runtime dependencies, for a
format ADR-0020 keeps deliberately small — and it has been correct for every file
engram itself writes.

It is not correct for the files engram is asked to read.

**Obsidian's Properties panel rewrites frontmatter.** Edit any property in its UI and
`part-of: [finance]` becomes:

```yaml
part-of:
  - finance
```

Both are valid YAML. engram accepts the first and throws on the second, because a
sequence item is not a `key: value` pair and the loop has no way to represent one.

Three things then happen, and only the first was visible in the error message:

1. The throw is caught and `parseFrontmatter` returns `frontmatter: null` **for the
   whole document**. Both codecs open with `parsed.frontmatter ?? {}`, so one
   unreadable line discards every readable one.
2. `detectVersion(null)` falls back to `DEFAULT_VERSION` — okf 0.1, which has no
   closed relations *by construction*. A file declaring `okf_version: 0.2` is read by
   the wrong codec, losing its edges a second time by a second mechanism.
3. With `id` gone, `makeNode` falls back to `id: path`. Per ADR-0021 that is
   path-as-identity: the note's identity is now its location, so moving it breaks
   every relation pointing at it.

Measured on the reporting user's file:

| | flow | block, after one Properties edit |
|---|---|---|
| `id` | `finance-glossary` | `/3-resources/finance/finance-glossary.md` |
| `author` | `avinash` | `unknown` |
| `timestamp` | `2026-08-23T20:28:29.392Z` | `1970-01-01T00:00:00.000Z` |
| edges | `part-of → finance` | none |

That last row is the one that matters. **A cosmetic edit in the editor engram is
built to sit beside silently converted a stable identity into a fragile one**, and
reported it as a formatting warning. ADR-0020 forbids engram from inventing time or
provenance; substituting `unknown` and the epoch is precisely that, done by accident.

Present since Phase 8, so it has shipped in every v2 release.

### The deeper problem is that nothing was ever written down

The subset has been implicit since it was written. Nothing stated what engram
promised to read, so nothing could be tested against the promise, and a gap this size
stayed invisible for ten releases. `registry.ts` even cites ADR-0020 for "OKF
frontmatter is flat by design" — ADR-0020 says nothing of the kind. The parser was
built around an unwritten rule and then diverged from it unobserved.

That is the actual defect. The missing constructs are a symptom.

## Options Considered

### Delivery of correctness

**Adopt a YAML library.** Correct, complete, maintained. But zero runtime
dependencies is load-bearing rather than aesthetic here: the Obsidian plugin bundles
engram and runs on **mobile**, where bundle size is a real constraint, and every
dependency is supply-chain surface for a tool whose whole pitch is that your notes
are plain files you own on your own disk.

**Extend the subset, and state it.** Smaller, and testable against a written promise.

The choice turns on how big the gap actually is. It was measured rather than
estimated — 16 constructs probed against the shipped parser:

```
FAIL  block sequence — indented, unindented, single-item
FAIL  block scalars  |  and  >

PASS  quoted scalar containing a colon      PASS  nested map
PASS  unquoted scalar containing a colon    PASS  empty property, comments
PASS  empty flow sequence                   PASS  booleans, dates
```

The bug report predicted quoted colons and nested maps would fail too. They do not.
**The gap is two families, not a general parsing failure** — which is the difference
between replacing the parser and extending it.

### Blast radius of a failure

**Per document.** What ships today. One bad line costs every good one.

**Per key.** A line engram cannot read costs you that line.

### Response to content outside the subset

**Refuse the write.** Safest against silent loss; makes engram the gatekeeper of a
file it does not own.

**Warn and keep going.** Consistent with ADR-0026 — validation gates promotion, never
capture — and with the product's premise.

## Decision

### 1. The subset is stated, exported, and tested against

`SUBSET` in `src/format/subset.ts` is a documented table of every construct engram
guarantees to read. The parser tests iterate that table, so **a construct cannot be
claimed without a test, and cannot be tested without being claimed.** Everything
outside it has a test asserting a named warning.

Guaranteed: scalars (plain, single- and double-quoted, including colons), booleans,
nulls, dates-as-strings, flow sequences, flow maps, block sequences (indented,
unindented, single-item, empty), block scalars `|` and `>` with `-`/`+` chomping, one
level of nested mapping, comments, blank lines, CRLF, and a leading BOM.

Explicitly **not** guaranteed, and warned about by name: anchors and aliases, tags,
multi-document streams, complex keys, and nesting beyond one level.

### 2. Degrade per key, never per document

An unreadable line omits **that key** and records a `keyError` naming it. The
document is `frontmatter: null` only when it is wholly unreadable — an unterminated
block, or nothing parsed at all.

This is the fix, and it is deliberately independent of which constructs the parser
knows. Even against a construct invented tomorrow, `id` survives. **Losing identity is
a data-integrity event and must never be the default response to a formatting
variation.**

It also fixes `detectVersion` as a consequence rather than as a separate change: a
partially parsed mapping still carries `okf_version`, so the right codec reads it.

### 3. Warn and keep going

Outside the subset, engram warns and continues. Refusing the write would make engram
the gatekeeper of a file it does not own, and ADR-0026 already settled the shape of
this question in the other direction — validation gates promotion, never capture.

The safety that refusal would have bought is recovered by decision 2. Warn-and-continue
is only tolerable **because** the failure is per key; the two decisions are a pair and
neither is sound alone.

### 4. Recovery policy is per consumer

`parseFrontmatter` has four callers and they do not want the same thing.

| Consumer | Policy | Why |
|---|---|---|
| Notes, approval queue | **Recover**, warn per key | The whole point. A note's identity must outlive a formatting change |
| `guardrails.md` | **Fail closed** to `DEFAULTS` | A security config that half-parses could yield a **looser** configuration than its author wrote. The safe direction is every rule on |
| Skills | **Reject**, unchanged | A skill that half-loads is a capability the agent believes it has and does not |

Each policy is asserted by a test naming it, so the asymmetry is deliberate rather
than incidental. This is the one place "warn and keep going" is the wrong answer, and
it is worth the inconsistency to say so.

### 5. Preserve the style a file arrived in

Sequence style is recorded per key on read and re-emitted on write. Flow stays the
default for notes engram creates.

Without this, engram would rewrite block back to flow and Obsidian would re-normalise
on the next property edit — the two tools undoing each other forever, in a directory
that is usually also a git repository. Round-tripping a user's file into a style they
did not choose is its own kind of damage, separate from the data loss.

## Consequences

- **The Properties panel becomes safe.** The editor engram is designed to sit beside
  stops being the thing that breaks it.
- **A user-visible workaround is retracted.** This bug was live long enough that the
  reporting user wrote "do not edit properties in Obsidian" into their own vault
  conventions. A prohibition in someone's knowledge base outlives the defect that
  caused it, so the fix is not complete until the docs say it is false.
- **The subset can now drift only visibly.** A construct that stops parsing fails a
  test that names it.
- **engram still cannot read all YAML**, and now says so precisely instead of failing
  at it vaguely. Anchors, aliases, tags and multi-document streams are named
  exclusions rather than surprises.
- **One inconsistency is deliberate**: guardrails fail closed while everything else
  recovers. A reader who finds that surprising should find this section.
