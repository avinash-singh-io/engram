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
