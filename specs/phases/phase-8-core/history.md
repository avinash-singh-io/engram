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

### [DISCOVERY] 2026-08-12 — The v1 sweep found two behaviours worth rescuing, not one
Topics: clean-room, regression, format, testing
Affects-phases: phase-8-core, phase-9-structure
Affects-specs: none
Detail: BUG-001's percent-encoding was the known one — 22 cases covering the full
CommonMark §6.3 matrix: only breaking characters encoded (`&`, `+`, `—` stay
readable), parens balanced, literal `%` encoded, per-segment `/` preservation,
path and `#fragment` encoded independently, external URLs untouched, no
double-encoding, idempotent, and decode total on malformed escapes. The second was
**frontmatter parsing robustness** — CRLF tolerated, leading BOM stripped, absent
block flagged rather than thrown, invalid YAML captured as `null` + error rather
than thrown. That last one is load-bearing for ADR-0026: a parser that throws makes
"capture never rejects" impossible to honour upstream, so it is a Phase 8 concern
rather than a nicety. Two further behaviours were found and deliberately **not**
rescued here: reserved-file detection (`index.md`, `log.md`, `AGENTS.md` at any
depth) and enumeration-only concept counting both belong to `reindex`/views in
Phase 9. Noted for that phase.

---

### [DECISION] 2026-08-12 — Rescued specs land skipped, not failing
Topics: testing, tdd, methodology
Affects-phases: phase-8-core
Affects-specs: none
Detail: The plan said "land BUG-001 cases as failing specs". Executing it showed the
cost: 22 known-failing tests would leave `npm run check` red from Group 0 until
Group 3, which destroys the suite as a signal for Groups 1–2 — a genuine regression
there would hide in the noise. The assertions are therefore preserved verbatim under
`describe.skip` with an explicit `UNSKIP IN GROUP 3` marker in every block name, and
Group 7's acceptance sweep verifies no `describe.skip` survives the phase. The TDD
property that matters is that the specification precedes the implementation; whether
it is red or skipped in the interim is a reporting choice, not a discipline one.

---

### [ARCH_CHANGE] 2026-08-12 — Both import rules enforced, and both proven to fire
Topics: architecture, tiering, lint, dependency-inversion
Affects-phases: phase-8-core
Affects-specs: specs/architecture/v2-overview.md#2-modules-ports-and-codecs
Detail: Rule 1 — `core/` may import only `core/` — is implemented with an addition
the spec does not state: **node builtins are forbidden too**, because a core that
can read a file is a core that eventually will, and `core/ports.ts` exists precisely
so it does not have to. Rule 2 is enforced at its only observable seam: a versioned
codec (`format/okf-*`) is importable from `format/` alone; everything else goes
through the registry, which normalises into the internal model first. Verifying the
rules by deliberately violating them caught a real config bug — eslint flat config is
last-wins *per rule*, so the broad `src/**` block was silently replacing rule 1's
patterns and leaving `core/` completely unguarded. An architecture rule nobody has
watched fire is not a control.

---

### [NOTE] 2026-08-12 — recall-v1 survives as an orphaned corpus
Topics: evaluator, rule-11, retrieval
Affects-phases: phase-8-core, phase-11-retrieval
Affects-specs: none
Detail: `tests/benchmarks/recall-v1/` (126-concept vault + `eval.json`) is preserved
per Rule 11 — a locked evaluator is never deleted, it is superseded. Its consumer
(`tests/retrieval/recall-bounded.test.ts`) went with the v1 deletion, so the corpus
is now orphaned until Phase 11 either adopts or version-bumps it. Phase 11 must also
weigh it against the 32 real structural questions extracted in Phase 7: recall-v1 is
synthetic and lookup-shaped, which is precisely what Phase 11 is *not* required to
beat.

---

### [DECISION] 2026-08-12 — Model shape: `isEmpty` is derived, and the `until` boundary is inclusive
Topics: core-model, node-edge, primitives
Affects-phases: phase-8-core
Affects-specs: none
Detail: Two choices the ADRs leave open, settled while writing `core/model.ts`
test-first. **`isEmpty` is derived, not stored**, and a whitespace-only body counts
as empty — a node whose body is `"  \n "` is a name you can point at, not content,
and storing the flag separately would let it drift from the body it describes.
**`isExpired` treats `until` as inclusive**: an assertion valid "until 2026-12-31"
still holds *at* that instant. Exclusive would silently invalidate a claim on the
last day it was meant to hold, which is the kind of off-by-one that makes a validity
filter untrustworthy. Both are asserted by tests rather than left to convention. Also
pinned by test: no `okf_version` may appear on the model — that belongs to the codec
(ADR-0032), and a leak there is how the core starts depending on someone else's
schema.

---

### [DECISION] 2026-08-12 — Every port is total; nothing beneath the gate throws
Topics: ports, substrate, capture, interface-segregation
Affects-phases: phase-8-core
Affects-specs: none
Detail: `FileStore.read` returns `null` for a missing file and `Detector.has`
returns `false` for an unknown fact — neither throws. This is not defensive
programming, it is what makes ADR-0026's "capture never rejects" honourable: a
promise made at the top cannot be kept if a layer beneath it can throw. The same
property was rescued from v1's frontmatter parser in the Group 0 sweep, so it now
holds consistently from the substrate up. Interface segregation is asserted by test
rather than by convention: a time-only consumer takes a `Clock` and nothing else, a
storage-only consumer takes a `FileStore` and nothing else. If either ever needs
more, the segregation ADR-0032 required has been lost and a test says so.

---

