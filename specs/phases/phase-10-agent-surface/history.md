# Phase 10 — History

### [DECISION] 2026-08-12 — Engram does not extract relations; the agent does
Topics: format, extraction, architecture, security
Affects-phases: phase-10-agent-surface
Affects-specs: specs/decisions/0033-format-takes-content.md
Detail: Reading ADR-0033 against ADR-0034 settles what `format` actually is and
shrinks this phase considerably. ADR-0034 is absolute — engram never transmits, no
network calls — so engram **cannot call a model** and therefore cannot extract
relations itself. ADR-0019 already names who does: the agent writes the edges at the
moment it writes the content, because it already knows the relationship. ADR-0027
makes that the *primary* error mitigation rather than a convenience, on the grounds
that reporting beats inferring.

So `format(content, hints)` is the seam where the agent's understanding becomes a
validated write, and engram's half is entirely deterministic: slug from title, path
from container, serialize, validate, stamp `generated`. **There is no extractor to
build in `src/`.** The consequence for Gate 2 is that it measures *the agent's*
accuracy, not engram's — engram's contribution is making a wrong edge cheap to fix,
which ADR-0027 calls load-bearing: the mitigation for imperfect extraction is that
repair is trivial, not that extraction is perfect.

---

### [DECISION] 2026-08-12 — Gate 2 gets two bars: directionality ≥95%, predicate ≥90%
Topics: gate-2, thresholds, methodology
Affects-phases: phase-10-agent-surface, phase-11-retrieval
Affects-specs: specs/decisions/0031-evidence-gates-before-graph.md
Detail: ADR-0031 said Gate 2's threshold was "to be fixed before sampling begins"
and it never was — a gate on the books with no bar. Fixed here, in Group 0, before a
single edge exists, because a threshold chosen after seeing the numbers is not a
threshold.

Two bars rather than one, because the errors differ in cost. A **directionality**
error inverts meaning: `A supersedes B` when B supersedes A presents a superseded
node as current, which is precisely the failure the validity filter exists to
prevent, so it carries the higher bar. A **predicate** error — `sources` where
`part-of` was meant — degrades traversal without lying about currency. A single
combined bar would let directionality errors hide behind predicate accuracy, which
inverts the priority. Below either bar, ADR-0031's own fallback applies: stop at
nodes plus untyped links, which is still a working product. Formalised as ADR-0040.

---

### [SCOPE_CHANGE] 2026-08-12 — Skills, MCP and adapters move to a new Phase 15
Topics: scope, phasing, surfaces, roadmap
Affects-phases: phase-10-agent-surface, phase-15-surfaces
Affects-specs: specs/planning/roadmap.md
Detail: As the roadmap scoped it, Phase 10 carried more than Phases 8 and 9 combined
— `format`, extraction, guardrails, skills, `AGENTS.md`, adapters, MCP — and ended in
a gate that can stop the project. Building the surfaces *before* that gate would risk
wasting them: skills and MCP are thin translations over a core whose edge accuracy is
unmeasured until this phase ends. Split so Phase 10 is the write path plus the Gate 2
instrument, and skills, MCP server and agent adapters become **Phase 15**. Appended
rather than renumbered, because phase numbers are referenced across ADRs, backlog rows
and history entries, and closing a cosmetic gap costs more than the gap.

---

### [DECISION] 2026-08-12 — Gate 2's corpus is generated, and the report says so
Topics: gate-2, measurement, methodology
Affects-phases: phase-10-agent-surface
Affects-specs: none
Detail: Gate 2 needs real agent-authored edges. Waiting for organic usage recreates
Phase 7's Group 5 problem — a multi-week collection window with the phase blocked
behind it. Group 6 instead generates the corpus by formatting a set of existing
notes: the edges are genuine agent output, and only the *trigger* is synthetic. That
is a real limitation — edges produced in a batch over old material may differ in
quality from edges produced in the flow of live work — and it is stated in the report
rather than glossed. It is still closer to real use than any fixture, and it is
measurable this phase instead of next month.

---

### [DECISION] 2026-08-12 — A guardrail may tighten but never loosen, and must have a detective form
Topics: guardrails, architecture, skills
Affects-phases: phase-10-agent-surface, phase-15-surfaces
Affects-specs: specs/architecture/v2-overview.md#7-guardrails
Detail: Two constraints, both asserted by test rather than left to review. **Tighten
only**: a skill declares `guardrails:` and may narrow what it is permitted to do,
never widen it. That is what bounds the blast radius of a careless or downloaded
skill in Phase 15, and it has to hold before skills exist rather than after.
**Detective form required**: v2-overview §7 is explicit that engram mediates only two
of the four write paths, since Obsidian and any agent with a shell write files
directly, so a rule enforceable only at the gate is advisory. Guardrails are
registered the same way relations are, and a test asserts every registered rule
carries a non-empty detective form. That exact mechanism caught `part-of` being
registered but unserialized in Phase 9, which is the argument for reusing it.

---

