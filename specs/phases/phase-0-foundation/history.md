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

### [NOTE] 2026-07-03 — Group 0 complete: TypeScript package + toolchain green
Topics: tooling
Affects-phases: phase-0-foundation
Affects-specs: none
Detail: Bootstrapped the ESM TypeScript package (`bin: engram`) with tsup build,
vitest, eslint 9 flat config + prettier, and a GitHub Actions CI workflow.
Verified fresh: build, typecheck, lint, format:check, and a smoke test all green;
`node dist/cli.js` prints `engram 0.1.0`. Used package.json `files: ["dist"]`
instead of a separate `.npmignore`.

---

### [DISCOVERY] 2026-07-03 — ESM package breaks momentum's CJS git hooks
Topics: tooling
Affects-phases: phase-0-foundation
Affects-specs: specs/backlog/backlog.md
Detail: Setting `"type": "module"` in the root package.json made Node parse
momentum's `.githooks/run-check.js` and `contract.js` (CommonJS `require`) as
ESM, which crashed the commit-msg hook. Fixed non-invasively with a
`.githooks/package.json` `{"type":"commonjs"}` scope override (no momentum file
touched). Tracked as TD-002 — must be re-verified after `momentum upgrade`,
which could add new `.js` hooks or remove the scope file.

---

### [DECISION] 2026-07-03 — OKF conformance spec: locked validator contract
Topics: okf-format
Affects-phases: phase-0-foundation
Affects-specs: docs/okf-conformance.md
Detail: Wrote the Engram OKF v0.1 conformance profile as the validator contract.
Split rules into ERROR (reject: missing/invalid required fields) vs WARNING
(allow: one-sentence/length heuristics, empty tags, link-form). Link checks are
WARNING-only to honor broken-link tolerance (NFR-5). The error/warning code list
is locked v1 alongside the fixtures corpus (Rule 11); changes go to a v2 spec.

---

### [NOTE] 2026-07-03 — Group 2 complete: format core library green
Topics: okf-format, tooling
Affects-phases: phase-0-foundation
Affects-specs: none
Detail: Implemented the format core in `src/format/` — frontmatter parser
(BOM/CRLF tolerant), the OKF validator (error/warning codes per the spec),
link extraction/classification, and the concept-ID/path resolver. Locked a v1
fixtures corpus (16 files + `expected.json`) driving a data-driven test. Verified
fresh: 27/27 tests, typecheck, lint, format:check, and build all green; dist
exports the full format API.

---
