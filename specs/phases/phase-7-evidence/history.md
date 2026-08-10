# Phase 7 — History

### [DECISION] 2026-08-10 — Intelligence deferred post-v1.0 as an indivisible system
Topics: intelligence, roadmap, observation, phasing
Affects-phases: phase-7-evidence
Affects-specs: specs/planning/roadmap.md, specs/decisions/0035-user-memory-second-store.md, specs/decisions/0036-intelligence-loop.md
Detail: Phases 12–13 move to a parked section, reopened only after v1.0 has real
usage. The observation substrate parks **with** them rather than being built early:
ADR-0036's loop is five steps that only cohere together, so building OBSERVE alone
means logging an unknown-fit shape for a year — data that reads as evidence and
isn't. ADR-0035 and ADR-0036 stay `accepted`; only scheduling changes. Formalised
as ADR-0038.

---

### [SCOPE_CHANGE] 2026-08-10 — Phase 7 reduced to the Gate 1 measurement only
Topics: phasing, gate-1, observation
Affects-phases: phase-7-evidence, phase-8-core
Affects-specs: specs/planning/roadmap.md
Detail: The phase originally carried three deliverables — the Gate 1 measurement,
the observation substrate, and the baseline number. With intelligence parked
(ADR-0038) the substrate loses its dual-purpose justification, and with the
retrospective corpus available it is not needed for the gate either. Phase 7 now
writes no product code: two ADRs, a locked evaluator, a throwaway instrument, and
a decision.

---

### [DECISION] 2026-08-10 — Gate 1 measured retrospectively; the reading is a lower bound
Topics: gate-1, measurement, methodology
Affects-phases: phase-7-evidence
Affects-specs: specs/decisions/0031-evidence-gates-before-graph.md
Detail: Stored agent transcripts already contain real question traffic, so Gate 1
runs as a read-only pass rather than new instrumentation — which is what makes
ADR-0031's "one afternoon" claim true. Historical questions were asked where
nothing could answer structurally, so they undercount by construction: the
retrospective fraction is a **lower bound**, and can therefore clear the gate but
never fail it. Formalised as ADR-0037.

---

### [DECISION] 2026-08-10 — Three-way rubric; the denominator is the load-bearing choice
Topics: gate-1, classification, methodology
Affects-phases: phase-7-evidence
Affects-specs: none
Detail: Classification is `not-a-kb-question` / `lookup` / `structural`, with the
fraction computed over `lookup + structural`. Most agent prompts are coding
instructions; leaving them in the denominator makes the 20% threshold unreachable
by arithmetic and would fail the gate for the wrong reason. Where that first
boundary sits is the most consequential line in the locked rubric, which is why it
is written before any data is seen.

---

### [DECISION] 2026-08-10 — Decide on the interval, not the point estimate; three branches
Topics: gate-1, methodology, statistics
Affects-phases: phase-7-evidence, phase-11-retrieval
Affects-specs: specs/decisions/0031-evidence-gates-before-graph.md
Detail: At n=150 an observed 26% has a 95% CI of roughly [19%, 33%] — a
point-estimate rule would call that a pass. The decision is taken on the Wilson
interval with three terminal states: clears, fails, or unresolved. Unresolved is
not a dead end — it routes to the Group 5 `wondered` journal, the one signal
transcripts structurally cannot contain.

---

### [DECISION] 2026-08-10 — `root` is an opaque id; engram has no concept of vault kinds
Topics: identity, privacy, boundaries
Affects-phases: phase-7-evidence
Affects-specs: specs/decisions/0030-boundaries-are-repos.md
Detail: An earlier framing of this phase read ADR-0030's four-repo example as a
product taxonomy and proposed measuring per audience type. That was wrong —
ADR-0030 offers the user a decision rule, and engram "has no concept of which kind
it is in, and that is the point". The corpus is all roots, each carrying an opaque
id and no `audience`/`kind` field; the report slices by root descriptively. Also
note that the corpus is deliberately **not** filtered by working directory: the
most structural questions get asked while working in code, not while sitting in
notes.

