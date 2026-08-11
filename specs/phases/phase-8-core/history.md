# Phase 8 — History

### [DECISION] 2026-08-12 — v1 `src/` deleted outright; the unreleasable window is accepted
Topics: rewrite, phasing, releases, clean-room
Affects-phases: phase-8-core
Affects-specs: specs/planning/roadmap.md
Detail: Three dispositions were weighed: move v1 to `src/legacy/` and delete it at
the end, delete outright and build from zero, or build alongside under new paths.
The owner chose **delete outright**. Two costs were stated before the choice and
accepted: the suite drops from 265 tests to the 36 Phase 7 instrument tests, and
between Group 0 and Group 6 the package has no working CLI, so `main` is not
releasable — which contradicts the roadmap's "each phase leaves the project
releasable" principle for the duration. Recorded in `overview.md` as a declared
window rather than a discovered one. The forcing constraint is real regardless of
choice: `src/format/` already exists with v1 code and ADR-0032 requires that exact
path for the codec registry.

---

### [DECISION] 2026-08-12 — TDD is on for the whole phase (Rule 13)
Topics: testing, tdd, methodology
Affects-phases: phase-8-core
Affects-specs: none
Detail: Rule 13 is opt-in and the owner enabled it across the entire phase, not only
`core/`. The strong case is `core/` and `format/`: pure, I/O-free logic behind
narrow ports (ADR-0032), so tests need no fixtures, no temp directories and no clock
stubbing — the cheapest TDD in the roadmap. The weaker case is `ops/` and the CLI,
where integration-shaped tests are slower to write test-first; the plan compensates
by keeping those coarse — one behaviour per test, no over-specification of
internals.

---

### [DECISION] 2026-08-12 — v0.7.0 ships `capture` + `link` only
Topics: scope, cli, releases, operations
Affects-phases: phase-8-core, phase-9-structure, phase-10-agent-surface, phase-11-retrieval
Affects-specs: specs/architecture/v2-overview.md#4-seven-operations
Detail: Of the seven operations, `format` is Phase 10 by ADR-0033, `recall` is
Phase 11, and `reindex`/`doctor` are Phase 9. That leaves `capture` and `link` as
Phase 8's natural surface — the two that exercise the new model end to end without
borrowing a later phase's deliverable. A library-only release was considered and
rejected: v0.7.0 would be a release nobody could run, and it would delay finding out
whether the model survives contact with a real vault.

---

### [DECISION] 2026-08-12 — BUG-001 is re-specified as tests, not ported as code
Topics: clean-room, regression, testing, format
Affects-phases: phase-8-core
Affects-specs: none
Detail: Deleting v1 discards the percent-encoding fix from v0.6.5 (CommonMark §6.3,
14 tests) — behaviour that was learned the hard way. Clean-room forbids copying the
implementation, but it does not license re-introducing a shipped fix as a fresh bug.
Group 0 therefore lands the BUG-001 cases as **failing specs** in the new codec's
test file before any deletion, which is also exactly what TDD wants. Generalised
into a Group 0 task: sweep all 229 v1 tests for behavioural assertions worth
re-specifying, and record what was found.

---

### [ARCH_CHANGE] 2026-08-12 — The two import rules become lint-enforced
Topics: architecture, tiering, lint, dependency-inversion
Affects-phases: phase-8-core
Affects-specs: specs/architecture/v2-overview.md#2-modules-ports-and-codecs
Detail: `v2-overview.md` §2 states two rules — `core/` may import nothing but
`core/`, and nothing above `format/` may see format-shaped data — and notes both are
"enforceable by lint". Phase 8 actually enforces them, and Group 7 verifies the
enforcement by committing a deliberate violation and confirming the build fails.
This is what makes ADR-0024's three-tier claim checkable in a diff rather than
aspirational; an architecture rule nobody can violate accidentally is the only kind
that survives.

---
