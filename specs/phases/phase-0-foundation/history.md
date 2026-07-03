# Phase 0 — History

> Append-only. Log meaningful decisions, scope changes, discoveries (Rule 8).
> Format below; newest entries at the bottom.

### [NOTE] 2026-07-03 — Phase 0 scaffolded from PRD
Topics: engine-primitives, okf-format, tooling
Affects-phases: phase-0-foundation
Affects-specs: specs/vision/project-charter.md, specs/planning/roadmap.md
Detail: Project initialized from the Engram PRD via /start-project. Repo type =
standard single package; stack = TypeScript/Node; roadmap adds a Phase 0
bootstrap ahead of the PRD's Phases 1–5. Seven ADRs (0001–0007) recorded the
load-bearing decisions.

---

### [DECISION] 2026-07-03 — Seven foundational ADRs accepted
Topics: engine-primitives, okf-format, links-wikilinks, sync, retrieval, indexes, tooling
Affects-phases: all
Affects-specs: specs/decisions/0001-*.md … 0007-*.md
Detail: Accepted ADR-0001 (separate product, shared engine), 0002 (OKF v0.1),
0003 (standard links not wikilinks), 0004 (git source of truth), 0005
(navigate-first retrieval; RAG optional), 0006 (auto-generated indexes), 0007
(TypeScript single-package MVP; engine extraction deferred to TD-001).

---

### [EVALUATOR] 2026-07-03 — Validator fixtures corpus locked as v1
Topics: okf-format, tooling
Affects-phases: phase-0-foundation
Affects-specs: specs/phases/phase-0-foundation/plan.md#group-2
Detail: The frontmatter-validator fixtures corpus is the locked evaluator for
Phase 0 (Rule 11). Freeze v1 before any validator-tuning loop; corpus changes
go to a v2, never mutate v1.

---
