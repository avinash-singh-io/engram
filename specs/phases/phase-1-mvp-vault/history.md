# Phase 1 — History

> Append-only (Rule 8). Newest at the bottom.

### [NOTE] 2026-07-03 — Phase 1 planned from parallel brainstorm
Topics: engine-primitives, okf-format, tooling
Affects-phases: phase-1-mvp-vault
Affects-specs: specs/planning/parallel-execution-plan.md
Detail: Design produced by a 6-agent parallel brainstorm of the whole roadmap.
Phase 1 is Wave 1 (the sole runway) and MUST ship the shared foundations
(register-hook dispatch, canonical vault walker, adapter interface, AGENTS.md
writer, serializer, reusable reindex/log libs) that make Wave 2 (Phases 2/3/4)
genuinely parallel rather than serial-by-conflict.

---

### [DECISION] 2026-07-03 — ADR-0008 & ADR-0009 to be authored
Topics: tooling, okf-format
Affects-phases: phase-1-mvp-vault
Affects-specs: specs/decisions/0008-write-hook-mechanism.md, specs/decisions/0009-engram-config-sidecar.md
Detail: Two ADR-worthy decisions surfaced. ADR-0008: the write-hook is a hidden
`engram hook` subcommand driven by a scaffolded Claude Code PostToolUse hook
(reads payload on stdin), fail-loud on validation error — not a shell/git hook.
ADR-0009: introduce a non-OKF `.engram/` tooling sidecar (config + concept
template) distinct from vault content. Both authored in G8.

---

### [DISCOVERY] 2026-07-03 — Root-index pollution → `.engram/` sidecar fix
Topics: okf-format, indexes
Affects-phases: phase-1-mvp-vault
Affects-specs: specs/decisions/0009-engram-config-sidecar.md
Detail: A scaffolded doc at the vault root (OBSIDIAN-SETUP.md) was enumerated and
indexed as an empty concept. Fixed structurally by relocating non-concept docs
into the `.engram/` sidecar (dotdir, excluded from enumeration) rather than
special-casing a filename — motivated ADR-0009.

---

### [NOTE] 2026-07-03 — Phase 1 complete and verified (v0.2.0 pending)
Topics: tooling, okf-format, vault, indexes
Affects-phases: phase-1-mvp-vault
Affects-specs: specs/phases/phase-1-mvp-vault/retrospective.md
Detail: All 9 groups built and verified — `npm run check` exit 0, 52 tests, e2e
from the built binary green. Shipped the shared foundations (register-hook
dispatch, canonical vault walker, adapter seam, serializer, reindex/log libs)
that make Wave 2 parallel. Awaiting merge to main + tag v0.2.0.

---
