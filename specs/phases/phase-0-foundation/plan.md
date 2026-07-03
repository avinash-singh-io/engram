# Phase 0 — Plan

# Execution order:  Group 0 → (Group 1 ∥ Group 2) → Group 3 → Group 4

The format core (Group 2) needs the toolchain (Group 0). The OKF spec doc
(Group 1) is documentation and can proceed in parallel with the format core once
Group 0 lands. Wiring (Group 3) then verification (Group 4) are sequential.

---

## Group 0 — Package & Toolchain
**Sequential.** Blocks everything.
**External deps:** Node ≥ 20, npm.
**Commit:** `infra: bootstrap TypeScript package + toolchain`

- `package.json` with `bin: { engram: ... }`, scripts (`build`, `test`, `lint`).
- `tsconfig.json` (strict).
- Build (tsup or tsc), test runner (vitest), lint (eslint + prettier).
- CI workflow (build + test + lint on push/PR).
- `.gitignore`, `.npmignore`.

## Group 1 — OKF Format Spec
**Parallel with Group 2** (both start after Group 0).
**External deps:** none.
**Commit:** `docs: define OKF v0.1 conformance spec`

- Internal OKF v0.1 conformance spec (PRD §7): required frontmatter fields,
  body conventions, standard-link form, `index.md` / `log.md` rules,
  concept-ID = path − `.md`.
- This is the contract the validator (Group 2) implements against.

## Group 2 — Format Core Library
**Parallel with Group 1** (needs Group 0).
**External deps:** a YAML parser (e.g. `yaml`).
**Commit:** `feat(format): frontmatter validator + concept-id resolver`

- Frontmatter parser (YAML) + validator: required fields, one-sentence
  `description`, standard-link form.
- Concept-ID / path resolver (ID ↔ path).
- **Locked validation fixtures corpus** under `tests/fixtures/` (Rule 11) —
  valid + malformed cases, versioned `v1`.
- Unit tests over the corpus.

## Group 3 — CLI Skeleton
**Sequential** (wiring; needs Groups 0 + 2).
**External deps:** an arg parser (e.g. `commander`).
**Commit:** `feat(cli): engram CLI skeleton + command registry`

- CLI entry (`commander`): `--version`, `--help`.
- Subcommand registry stubs: `init`, `capture`, `refine`, `link`, `reindex`,
  `recall`, `promote` (each prints "not yet implemented").

## Group 4 — Verification
**Sequential** (last; Rule 12 evidence gate).
**External deps:** none.
**Commit:** `test: phase-0 verification green`

- `npm test` green — validator passes valid fixtures, rejects malformed.
- `npm run build` green.
- `npm run lint` clean.
- Smoke: `engram --version` and `engram --help` run and produce expected output.
- Capture fresh command output as evidence for the acceptance criteria.
