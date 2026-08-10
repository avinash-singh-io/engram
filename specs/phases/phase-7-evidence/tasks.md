# Phase 7 — Tasks

> Legend: `[ ]` todo · `[/]` in progress · `[x]` done
> Execution: Group 0 → Group 1 → (Groups 2 + 3 parallel) → Group 4 → [Group 5 if unresolved]

## Group 0 — Lock the evaluator, stage 1 (Rule 11) — blocks everything

- [x] Write ADR-0037 — Gate 1 measurement protocol
- [x] Write ADR-0038 — intelligence deferred post-v1.0 as an indivisible system
- [x] Author `tests/benchmarks/gate1-v1/rubric.md` — three labels, worked examples
- [x] Fix the `not-a-kb-question` boundary explicitly (this sets the denominator)
- [x] Write `protocol.md` — corpus, decision rule, κ floor, contingency trigger
- [x] Add `tests/benchmarks/gate1-v1.freeze.test.ts` + `tools/gate1/freeze.js`
- [x] Verify: freeze test passes, **and fails on a deliberate mutation**
- [x] Verify: `npm run check` exits 0 with fresh output
- [x] Commit and freeze `gate1-v1` stage 1 before any real data is touched
- [x] Per-root egress decision: owner authorised machine classification across
      all roots (2026-08-10). Recorded per ADR-0034 — the agent is the egress path.

> **Seed labeling moved to stage 2** (ADR-0037 §6). The seed must be drawn from the
> corpus, which is unreadable until the Group 1 reader exists — the original plan
> had it circular. Rule 11 holds regardless: the rubric, the only artifact tunable
> to flatter a result, is locked here in stage 1.

## Group 1 — Transcript reader

- [x] **GATE PASSED: transcript format confirmed parseable** — `type:"user"`
      records carry `message.content`, `timestamp`, `sessionId`, `cwd`
- [x] Establish the human-prompt filter from observed field distributions
      (not guessed): excludes tool results, meta turns, sidechain/subagent
      turns, attachment-only turns
- [x] Enumerate roots; assign opaque ids via sha256 of the directory name
- [x] Extract prompts: text, timestamp, session id, opaque root id
- [x] Unit test the reader against a synthetic fixture (13 tests)
- [x] Gitignore `.gate1/` — the corpus holds raw prompt text
- [x] Verify: `npx vitest run tests/gate1/reader.test.ts` passes
- [x] Verify: `npm run check` exits 0 with fresh output
- [x] Run `node tools/gate1/extract.js` — 1066 prompts, 21 roots, 105 sessions
      (owner-authorised; sandbox had denied the cross-root read)

## Group 2 — Classify and adjudicate — parallel with Group 3

- [x] Stage-2 lock superseded by the `gate1-v2` bump: the separate `seed.jsonl`
      was folded into the blind worksheet, since both served the same purpose —
      independent ground truth. See the v2 history entry.
- [x] Implement Cohen's κ + Wilson interval; unit test against **published**
      reference values (5/10 → [.2366,.7634]; 20/100 → [.1334,.2888]; textbook
      2×2 κ → 0.4), not against this implementation's own output
- [x] Encode the decision rule as a test: 39/150 (26%) has a point estimate above
      the threshold but a lower bound below it — the case a point rule misreads
- [x] Verify: `npx vitest run tests/gate1/stats.test.ts` passes (14 tests)
- [x] Run the classifier against the locked rubric (400 sampled prompts)
- [x] Generate the blind worksheet (`tools/gate1/adjudicate.js`) — 80 items
- [ ] **WAIVED by owner 2026-08-10**: blind hand-label + κ. Recorded as a waived
      check, not a passed one; `report.js` still prints PROVISIONAL. Completable
      at any time — the worksheet and labels are preserved in `.gate1/`.

## Group 3 — Baseline harness — parallel with Group 2

- [x] Extract the 32 real structural questions (`tools/gate1/structural.js`) —
      the most valuable artifact this phase produces for Phase 11
- [ ] **CANNOT COMPLETE AS SPECIFIED — scope error found in execution.** A grep
      baseline must be *scored*, and scoring needs an answer key mapping each
      question to the documents that correctly answer it. The 32 questions are
      real; their answers were never recorded. Authoring that key is human work
      and belongs to **Phase 11 Group 0**, not here. Running rg against
      `recall-v1` instead would measure the wrong thing — those queries are
      synthetic and lookup-shaped, which is precisely what Phase 11 is *not*
      required to beat.

## Group 4 — Report and decide

- [x] Compute structural fraction, Wilson 95% CI, per-root slice
- [x] Report the three-way label counts and n
- [x] Sensitivity analysis — 21 of 32 calls would have to be wrong to flip
- [x] Record the decision: **PROCEED**, validation waived (`gate-1-report.md`)
- [x] Verify: `npm run check` exits 0 with fresh output
- [ ] Write `retrospective.md`
- [ ] Run `/sync-docs` — roadmap restructure, status update, backlog notes

## Group 5 — Contingency (only if Group 4 returns *unresolved*)

- [x] **NOT TRIGGERED** — Group 4 returned PROCEED, so the `wondered` journal is
      not required. It remains the correct instrument if the gate is ever reopened
      and comes back unresolved.
