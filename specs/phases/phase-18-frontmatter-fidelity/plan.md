# Phase 18 — Implementation plan

# Execution order:
# Group 0 → Group 1 → Group 2 → (Groups 3 + 4 in parallel) → Group 5 → Group 6

## Reference specs (Rule 10)

Read as a **stable reference** during implementation. Gaps are logged as
`[ARCH_CHANGE]` in `history.md` and reconciled at `/sync-docs`, never edited mid-phase.

| Spec | Why |
|---|---|
| [ADR-0020](../../decisions/0020-adopt-okf-v02.md) | The format whose fields this parses, and its rule against inventing time or provenance — which is exactly what the current failure does when it substitutes `unknown` and the epoch |
| [ADR-0021](../../decisions/0021-identity-slug-path-aliases.md) | Slug is identity, path is address. Decision 2 exists to protect this |
| [ADR-0022](../../decisions/0022-relations-in-frontmatter.md) | Why relations live in frontmatter as lists at all — the construct Obsidian rewrites |
| [ADR-0026](../../decisions/0026-validation-gates-promotion.md) | "Validation gates promotion, never capture" — why warn-and-continue is the consistent answer |
| [ADR-0032](../../decisions/0032-internal-model-versioned-codecs.md) | The codec registry the recovery must not bypass, and the reason a wrong `detectVersion` is a correctness bug rather than a cosmetic one |

**Note.** `registry.ts` asserts "OKF frontmatter is flat by design (ADR-0020)" and
ADR-0020 says no such thing. No ADR states the flatness the parser was built around —
which is the same gap this phase closes for the subset. ADR-0047 states both.

Widening the subset is *additive*. Per-key recovery and the guardrails fail-closed
rule are *decisional* — ADR-0047 lands first, as T0.1.

---

## Group 0 — Say what the subset is

**Sequential. Blocks everything.**

The subset has been implicit since Phase 8, which is how a gap this size stayed
invisible: nothing stated what engram promised to read, so nothing could be tested
against the promise.

- **T0.1** ADR-0047 — the guaranteed subset, warn-and-keep-going, per-key recovery,
  and per-consumer policy. Records that a YAML dependency was considered and refused,
  with the bundle/mobile reason.
- **T0.2** `SUBSET` — one exported, documented table of the constructs engram
  guarantees. Tests iterate it, so a construct cannot be claimed without a test.
- **T0.3** `ParsedFrontmatter` gains `keyErrors: {key, line, reason}[]` and
  `style: 'flow' | 'block'` per sequence key. `yamlError` stays for the
  whole-document case so existing callers keep compiling.

Commit: `docs(specs): ADR-0047 — the frontmatter subset engram guarantees`

---

## Group 1 — A bad line costs you that line

**Sequential. The P0 fix. Depends on Group 0.**

Deliberately first and deliberately independent of Group 2: even if the parser never
learned another construct, this alone ends the identity loss.

- **T1.1** `parseSimpleYaml` collects per-key failures instead of throwing on the
  first. Unreadable keys are omitted from the mapping and recorded in `keyErrors`.
- **T1.2** A document is `frontmatter: null` only when it is *entirely* unreadable —
  an unterminated block, or nothing parsed at all.
- **T1.3** `detectVersion` now sees a partially parsed mapping, so a file declaring
  `okf_version: 0.2` is read by the 0.2 codec even when another key failed.
- **T1.4** `readNode` surfaces `keyErrors` as one warning per key, naming it.
- **T1.5** Regression test from the report verbatim: block-sequence input keeps `id`,
  `author`, `timestamp` and the `part-of` edge.

Commit: `fix(format): a line engram cannot read no longer costs a note its identity`

---

## Group 2 — Teach the parser the two missing families

**Sequential. Depends on Group 1.**

- **T2.1** Block sequences. The empty-value look-ahead currently commits to *nested
  map* the moment the next line is indented; it must first ask whether that line is a
  sequence item. Covers indented, unindented, single-item, and empty.
- **T2.2** Block scalars `|` and `>`, with `-`/`+` chomping. Folded joins on spaces,
  literal preserves newlines.
- **T2.3** Sequence style recorded per key as parsed — the input to Group 3.
- **T2.4** Every construct in `SUBSET` has a parse test; everything outside it has a
  test asserting a named warning and survival of the rest.

Commit: `feat(format): block sequences and block scalars, the two forms Obsidian writes`

---

## Group 3 — Write back the style that arrived

**Parallel with Group 4. Depends on Group 2.**

- **T3.1** Both codecs take the style map and emit block where block arrived.
- **T3.2** Default stays flow for notes engram creates — unchanged for new files.
- **T3.3** Round-trip property: read → write → read is byte-identical for every
  `SUBSET` construct in both styles. This is the test that proves the churn loop closed.

Commit: `fix(format): preserve the sequence style a file arrived in`

---

## Group 4 — Recovery policy per consumer

**Parallel with Group 3. Depends on Group 1.**

Partial recovery is right for a note and wrong for a security config. Four consumers,
three policies.

- **T4.1** Notes and the approval queue: recover, warn per key.
- **T4.2** `guardrails.md`: **fail closed.** Any `keyErrors` and the whole file falls
  back to `DEFAULTS` with a loud warning. A half-parsed guardrail file must never
  yield a looser configuration than its author wrote.
- **T4.3** Skills: reject loudly, unchanged — a skill that half-loads is a capability
  the agent believes it has and does not.
- **T4.4** A test per consumer asserting its policy by name, so the difference is
  deliberate rather than incidental.

Commit: `fix(policy): recovery policy per consumer — guardrails fail closed`

---

## Group 5 — Say what to do about it

**Sequential. Depends on 3 and 4.**

- **T5.1** `doctor` names the remedy: which key, which construct, and that
  `engram format` will now round-trip it.
- **T5.2** A detective check for notes on path-as-identity *because* of a parse
  failure — distinct from notes that never had an `id`, which is a different problem
  with a different fix.
- **T5.3** `engram upgrade` reports affected files. It does **not** rewrite them:
  with Group 3 landed there is nothing to migrate, and rewriting a user's notes to fix
  a formatting variation engram now reads correctly would be gratuitous.

Commit: `feat(doctor): name the remedy for unreadable frontmatter, not just the symptom`

---

## Group 6 — Verification

**Sequential. Last.**

- **T6.1** `scripts/smoke-obsidian.mjs` — a corpus of Obsidian-normalised files
  including the reporter's exact frontmatter and the tldraw case, read through the
  **built binary**, asserting identity and edges survive.
- **T6.2** The 16-construct probe becomes a permanent table-driven test, so the
  measured gap cannot silently reopen.
- **T6.3** Revert-and-watch-it-fail for T6.1 and the round-trip property.
- **T6.4** `docs/using-engram.md`: what engram guarantees to read.
- **T6.5** **Retract the workaround.** This bug forced users to write "do not edit
  properties in Obsidian" into their own vault conventions. The docs must state the
  Properties panel is safe again, and the release notes must say the workaround can be
  deleted. A fix is not finished until the workaround it forced is retractable — a
  stale prohibition outlives the bug that caused it.

Commit: `test(format): smoke real Obsidian-normalised frontmatter end to end`