---

### [EVALUATOR] 2026-08-10 — `gate1-v1` locked before any classification
Topics: evaluator, rule-11, gate-1
Affects-phases: phase-7-evidence, phase-11-retrieval
Affects-specs: none
Detail: The evaluation set (`rubric.md`, `seed.jsonl`, `protocol.md`) is frozen
under a version tag and guarded by a manifest checksum test before the classifier
sees real data. Any change is a `gate1-v2` version bump, never an edit to v1. The
instruments themselves — Cohen's κ and the Wilson interval — are unit-tested
against known values, because a subtly wrong statistic would corrupt the decision
silently.

---

### [NOTE] 2026-08-10 — The roadmap's blocking claim is broader than ADR-0031
Topics: roadmap, gate-1, phasing
Affects-phases: phase-7-evidence, phase-8-core
Affects-specs: specs/planning/roadmap.md, specs/status.md
Detail: The roadmap states "Phase 7 blocks everything. No product code until Gate 1
passes", while ADR-0031 gates "any graph work". The distinction matters: a failed
gate still ships a folder convention that needs a format, capture, and identity —
so Phase 8's front half is not gated, only the relation registry and traversal are.
With the retrospective corpus removing the multi-week wait this is no longer
urgent, but the roadmap line should be corrected at `/sync-docs`. Also to correct
there: status.md next-action #3 presents the four-repo setup as a Gate 1
dependency, which it is not — that is a personal workflow choice. FEAT-008
(event-log compaction) and FEAT-005's `contradicts` park with Phases 12–13.

---

### [EVALUATOR] 2026-08-10 — gate1-v1 stage 1 locked; seed labeling deferred to stage 2
Topics: evaluator, rule-11, gate-1, classification
Affects-phases: phase-7-evidence
Affects-specs: specs/decisions/0037-gate1-measurement-protocol.md
Detail: `rubric.md` and `protocol.md` are frozen under a checksum manifest before
any data was seen, and the freeze test was verified to **fail** on a deliberate
mutation — a freeze test that cannot fail is worthless. Found while executing
Group 0 that the plan was circular: the seed set must be drawn from the corpus,
which is unreadable until the Group 1 reader exists. Resolved by a two-stage lock
(ADR-0037 §6) — rubric and protocol now, seed after extraction and before the
classifier runs. Rule 11's load-bearing property holds: the rubric is the only
artifact tunable to flatter a result, and it is fixed first.

---

### [DECISION] 2026-08-10 — The rubric declares its own biases rather than correcting them
Topics: methodology, gate-1, classification
Affects-phases: phase-7-evidence
Affects-specs: specs/decisions/0037-gate1-measurement-protocol.md
Detail: Two directional biases are written into the locked rubric and required in
the report. Ambiguous prompts label `not-a-kb-question`, which shrinks the
denominator and makes the structural fraction *easier* to clear. The retrospective
corpus undercounts structural traffic, making the reading a lower bound. They point
in opposite directions and neither is corrected — a measurement that hides the
direction of its own error is not evidence.

---

### [NOTE] 2026-08-10 — Phase branch is stacked on feat/v2-architecture, not main
Topics: git, phasing, lanes
Affects-phases: phase-7-evidence
Affects-specs: none
Detail: `main` carries none of ADR-0018..0036, the v2 architecture overview, or the
Phase 7 plan, so `/start-phase`'s canonical `git checkout main && git checkout -b`
would have produced a branch that could not execute this phase. Branched from
`feat/v2-architecture` instead — a stacked lane under Rule 6. The parent must land
first; this branch rebases onto `main` afterwards.

---

