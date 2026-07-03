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
