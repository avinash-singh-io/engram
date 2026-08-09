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
- [ ] **BLOCKED — needs user**: record the per-root egress decision
      (`machine` vs `hand-only`) before Group 2 runs

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
- [ ] **BLOCKED — needs user**: run `node tools/gate1/extract.js`. The sandbox
      classifier denies reading session data across all project roots.

## Group 2 — Classify and adjudicate — parallel with Group 3

- [ ] **Lock stage 2**: hand-label `seed.jsonl` (~60 real questions drawn from the
      extracted corpus), regenerate the manifest via `node tools/gate1/freeze.js`,
      re-verify the freeze test — **before the classifier runs**
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