### [DISCOVERY] 2026-08-10 — Most `type:"user"` transcript records are not human prompts
Topics: gate-1, measurement, classification, corpus
Affects-phases: phase-7-evidence
Affects-specs: none
Detail: Group 1's format probe found that across two real sessions, 189 records of
`type:"user"` contained only **33 human prompts** — the remainder were tool results
fed back to the model (148), harness meta turns (7), and an attachment-only turn.
Counting `type:"user"` naively would overstate n by ~5.7x and silently corrupt the
Gate 1 denominator. The reader's filter is derived from observed field
distributions rather than guessed: excludes `toolUseResult`, `isMeta`,
`isSidechain`, and any record whose `message.content` is not a string. Sidechain
exclusion matters most in repos that use subagents — those prompts are an agent's,
not the human's.

---

### [NOTE] 2026-08-10 — Group 1 extraction blocked on a sandbox permission
Topics: gate-1, corpus, tooling
Affects-phases: phase-7-evidence
Affects-specs: none
Detail: `node tools/gate1/extract.js` reads stored session data across all ~30
project roots and is denied by the sandbox classifier. The reader and its tests are
complete and verified; only the run against the real corpus is blocked. Not worked
around — the denial is proportionate to what the command reads. Needs the user to
run it or to grant the permission.

---

### [EVALUATOR] 2026-08-10 — Gate statistics implemented and checked against published values
Topics: gate-1, statistics, evaluator, rule-11
Affects-phases: phase-7-evidence
Affects-specs: specs/decisions/0037-gate1-measurement-protocol.md
Detail: Cohen's κ and the Wilson score interval are implemented and tested against
independently published reference values rather than against their own output —
5/10 → [0.2366, 0.7634], 20/100 → [0.1334, 0.2888], and the textbook 2×2 κ = 0.4.
The decision rule itself is encoded as a test: 39/150 (26%) has a point estimate
above the 20% threshold but a lower bound below it, which is exactly the case a
point-estimate rule misreads as CLEAR. Also pinned: κ returns 1 rather than NaN
when both raters used a single identical label, so a degenerate sample cannot feed
NaN into a gate decision.

---

### [DECISION] 2026-08-10 — Sample parameters pre-registered before any prompt was read
Topics: gate-1, methodology, rule-11, sampling
Affects-phases: phase-7-evidence
Affects-specs: specs/decisions/0037-gate1-measurement-protocol.md
Detail: Extraction returned n=1715 human prompts across 21 roots and 105 sessions —
far more than the interval needs. Classification therefore runs on a deterministic
random sample, **N=400, seed=20260810**, fixed and recorded here before a single
prompt was read. The choice was made on a volume fact, not an outcome fact. The
seeded hash-sort makes the sample reproducible and auditable rather than
convenient, and 400 keeps the human's blind 20% (80 items) a realistic ask.

---

### [DISCOVERY] 2026-08-10 — Corpus was 38% inflated by storage duplicates and harness turns
Topics: gate-1, corpus, measurement, tooling
Affects-phases: phase-7-evidence
Affects-specs: none
Detail: Inspecting the first sample batch — before classifying any of it — exposed
two instrument defects. (1) **Storage duplicates**: 1715 extracted records carried
only 1194 distinct uuids, because a resumed or compacted session re-stores the same
record in a second file. These are not a human re-asking, so the rubric's
"label each occurrence" rule does not apply; they are now deduped by uuid. (2)
**Harness-injected turns**: 155 `<task-notification>` and 30
`<local-command-stdout>` blocks arrive as `type:"user"` but were typed by nobody.
Slash-command wrappers are *not* dropped — 47 of 56 carry non-empty
`<command-args>` holding a genuine question, so they are unwrapped to
`/name args` instead. Corrected corpus: **1066** human prompts, down 38%. Caught
before any classification, so no result was influenced.

---

