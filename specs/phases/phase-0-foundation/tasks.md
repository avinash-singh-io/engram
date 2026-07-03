# Phase 0 — Tasks

> `[ ]` todo · `[/]` in-progress · `[x]` done. Mark `[x]` only after a
> verification command produced passing output this session (Rule 12).

## Group 0 — Package & Toolchain
- [ ] Initialize `package.json` with `bin: engram` + scripts (build/test/lint)
- [ ] Add `tsconfig.json` (strict mode)
- [ ] Configure build (tsup or tsc)
- [ ] Configure test runner (vitest)
- [ ] Configure lint (eslint + prettier)
- [ ] Add CI workflow (build + test + lint)
- [ ] Add `.gitignore` and `.npmignore`

## Group 1 — OKF Format Spec
- [ ] Write internal OKF v0.1 conformance spec (required fields, body, links, index/log rules, concept-ID)

## Group 2 — Format Core Library
- [ ] Frontmatter parser (YAML)
- [ ] Validator: required fields (type/title/description/tags/timestamp)
- [ ] Validator: one-sentence `description` check
- [ ] Validator: standard-link form check
- [ ] Concept-ID / path resolver (ID ↔ path)
- [ ] Locked validation fixtures corpus `v1` under `tests/fixtures/` (valid + malformed)
- [ ] Unit tests over the corpus

## Group 3 — CLI Skeleton
- [ ] CLI entry with `commander`: `--version`, `--help`
- [ ] Subcommand registry stubs (init/capture/refine/link/reindex/recall/promote)

## Group 4 — Verification
- [ ] `npm test` green (validator passes valid, rejects malformed)
- [ ] `npm run build` green
- [ ] `npm run lint` clean
- [ ] Smoke: `engram --version` and `engram --help`
- [ ] Capture fresh output as evidence for acceptance criteria
