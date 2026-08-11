# Phase 7 — Implementation Plan

```
Sequential: Group 0 → Group 1 → (Groups 2 + 3 in parallel) → Group 4 → [Group 5 only if unresolved]
```

Phase 7 writes **no product code**. Everything under `tools/` is a research
instrument, deleted once the gate is answered. The only durable artifacts are the
two ADRs, the locked evaluator, and the report.

---

## Group 0 — Lock the evaluator (Rule 11)

**Sequential. Blocks everything.**
External dependencies: none.

The evaluator is locked *before* the loop, not after. Nothing in this phase may
look at real data until this group is committed.

- Write **ADR-0037** — Gate 1 measurement protocol: retrospective corpus, the
  lower-bound asymmetry, three-way rubric, Wilson interval, three-branch decision
  rule, κ floor, contingency trigger.
- Write **ADR-0038** — intelligence deferred post-v1.0 as an indivisible system.
  ADR-0035 and ADR-0036 stay `accepted`; only scheduling changes.
- Author `tests/benchmarks/gate1-v1/rubric.md` with worked examples for all three
  labels. **The `not-a-kb-question` boundary is the most consequential line in
  this phase** — it sets the denominator.
- Hand-label `tests/benchmarks/gate1-v1/seed.jsonl` (~60 real questions). This is
  both ground truth and the rubric's worked examples.
- Write `tests/benchmarks/gate1-v1/protocol.md`: corpus definition, decision rule,
  κ floor, contingency trigger, and the per-root egress decision (which roots may
  be machine-classified, which are hand-labeled only).
- Add `tests/benchmarks/gate1-v1.freeze.test.ts` — manifest checksum over the
  locked directory; fails on any mutation.

*Commit:* `docs(specs): ADR-0037, ADR-0038 + lock gate1-v1 evaluator`

---

## Group 1 — Transcript reader

**Sequential.** Depends on Group 0.
External dependencies: stored agent transcripts on disk.

> **Task 1 is the phase's first gate.** Confirm a real transcript file parses and
> contains user prompt text. If it does not, **stop and re-plan** — Stage A
> collapses and the rest of this plan is void.

- Confirm transcript format on one real file.
- Enumerate roots; assign each an opaque id (no semantic naming).
- Extract prompts with timestamp, session id, opaque root id.
- Store nothing beyond what the rubric needs.

*Commit:* `chore(gate1): transcript reader`

---

## Group 2 — Classify and adjudicate

**Parallel with Group 3.** Depends on Group 1.

- Run the classifier over the corpus against the locked rubric.
- Blind hand-label a random 20% — machine labels not visible during labeling.
- Compute Cohen's κ.
- If κ is below the floor: hand-label everything, or re-version the rubric to
  `gate1-v2` and rerun. **Never edit `v1`** (Rule 11).

*Commit:* `chore(gate1): classification + adjudication run`

---

## Group 3 — Baseline harness

**Parallel with Group 2.** Depends on Group 1.

- Build the rg-over-markdown harness — the zero-cost competitor from ADR-0031.
- Run it against the structural questions found; score and record.

This number cannot be reconstructed later and Phase 11 is required to beat it.

*Commit:* `chore(gate1): grep baseline result`

---

## Group 4 — Report and decide

**Sequential.** Depends on Groups 2 and 3.

- Compute structural fraction, Wilson 95% CI, per-root slice.
- Apply the three-branch rule with **no post-hoc adjustment**.
- Write `retrospective.md`.
- Roadmap and status updates land here via `/sync-docs` at phase completion
  (Rule 9): Phases 12–13 move to a parked section, v1.0 defined after Phase 11 +
  Phase 14, and the roadmap's "Phase 7 blocks everything" line corrected — it is
  broader than ADR-0031, which gates "any graph work".

*Commit:* `docs(specs): Gate 1 report and decision`

---

## Group 5 — Contingency: wondered journal

**Fires only if Group 4 returns *unresolved*.**

No code. A plain text file, one line per question you wanted to ask but did not
bother asking, kept for a pre-declared window, then re-decided against the same
locked rule.

This is the only signal transcripts structurally cannot contain, and it is the
one instrument that costs nothing to build — which is why parking the observation
system (ADR-0038) does not block it.

*Commit:* `docs(specs): Gate 1 wondered-journal result`
