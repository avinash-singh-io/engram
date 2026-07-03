# Phase 0 — Tasks

> `[ ]` todo · `[/]` in-progress · `[x]` done. Mark `[x]` only after a
> verification command produced passing output this session (Rule 12).

## Group 0 — Package & Toolchain
- [x] Initialize `package.json` with `bin: engram` + scripts (build/test/lint)
- [x] Add `tsconfig.json` (strict mode)
- [x] Configure build (tsup, ESM, dts)
- [x] Configure test runner (vitest)
- [x] Configure lint (eslint flat config + prettier)
- [x] Add CI workflow (typecheck + lint + format + test + build)
- [x] Add `.gitignore` (`files: ["dist"]` in package.json replaces `.npmignore`)

## Group 1 — OKF Format Spec
- [x] Write internal OKF v0.1 conformance spec (`docs/okf-conformance.md`) — required fields, body, links, index/log rules, concept-ID, validator contract + locked error/warning codes

## Group 2 — Format Core Library
- [x] Frontmatter parser (YAML) — `src/format/frontmatter.ts` (BOM/CRLF tolerant)
- [x] Validator: required fields (type/title/description/tags/timestamp) — `src/format/validate.ts`
- [x] Validator: one-sentence `description` + length check
- [x] Validator: link-form checks (wikilink, non-absolute) — WARNING per NFR-5
- [x] Concept-ID / path resolver (ID ↔ path) — `src/format/concept-id.ts`
- [x] Locked validation fixtures corpus `v1` under `tests/fixtures/` (16 cases + `expected.json`)
- [x] Unit tests over the corpus — 27 tests green (17 fixture cases)

## Group 3 — CLI Skeleton
- [x] CLI entry with `commander`: `--version`, `--help` (`src/cli.ts` + `src/cli-program.ts`)
- [x] Subcommand registry stubs (init/capture/refine/link/reindex/recall/promote) — `src/commands/registry.ts`

## Group 4 — Verification
- [x] `npm test` green (validator passes valid, rejects malformed) — 30/30
- [x] `npm run build` green
- [x] `npm run lint` clean (+ typecheck + format:check via `npm run check`, exit 0)
- [x] Smoke: `engram --version` (0.1.0) and `engram --help` (exit 0); stub → exit 2
- [x] Capture fresh output as evidence for acceptance criteria (this session)