### [DECISION] 2026-08-10 — TypeScript re-decided for v2 (ADR-0039)
Topics: language, runtime, architecture, obsidian, tooling
Affects-phases: phase-7-evidence, phase-8-core, phase-14-obsidian
Affects-specs: specs/decisions/0007-typescript-single-package.md
Detail: ADR-0007 chose TypeScript for the v1 MVP; v2 is a clean-room rewrite, so
the choice was re-decided rather than inherited. Prompted by a challenge on why
`tools/gate1/` was plain JS — it is disposable scaffolding kept outside the
typecheck, which was a defensible call made silently rather than stated. Decision:
TypeScript, because it is the only candidate that loses badly on no axis and the
only one that keeps a JavaScript plugin ecosystem reachable — you cannot consume JS
plugins from a process that cannot run JS. Under uncertainty about how far the
product goes, optionality is the right thing to optimise, not fit. Two measurable
reopen triggers recorded.

---

### [DISCOVERY] 2026-08-10 — Sync + E2E encryption would reverse ADR-0034, not extend it
Topics: security, sync, encryption, product-scope
Affects-phases: phase-7-evidence
Affects-specs: specs/decisions/0034-encryption-is-a-substrate-concern.md
Detail: Raised while thinking aloud about post-v1.0 ambitions (own agent, own UI,
plugin ecosystems, sync with E2E). Sync-with-encryption is not a feature addition —
ADR-0034 states engram never transmits and ships no encryption *because an
encrypted note is a note engram cannot help with*. It also collides with ADR-0004
(git as source of truth) and ADR-0013 (the free sync path already exists without
engram transmitting). Recorded so it cannot creep in feature-by-feature; it needs
an explicit ADR-0034 revisit before any design work. Not scheduled.

---

### [SCOPE_CHANGE] 2026-08-10 — Group 3's baseline cannot be scored in this phase
Topics: gate-1, baseline, evaluator, phase-11
Affects-phases: phase-7-evidence, phase-11-retrieval
Affects-specs: specs/planning/roadmap.md
Detail: The plan called for an rg-over-markdown baseline "scored on the structural
questions actually collected" — the number Phase 11 must beat. Executing it exposed
the flaw: a baseline must be *scored*, and scoring needs an answer key mapping each
question to the documents that answer it. The 32 structural questions are real;
their answers were never recorded anywhere. Authoring that key is human work and
belongs to Phase 11 Group 0. Substituting `recall-v1` would measure the wrong thing
— it is synthetic and lookup-shaped, exactly what Phase 11 is not required to beat.
The questions are extracted to `.gate1/structural-questions.jsonl` with every
`expected` field explicitly null, so the gap is visible rather than assumed filled.

---

### [EVALUATOR] 2026-08-10 — Stage A classified; report refuses a verdict by construction
Topics: gate-1, classification, evaluator, rule-11
Affects-phases: phase-7-evidence
Affects-specs: specs/decisions/0037-gate1-measurement-protocol.md
Detail: 400 sampled prompts classified against the locked rubric by a single
machine rater: 364 not-a-kb-question, 4 lookup, 32 structural. Denominator 36 (9.0%
of the sample); structural fraction 88.9%, Wilson 95% CI [74.7%, 95.6%]. The report
tool emits **PROVISIONAL — NOT A GATE DECISION** and states no verdict, because
ADR-0037 §5 requires a blind human sample and κ ≥ 0.7 first. The refusal is
enforced in code and covered by five tests, including one proving it still refuses
against a maximally strong signal — a prose caveat gets skipped, a code refusal
does not.

---

### [EVALUATOR] 2026-08-10 — gate1-v2: the v1 adjudication rule was defective
Topics: evaluator, rule-11, gate-1, methodology, statistics
Affects-phases: phase-7-evidence
Affects-specs: specs/decisions/0037-gate1-measurement-protocol.md
Detail: v1 required "a random 20% of **in-denominator items**" be hand-labeled
blind. Three defects, found before any human label was written. It cannot be
executed as written — selecting in-denominator items requires reading the machine
labels the same sentence requires hidden. It samples only where the machine already
agrees with itself, so a real question wrongly labelled `not-a-kb-question` was
structurally uncatchable — and the rubric names that boundary the most consequential
line in it. And it yields 7 items on the actual run, far too few for a usable κ.
Fixed by version bump per Rule 11, never by editing v1: v2 draws 20% of the **whole
sample** by a seeded hash independent of any label. `rubric.md` is byte-identical
across v1 and v2 (`d67159e9…`), enforced by a test, so no classification result can
change under the bump — only classifier validation differs, and that step cannot
move the measured fraction. v1 is retained as the historical record and stays
frozen; the freeze test now locks every `gate1-v*` directory.

