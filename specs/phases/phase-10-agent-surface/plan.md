# Phase 10 — Implementation Plan

```
Sequential: Group 0 → Group 1 → (Groups 2 + 3 in parallel) → Group 4 → Group 5 → Group 6 → Group 7
```

**TDD stays on** (Rule 13). `format` is deterministic and the guardrails are pure
predicates over a proposed change, so this is the cheap case again.

## Reference specs (constitutional — read, never edit; Rule 10)

[`v2-overview.md`](../../architecture/v2-overview.md) §4 the seven operations,
§5 the write gate, §7 guardrails (preventive vs detective), §11 surfaces ·
ADR-0019 primitives · ADR-0022 relations · ADR-0026 validation gates promotion ·
ADR-0027 write-time extraction · ADR-0031 evidence gates · ADR-0033 format takes
content · ADR-0034 engram never transmits.

---

## Group 0 — Lock `gate2-v1` (Rule 11)

**Sequential. Blocks everything.**

ADR-0031 left Gate 2's threshold unfixed. This closes that before a single edge is
seen, because a threshold chosen after the numbers is not a threshold.

- Write **ADR-0040** — Gate 2 thresholds and protocol.
- `tests/benchmarks/gate2-v1/rubric.md` — what counts as a **directionality** error
  versus a **predicate** error, with worked examples in both directions.
- `tests/benchmarks/gate2-v1/protocol.md` — corpus definition, sample size (~50),
  blind adjudication, κ floor, and the two-bar decision rule.
- Extend the freeze test to cover `gate2-v*` alongside `gate1-v*`.

*Commit:* `docs(specs): ADR-0040 + lock gate2-v1 evaluator`

---

## Group 1 — `format(content, hints)`

**Sequential.** Depends on Group 0.

> **Engram does not extract.** ADR-0034 forbids network calls, so the agent supplies
> the structure it already knows (ADR-0019) and engram does the deterministic half.
> There is no extractor in `src/`.

- `hints` carries what the agent decided: title, container, `supersedes`, `sources`,
  path, and who is asserting.
- Slug from title; path from container. **Same input → same output**, tested.
- `generated: { by, at }` stamped on every agent-authored assertion — this is what
  makes agent relations filterable and auditable (ADR-0027 mitigation 2).
- Returns a **proposed change**; the gate decides. `format` never writes directly.
- A rejection always names the rule. Anything unparseable belongs in `capture`,
  which cannot reject (ADR-0026).

*Commit:* `feat(ops): format — content plus agent structure to validated nodes`

---

## Group 2 — Guardrails, preventive at the gate

**Parallel with Group 3.** Depends on Group 1.

| Rule | Failure it prevents |
|---|---|
| `no-delete` | losing the record of what you used to believe |
| `require-sources` | an unauditable synthesis claim you act on months later |
| `no-supersede-verified` | an agent overruling a human judgement silently |
| `propose-only` (scoped) | autonomous writes where stakes are highest |
| `path-scope` | an agent reorganising things it should not touch |
| `rate-limit` | a large, well-formatted pile you never reviewed |

Guardrails are declarative and loaded from the vault. **A guardrail may tighten but
never loosen** — asserted by test, because that is what bounds the blast radius of a
careless or downloaded skill in Phase 15.

*Commit:* `feat(policy): preventive guardrails at the write gate`

---

## Group 3 — The same rules' detective forms

**Parallel with Group 2.** Depends on Group 1.

Every rule above gets the `doctor` check that finds violations **however they
happened** — including the Obsidian and shell write paths the gate never sees.
Registered the same way relations are, so a rule cannot ship preventive-only.

*Commit:* `feat(ops): detective guardrail checks in doctor`

---

## Group 4 — `AGENTS.md` as the entry contract

**Sequential.** Depends on Groups 2 and 3.

Generated, not hand-written: names the operations, the guardrails **actually in
force**, and the closed relation set read from the registry. A contract that drifts
from the code is worse than none, so it is derived from both.

*Commit:* `feat(surface): generate AGENTS.md entry contract`

---

## Group 5 — CLI wiring and e2e

**Sequential.**

`engram format`, joining `init`, `capture`, `link`, `reindex`, `doctor`. e2e on a
real temp vault, plus a built-binary smoke test.

*Commit:* `feat(cli): format command`

---

## Group 6 — Gate 2 measurement

**Sequential.** Depends on Group 5.

- Build the corpus: format a set of existing notes so the edges are **real agent
  output**. Only the trigger is synthetic, and the report says so.
- Sample ~50 edges per the locked protocol.
- Classify directionality and predicate accuracy.
- Blind human adjudication; report **refuses a verdict** without it.
- Apply the two-bar rule. Below either → stop at nodes plus untyped links.

*Commit:* `chore(gate2): edge accuracy measurement and report`

---

## Group 7 — Verification

**Sequential.**

Full `npm run check`; the acceptance sweep; a deliberate import violation to
re-prove the architecture rules; a guardrail-tightening test; a built-binary smoke
test. Capture output for `retrospective.md` § Verification Evidence (Rule 12).

*Commit:* `test(policy): phase 10 acceptance verification`
