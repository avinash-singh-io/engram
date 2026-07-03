# Phase 4 — History

> Append-only (Rule 8). Newest at the bottom.

### [NOTE] 2026-07-03 — Phase 4 started (Wave 2, parallel with Phases 2 & 3)
Topics: engine-primitives, ecosystem
Affects-phases: phase-4-ecosystem
Affects-specs: specs/phases/phase-4-ecosystem/overview.md
Detail: Two deliverables share Phase 1's engine — (1) Codex + Antigravity
adapters that reuse the shipped `Adapter.files(assetsRoot)` seam and the root
`AGENTS.md` traversal contract, (2) a one-way `/promote` bridge importing a
momentum ADR/learning as an OKF `Reference` concept behind the `validateConcept`
gate. Reads momentum artifacts by file path only (no code dependency, ADR-0001).

---

### [ARCH_CHANGE] 2026-07-03 — Adapter seam reused as-is; extended, not reshaped
Topics: engine-primitives, ecosystem, adapters
Affects-phases: phase-4-ecosystem
Affects-specs: specs/architecture/overview.md
Detail: Phase 1 shipped a file-based adapter seam (`Adapter.files(assetsRoot):
AdapterFile[]`), not the `agentFile()/commandFiles()` shape the design imagined.
Reused it verbatim and extended `AdapterFile` with an inline `content?` field so
adapters can render command surfaces from one shared `COMMAND_DEFINITIONS` set
instead of forking per-agent asset files. A new agent is a descriptor.

---

### [DECISION] 2026-07-03 — ADR-0010 (adapters) & ADR-0011 (promote) authored
Topics: adapters, promote, ecosystem, engine-primitives
Affects-phases: phase-4-ecosystem
Affects-specs: specs/decisions/0010-adapters-converge-on-agents-md.md, specs/decisions/0011-promote-one-way-reference-snapshot.md
Detail: ADR-0010 — Codex/Antigravity converge on the shared root AGENTS.md plus a
thin per-agent wrapper rendered from one COMMAND_DEFINITIONS set; a new agent is a
descriptor. ADR-0011 — /promote imports momentum artifacts as one-way Reference
snapshots with a # Source provenance block, reading momentum by file path only
(no code dependency, upholds ADR-0001); validateConcept is a hard pre-write gate.
Added `adapters`, `promote`, `ecosystem` topics to impact-map.json.

---

### [EVALUATOR] 2026-07-03 — Locked v1 golden corpora for promote + adapters
Topics: promote, adapters, ecosystem
Affects-phases: phase-4-ecosystem
Affects-specs: tests/fixtures/promote/README.md
Detail: Locked `tests/fixtures/promote/` (sample momentum ADR + learning entry →
byte-exact expected concepts, validated ok) and `tests/fixtures/adapters/`
(per-agent emitted command surfaces) as v1. Any mapping/rendering change that
alters output is a v2 corpus, never an edit to v1 (Rule 11).

---

### [NOTE] 2026-07-03 — Phase 4 built and verified (npm run check exit 0)
Topics: adapters, promote, ecosystem
Affects-phases: phase-4-ecosystem
Affects-specs: specs/phases/phase-4-ecosystem/tasks.md
Detail: All 5 groups complete — Codex + Antigravity adapters and the one-way
/promote bridge. `npm run check` exit 0 with 94 tests (42 new this phase);
built-binary smoke (init --agent all → dry-run → promote → reject bad-date, exit
2) green. Shared-file edits to reconcile on landing: src/commands/registry.ts
(promote register), tests/cli.test.ts (stub guard), src/adapters/* + init.ts.

---
