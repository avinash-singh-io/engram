# Phase 7 — Tasks

> Legend: `[ ]` todo · `[/]` in progress · `[x]` done
> Execution: Group 0 → Group 1 → (Groups 2 + 3 parallel) → Group 4 → [Group 5 if unresolved]

## Group 0 — Lock the evaluator (Rule 11) — blocks everything

- [ ] Write ADR-0037 — Gate 1 measurement protocol
- [ ] Write ADR-0038 — intelligence deferred post-v1.0 as an indivisible system
- [ ] Author `tests/benchmarks/gate1-v1/rubric.md` — three labels, worked examples
- [ ] Fix the `not-a-kb-question` boundary explicitly (this sets the denominator)
- [ ] Hand-label `tests/benchmarks/gate1-v1/seed.jsonl` (~60 real questions)
- [ ] Write `protocol.md` — corpus, decision rule, κ floor, contingency trigger
- [ ] Record the per-root egress decision (machine-classified vs hand-labeled only)
- [ ] Add `tests/benchmarks/gate1-v1.freeze.test.ts` — manifest checksum
- [ ] Verify: `npx vitest run tests/benchmarks/gate1-v1.freeze.test.ts` passes
- [ ] Commit and freeze `gate1-v1` before any real data is touched

## Group 1 — Transcript reader

- [ ] **GATE: confirm a real transcript file parses and contains user prompt text**
      — if not, stop and re-plan
- [ ] Enumerate roots; assign opaque ids (no semantic naming)
- [ ] Extract prompts: text, timestamp, session id, opaque root id
- [ ] Unit test the reader against a synthetic fixture
- [ ] Verify: `npx vitest run tests/gate1/reader.test.ts` passes

## Group 2 — Classify and adjudicate — parallel with Group 3

- [ ] Implement Cohen's κ + Wilson interval; unit test against known values
- [ ] Verify: `npx vitest run tests/gate1/stats.test.ts` passes
- [ ] Run the classifier over the corpus against the locked rubric
- [ ] Blind hand-label a random 20% (machine labels hidden)
- [ ] Compute κ; if below floor → hand-label all, or version-bump to `gate1-v2`

## Group 3 — Baseline harness — parallel with Group 2

- [ ] Build the rg-over-markdown baseline harness
- [ ] Run against the structural questions found; score and record
- [ ] Verify: `node tools/gate1/baseline/run.js` produces a scored result

## Group 4 — Report and decide

- [ ] Compute structural fraction, Wilson 95% CI, per-root slice
- [ ] Report the three-way label counts and n
- [ ] Apply the three-branch decision rule — no post-hoc adjustment
- [ ] Verify: `npm run check` exits 0 with fresh output
- [ ] Write `retrospective.md`
- [ ] Run `/sync-docs` — roadmap restructure, status update, backlog notes

## Group 5 — Contingency (only if Group 4 returns *unresolved*)

- [ ] Open the `wondered` journal — plain text, one line per unasked question
- [ ] Keep for the pre-declared window
- [ ] Re-decide against the same locked rule