### [EVALUATOR] 2026-08-12 — gate2-v1 locked; the scoring asymmetry is deliberate
Topics: gate-2, evaluator, rule-11, methodology
Affects-phases: phase-10-agent-surface
Affects-specs: specs/decisions/0040-gate2-thresholds-and-protocol.md
Detail: `gate2-v1` is frozen under a checksum manifest before any edge exists, and
the freeze was verified by deliberately mutating the rubric and watching it fail. Two
scoring choices are pinned in the rubric rather than left to whoever runs it. First,
`n/a` is excluded from **directionality** but never from **predicate** — an edge
whose kind is wrong still counts against predicate accuracy, since excluding it would
make the worst errors vanish from the denominator. Second, `should-be-untyped` is
called out as the most consequential predicate error: inventing a closed relation
from vague association grants validity semantics the content does not support, which
is how a graph starts lying rather than merely being incomplete (ADR-0027). The
freeze machinery was generalised from `gate1-v*` to `gate<N>-v<M>` and gained a test
that every locked evaluator carries both a rubric and a protocol.

---

### [DECISION] 2026-08-12 — `format` rejects only where validation gates promotion
Topics: format, capture, adr-0026, gate
Affects-phases: phase-10-agent-surface
Affects-specs: none
Detail: `format` has exactly one rejection of its own — it cannot derive an identity
from content with no title, no id, and no usable first line — plus whatever the gate
refuses. That is deliberate and it is the ADR-0026 boundary: **validation gates
promotion, never capture.** Content that cannot be formatted is not lost, it belongs
in `capture`, which cannot reject anything. Asserted by test that a rejected `format`
writes nothing at all, since the gate validates a proposed diff rather than a write.
The risk noted in `overview.md` was that `hints` grows into a schema the agent must
satisfy, eroding capture-never-rejects at the edges; keeping `format`'s own rejection
surface to a single case is the guard against that.

---

### [ARCH_CHANGE] 2026-08-12 — Guardrails require both halves at the type level
Topics: guardrails, architecture, doctor, type-safety
Affects-phases: phase-10-agent-surface
Affects-specs: specs/architecture/v2-overview.md#7-guardrails
Detail: The `Guardrail` interface requires `check` (preventive) **and** `detect`
(detective) as mandatory members, so a preventive-only rule does not compile. That is
stronger than the relation registry's equivalent, which requires a detective
*description* and relies on a test to assert it is non-empty — a rule can carry a
sentence and still do nothing. Guardrails carry executable detection instead, which
matters more here: v2-overview §1 says engram mediates two of the four write paths,
so for guardrails the detective half is not a supplement but the only half that sees
an Obsidian edit or an agent shell write. All six rules are tested from both sides —
the preventive test refuses a change, and the detective test finds the same violation
in a vault where the change was never gated.

---

### [DECISION] 2026-08-12 — `tighten` intersects scopes and takes the minimum limit
Topics: guardrails, skills, security
Affects-phases: phase-10-agent-surface, phase-15-surfaces
Affects-specs: none
Detail: "Tighten but never loosen" needed a concrete meaning per field, and the naïve
implementation — merge everything — silently loosens. `enabled` unions, so rules can
be added but never removed. `pathScope` **intersects**, so a skill requesting a wider
scope gets nothing new; a union there would let a downloaded skill grant itself the
filesystem. `rateLimit` takes the **minimum**, so a request for a higher cap is
ignored. `proposeOnly` unions, since more propose-only paths is stricter. Eight tests
cover it, including one that asks to loosen every field at once and gets refused on
all of them. This is settled now rather than when skills land in Phase 15, because a
constraint added after the thing it constrains is not a constraint.

---

### [DECISION] 2026-08-12 — AGENTS.md is generated but NOT gitignored
Topics: agents-md, derived-state, adr-0029
Affects-phases: phase-10-agent-surface
Affects-specs: specs/decisions/0029-derived-state-never-committed.md
Detail: `AGENTS.md` is now generated by `reindex` from the live relation and
guardrail registries, which makes it derived — and ADR-0029 says derived state is
gitignored by default. It is deliberately **not**. It is the entry contract, and an
agent arriving at a fresh clone needs it *before* it can run anything, including
`reindex`. Gitignoring it would mean the contract is absent exactly when it is first
needed, which defeats its purpose in a way that a missing `views/superseded.md` does
not.

The rest of ADR-0029 still holds for it: it declares itself generated, hand edits are
lost, and a conflict is resolved by regenerating rather than merging. That last point
is a real behaviour change from Phase 9, where `init` scaffolded a static AGENTS.md
and left it alone forever — so it is pinned by a test asserting `reindex` overwrites
a hand-edited copy. Deriving it is what stops the contract drifting from the code,
which is the failure Phase 9 hit with the codec's hardcoded relation list: prose that
confidently describes behaviour the code does not have.

---

### [DISCOVERY] 2026-08-12 — Serialized files had no trailing newline, and the fix had a second half
Topics: format, codecs, round-trip, serialization
Affects-phases: phase-10-agent-surface, phase-8-core
Affects-specs: none
Detail: Smoke-testing the built binary made it visible: `reindex`'s output ran onto
the same line as the file it had just written, because no serialized file ended with
a newline. Shipped in Phase 8 and unnoticed through Phase 9 — POSIX text files end
with one, git reports "\\ No newline at end of file" without it, and any editor that
appends one turns a no-op into a diff.

Adding it broke the v0.1 → v0.2 round-trip test, which was the useful part. With the
writer appending a newline and the reader keeping it, `read(write(x))` grew a newline
per cycle and the body was no longer preserved exactly — every reindex would have
become a diff, which is precisely what ADR-0029's "regenerate, never merge" depends on
*not* happening. The complete fix is an invariant, not a patch: **a body is held
without a trailing newline, the writer appends exactly one, the reader strips exactly
one.** Both halves live in `format/registry.ts` so no codec can implement only one,
and a test runs five write/read cycles to prove the body does not drift.

---
