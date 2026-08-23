# Phase 18 — Tasks

> Order: Group 0 → 1 → 2 → (3 + 4) → 5 → 6
> Mark `[x]` only after a verification command produced passing output **this session** (Rule 12).

## Group 0 — Say what the subset is
- [x] T0.1 ADR-0047
- [x] T0.2 `SUBSET` — one documented table, tests iterate it
- [x] T0.3 `keyErrors` + per-key `style` on `ParsedFrontmatter`

## Group 1 — A bad line costs you that line  ← the P0 fix
- [x] T1.1 Per-key failures, no first-error throw
- [x] T1.2 `frontmatter: null` only when wholly unreadable
- [x] T1.3 Correct codec on a partial parse
- [x] T1.4 One warning per failing key, named
- [x] T1.5 Regression test from the report verbatim

## Group 2 — The two missing families
- [x] T2.1 Block sequences — indented, unindented, single-item, empty
- [x] T2.2 Block scalars `|` `>` with chomping
- [x] T2.3 Style recorded per key
- [x] T2.4 A test per `SUBSET` construct; a warning test per exclusion

## Group 3 — Preserve arrival style
- [x] T3.1 Codecs emit the style that arrived
- [x] T3.2 Flow stays the default for new notes
- [x] T3.3 Round-trip byte-identical, both styles

## Group 4 — Per-consumer policy
- [x] T4.1 Notes + queue recover
- [x] T4.2 `guardrails.md` fails closed
- [x] T4.3 Skills reject, unchanged
- [x] T4.4 A named policy test per consumer

## Group 5 — Name the remedy
- [x] T5.1 `doctor` says what to do
- [x] T5.2 Detective: path-as-identity *caused by* a parse failure
- [x] T5.3 `upgrade` reports, does not rewrite

## Group 6 — Verification
- [x] T6.1 `scripts/smoke-obsidian.mjs` in `npm run check`
- [x] T6.2 The 16-construct probe as a permanent test
- [x] T6.3 Revert-and-fail both
- [x] T6.4 `docs/using-engram.md`
- [x] T6.5 Retract the workaround — docs + release notes