### [DECISION] 2026-08-12 — A YAML subset, not a YAML dependency
Topics: format, codecs, dependencies
Affects-phases: phase-8-core
Affects-specs: none
Detail: `parseFrontmatter` implements a deliberately small YAML subset — scalars,
inline lists, inline maps, quoted strings — rather than pulling in a full engine.
OKF frontmatter is flat by design (ADR-0020), so a general parser would carry far
more surface than the format uses, and every byte of that surface is something a
malformed vault could reach. Anything outside the subset raises internally and is
converted to a `yamlError`, so the totality contract holds regardless. If OKF ever
needs nested structures this becomes a real dependency decision; until then it is
about 40 lines.

---

### [DECISION] 2026-08-12 — An unknown okf_version degrades rather than fails
Topics: format, codecs, degradation
Affects-phases: phase-8-core
Affects-specs: specs/architecture/v2-overview.md#12-degradation
Detail: `detectVersion` falls back to the default codec when a file declares a
version no codec speaks — including a *newer* one. The alternative, refusing to
read, means a vault touched by a future engram becomes unreadable by the copy in
front of you, which is the opposite of "depends on nothing above a directory of
files". Reading it degraded and saying so is strictly better than refusing. Writing
is the asymmetric case and does throw: silently emitting the wrong version would
corrupt a vault, where refusing merely inconveniences the caller.

---

### [ARCH_CHANGE] 2026-08-12 — Open/closed is now a test, not a claim
Topics: architecture, codecs, open-closed
Affects-phases: phase-8-core
Affects-specs: specs/architecture/v2-overview.md#2-modules-ports-and-codecs
Detail: ADR-0032 asserts "adding a spec version is adding a file. No existing code
changes." That is now asserted by a test which registers a stub codec at runtime and
proves dispatch, write and version-listing all pick it up while the existing versions
are unaffected. The registry holds a `Map` populated by `registerCodec`, so neither
`registry.ts` nor either codec has a branch naming a version. A design property that
is only claimed in prose drifts; one with a test does not.

---

### [DECISION] 2026-08-12 — A relation type must bring a detective form, not just semantics
Topics: relations, guardrails, architecture
Affects-phases: phase-8-core, phase-9-structure, phase-13-intelligence
Affects-specs: specs/architecture/v2-overview.md#7-guardrails
Detail: `RelationKind` requires four things: name, `invalidatesTarget`, a meaning,
and a **detective** description — what `doctor` scans for to find violations after
the fact. This makes ADR-0024's rule concrete at the type level: engram mediates
only some writes, since Obsidian and any agent with a shell write directly, so a
relation whose semantics can only be enforced at the gate is advisory rather than
enforced. A test asserts every registered type carries a non-empty detective form,
which means `contradicts` cannot land in Phase 13 without one.

---

### [DECISION] 2026-08-12 — An unregistered relation kind never invalidates
Topics: relations, validity, degradation
Affects-phases: phase-8-core, phase-11-retrieval
Affects-specs: none
Detail: `isValid` consults the registry, so an edge whose kind has no code behind it
is free association and carries no power to invalidate anything. This is ADR-0022's
"no code, no closed type" made operational rather than declarative: a user or agent
inventing `blocks:` or `vibes-with:` in frontmatter gets a recorded, readable,
Obsidian-visible edge that changes nothing about retrieval until someone registers
semantics for it. The failure mode this avoids is a hallucinated relation kind
silently invalidating a live decision.

---

### [DECISION] 2026-08-12 — "Never rejects" is proven adversarially, not by example
Topics: capture, testing, adr-0026
Affects-phases: phase-8-core
Affects-specs: none
Detail: ADR-0026 says capture never rejects. "Never" is a strong claim and a handful
of happy-path examples would not support it, so `capture` is tested against a
15-case adversarial set: empty and whitespace-only input, malformed and unterminated
frontmatter, null bytes, a lone surrogate, control characters, right-to-left text,
emoji with ZWJ sequences, CRLF, a leading BOM, and a 100,000-character single line.
Every case must round-trip byte-identical, because capture persists and does not
transform. One design consequence surfaced while writing it: a frozen clock makes
same-instant collisions the *normal* case in tests, so the inbox filename falls back
to a counter rather than erroring — which is also the right behaviour for a real
burst of captures.

---

### [DECISION] 2026-08-12 — capture skips the gate; link passes it
Topics: gate, capture, link, operations
Affects-phases: phase-8-core, phase-10-agent-surface
Affects-specs: specs/architecture/v2-overview.md#5-the-write-gate
Detail: The split follows what each operation asserts. `capture` claims nothing
about the vault — it is durability, and the inbox is a buffer rather than a stage
(ADR-0033), so there is nothing to validate against and no reason to risk losing a
thought. `link` claims something structural, and a wrong edge degrades retrieval for
everything downstream (ADR-0027: a graph that lies confidently is worse than no
graph), so it goes through validation. Phase 8's gate carries validation only; a
rejection already names the rule that fired, which is the shape Phase 10's guardrails
and approval queue will extend. Proven by test: a rejected change leaves the file
byte-identical, because the gate validates a proposed diff rather than a write.

---

### [NOTE] 2026-08-12 — The unreleasable window is closed
Topics: cli, releases, phasing
Affects-phases: phase-8-core
Affects-specs: specs/status.md
Detail: Group 6 restores a working CLI, closing the window declared in
`overview.md` at Group 0. `engram capture` and `engram link` run, and the check was
made against the **built** artifact (`node dist/cli.js`) rather than only the
TypeScript source — a build that typechecks is not the same claim as a binary that
runs, and the acceptance criterion was about the latter. `main` is releasable again.
Groups 0–5 spanned a single session, so the window cost far less than the plan
budgeted for.

---
