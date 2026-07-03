# Phase 0 — Foundation

> **Status**: planned
> **Branch**: `phase-0-foundation`
> **Target release**: v0.1.0

## Goal

From an empty package to a green TypeScript/Node build with the **OKF format
core** — the conformance spec, the frontmatter validator, and the concept-ID
resolver — that every later phase depends on. This phase ships no user-facing
vault; it lays the foundation the MVP (Phase 1) builds on.

## Scope

### In
- TypeScript/Node package + toolchain + CI ([ADR-0007](../../decisions/0007-typescript-single-package.md)).
- Internal **OKF v0.1 conformance spec** (the format contract, per PRD §7).
- **Frontmatter parser + validator**: required fields (type/title/description/
  tags/timestamp), one-sentence `description`, standard-link form.
- **Concept-ID / path resolver** (ID = path − `.md`).
- **Locked validation fixtures corpus** (Rule 11) — valid + malformed cases.
- **CLI skeleton**: `engram --version`, `engram --help`, subcommand registry stubs.

### Out
- `engram init` and vault scaffolding (Phase 1).
- Index generation and write-hooks (Phase 1).
- Any agent adapter command behaviour beyond stubs (Phase 1).
- Retrieval / `/recall` (Phase 2).

## Deliverables

| # | Deliverable | Acceptance signal |
|---|-------------|-------------------|
| D1 | TS/Node package + toolchain + CI | `npm run build`, `npm test`, `npm run lint` all green in CI |
| D2 | OKF v0.1 conformance spec | Spec doc committed, covers §7 rules |
| D3 | Frontmatter parser + validator | Classifies the fixture corpus 100% correctly |
| D4 | Concept-ID / path resolver | Unit-tested; round-trips path ↔ ID |
| D5 | Locked fixtures corpus | Versioned under `tests/`; valid + malformed cases |
| D6 | CLI skeleton | `engram --version` / `engram --help` succeed |

## Acceptance Criteria (Rule 12 — evidence required)

- [ ] `npm run build` exits 0 (fresh output this session)
- [ ] `npm test` exits 0 — validator passes all valid fixtures, rejects all malformed
- [ ] `npm run lint` exits 0
- [ ] `engram --version` prints the version; `engram --help` lists stub commands
- [ ] OKF v0.1 conformance spec committed and reviewed

## Dependencies / Risks

- **Evaluator discipline (Rule 11):** the fixtures corpus is the *locked
  evaluator* for the validator. Freeze it before any validator-tuning loop;
  changes go to a `v2` corpus, never mutate `v1`.
- OKF v0.1 is young; capture the exact rules we implement so drift is visible.
- No external service dependencies in this phase.
