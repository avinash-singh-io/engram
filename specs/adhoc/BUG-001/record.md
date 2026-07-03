# Ad-hoc Work Record: BUG-001

> **Type**: quick-task
> **Created**: 2026-07-04
> **Branch**: fix/BUG-001-link-encoding
> **Backlog**: BUG-001
> **Status**: in-progress

> **Rule 14 note**: touches ~9 production files and changes engram's on-disk
> link output — both are escalation triggers. Kept as a quick-task by explicit
> user decision: one cohesive conformance bugfix implementing existing ADR-0003
> (standard markdown links) + CommonMark §6.3, no new design decision, no
> `specs/architecture/` change. Reported externally against engram 0.6.4.

## Current Behavior

Every link emitter serializes a raw filesystem path straight into the `(…)`
markdown destination. When a concept filename contains a space (or other
CommonMark delimiter), the emitted destination violates CommonMark §6.3 ("a
link destination not wrapped in `<…>` does not include … space"):

```
* [My Spaced Title](/demo/My Spaced Title.md) - one line
```

Reproduced with engram's own read-side regexes:

- `src/format/links.ts` `MD_LINK_RE` parses the target as `undefined` (stops
  at the first space).
- `src/retrieval/index-parse.ts` `BULLET_RE` does not match the bullet **at
  all** → the spaced concept is silently dropped from engram's own index
  parse, so `recall`/navigate lose the node.
- Obsidian graph / GitHub render the link as broken (isolated node).

Emit sites: `indexer/generate.ts` (×2), `vault/log.ts`, `commands/link.ts`,
`commands/recall.ts`, `promote/to-concept.ts` (×2), `promote/promote.ts`,
`migrate/links.ts`. `doctor` reports 0 errors regardless (out of scope here).

## Expected Behavior

Emitted destinations are valid CommonMark destinations: each path segment is
percent-encoded (space → `%20`, `(` → `%28`, `)` → `%29`, control chars),
`/` preserved, `#fragment` encoded separately from the path. The transform is
idempotent (decode→encode; never double-encodes `%20` → `%2520`).

Read/match sites percent-decode the destination before comparing it to a file
path, so engram's own resolution/dedup keeps working and legacy raw-space
links still resolve where the regex can still capture them. Round-trip holds:
`decode(encode(path)) === path` for the report's test matrix.

New `index.md` / `log.md` self-heal on the next `reindex`.

## Unchanged Behavior

- No-space paths emit byte-identical to today (idempotent; `indexer` output
  stays deterministic — the ADR-0006 byte-identical guarantee).
- External URLs (`http(s)://…`) are never touched.
- Already-`%20`-encoded inputs are not re-encoded (no double-encode).
- Link *text* (the `[…]` label) is unchanged — only the `(…)` destination.
- Out of scope (not this quick-task): `doctor` link-resolution check and a
  legacy in-body `--rewrite-links` migration.

## Verification Evidence

Fresh, this session (2026-07-04) on branch `fix/BUG-001-link-encoding`.

**1. Full gate — `npm run check` (typecheck + lint + format:check + test + build): PASS**

```
> tsc --noEmit                      # ok
> eslint src tests                  # ok
> prettier --check .                # All matched files use Prettier code style!
> vitest run
  Test Files  36 passed (36)
       Tests  212 passed (212)      # incl. 19 new in tests/format/links.test.ts
> tsup                              # ⚡️ Build success (dist/cli.js, dist/index.js)
```

**2. New unit + integration tests — `tests/format/links.test.ts` (19 tests): PASS**
Covers the report's test matrix (space→`%20`; `&`/`+`/`—` preserved), balanced
parens (`(`→`%28`), literal `%`→`%25`, tab/control chars, per-segment `/`
preservation, path+`#fragment` encoded separately, external-URL passthrough,
no-double-encode, `encode∘encode` idempotency, `decode∘encode === id`
round-trip, `extractMarkdownLinks` decoding, and the exact reproduced failure:
`generateIndex → parseIndex` recovers `/demo/My Spaced Title.md` (previously
dropped entirely by `BULLET_RE`).

**3. CLI smoke (built `dist/cli.js`) — reproduced the report's scenario: PASS**

```
$ engram init . ; engram capture … ; \
  engram refine <inbox> --type Concept --title "My Spaced Title" \
    --description "…" --tags demo --to "demo/My Spaced Title.md" ; \
  engram reindex

# demo/index.md
* [My Spaced Title](/demo/My%20Spaced%20Title.md) - One sentence about spaced titles.
# log.md
- **Added** [My Spaced Title](/demo/My%20Spaced%20Title.md)
# raw-space destinations anywhere:  NONE

$ engram recall "spaced title"
1. [My Spaced Title](/demo/My%20Spaced%20Title.md)      # found (was dropped pre-fix)

$ engram doctor .
  findings: 0 error(s), 1 warning(s)                     # warning unrelated (body-no-headings)
  engram: vault healthy                                  # index fresh; concept indexed
```

**Scope note:** legacy raw-space links already written to disk self-heal only
for `index.md`/`log.md` (regenerated on `reindex`). Pre-existing in-body links
(See-also / promoted bodies) remain raw until rewritten — deferred (see
BUG-001 backlog Detail; the doctor link-resolution check + `--rewrite-links`
migration were the two out-of-scope "Secondary" items).
