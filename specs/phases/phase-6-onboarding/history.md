# Phase 6 — History

### [NOTE] 2026-07-03 — Phase 6 opened: onboarding & OKF migration
Topics: adapters, migration, onboarding
Affects-phases: phase-6-onboarding
Affects-specs: specs/phases/phase-6-onboarding/overview.md
Detail: Prompted by setting up a real vault (~/Workspace/Knowledge Base): engram
should resolve setup issues and adopt existing notes through the tool, not by
hand. Adds an editor-adapter layer (Obsidian first; engram stays editor-agnostic),
`init` auto-setup (editor + git), agent native instruction pointers (Claude →
CLAUDE.md, fixing a real gap), and `engram migrate` for OKF adoption.

---

### [DISCOVERY] 2026-07-03 — Claude adapter emitted no CLAUDE.md
Topics: adapters
Affects-phases: phase-6-onboarding
Affects-specs: specs/decisions/0011-adapters-converge-on-agents-md.md
Detail: Phase 4 converged all agents on AGENTS.md, but Claude Code's native file
is CLAUDE.md and it does not reliably auto-load AGENTS.md — so Claude Code got no
vault contract. Fix (this phase): each agent adapter emits its native
instructions file as a thin pointer to AGENTS.md.

---