---

### [DECISION] 2026-08-10 — Gate 1 answered: PROCEED, classifier validation waived
Topics: gate-1, decision, methodology, roadmap
Affects-phases: phase-7-evidence, phase-8-core
Affects-specs: specs/planning/roadmap.md, specs/status.md, specs/decisions/0031-evidence-gates-before-graph.md
Detail: 400 sampled prompts from a 1066-prompt corpus gave 36 knowledge-base
questions, of which 32 were structural — 88.9%, Wilson 95% CI [74.7%, 95.6%]
against a 20% threshold. The owner waived ADR-0037 §5's blind human sample and κ
floor and decided to proceed. Recorded as a **waived check, not a passed one**:
`report.js` still prints PROVISIONAL on this data and was deliberately left
unmodified, so the instrument never misrepresents its own limits. Defensible on
sensitivity: the classifier would have to be wrong on 21 of 32 structural calls —
a 66% error rate — before the gate stops clearing. Two findings carry forward: only
9% of prompts are knowledge-base questions at all, and the structural ones are
overwhelmingly project-state questions ("whats the status", "I think we decided X
right?"), which is exactly where text search cannot separate a live decision from a
superseded one. Whether that generalises beyond one person's momentum-style
workflow is untested. Full record in gate-1-report.md.

---

### [SCOPE_CHANGE] 2026-08-10 — Roadmap restructured; v1.0 defined as the base product
Topics: roadmap, phasing, intelligence, releases
Affects-phases: phase-7-evidence, phase-8-core, phase-14-obsidian
Affects-specs: specs/planning/roadmap.md, specs/status.md
Detail: Phases 12–13 moved to a parked section per ADR-0038, with the ADR-0035
observation substrate parked alongside them. Phase 14 (Obsidian) moves up to
v0.11.0, and **v1.0.0 is defined as the base product** — Phases 8, 9, 10, 11, 14:
the knowledge system without intelligence. Phase numbers left unchanged;
renumbering to close the cosmetic 12/13 gap would invalidate references across
ADRs, backlog rows and history. The roadmap's "Phase 7 blocks everything" line was
corrected — ADR-0031 gates graph work, not all product code — and now records the
Gate 1 outcome.

---

### [DISCOVERY] 2026-08-10 — The corpus is a different domain from the product
Topics: gate-1, validity, measurement, methodology
Affects-phases: phase-7-evidence, phase-11-retrieval
Affects-specs: specs/phases/phase-7-evidence/gate-1-report.md
Detail: Named by the owner after the decision was recorded, and it is the most
serious limitation of the measurement. The corpus is spec-driven **software
development** traffic — build instructions, phase commands, release steps — while
engram's use case is a **knowledge base**. The prompt *shape* transfers, since the
owner will address an agent the same way over a vault, and the structural questions
found ("what did we decide", "is this still current") are domain-independent in
form. The **rate** does not transfer: there is no basis for claiming a knowledge
base yields 88.9% structural traffic, nor that its denominator would be 9%.
Direction of the error is arguable — a vault accumulates superseded material over
years where a repo compresses it into months, which would push structural traffic
up — but that is an argument, not evidence. PROCEED therefore rests on the
*mechanism* being demonstrated, not on the rate being portable. Recorded in
gate-1-report.md as a named threat to validity so the figure cannot later be
misquoted as a property of knowledge-base traffic.

---
