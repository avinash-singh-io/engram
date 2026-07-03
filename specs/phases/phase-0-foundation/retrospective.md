# Phase 0 — Foundation — Retrospective

> **Completed**: 2026-07-03 · **Release**: v0.1.0 · **Branch**: `phase-0-foundation`

## Summary

Stood up the Engram package from empty to a green TypeScript/Node build with the
OKF format core — conformance spec, frontmatter validator, concept-ID resolver —
plus a commander CLI skeleton with all seven subcommand stubs. Everything later
phases build on now exists and is tested.

## What went well

- **Clean group sequencing.** `Group 0 → (1 ∥ 2) → 3 → 4` held; each group
  committed independently and stayed green.
- **Locked evaluator first (Rule 11).** The v1 fixtures corpus (16 files +
  `expected.json`) was written alongside the validator and drives a data-driven,
  exact-match test — behavior is pinned before any future tuning.
- **Spec-as-contract.** Writing `docs/okf-conformance.md` (Group 1) before the
  validator (Group 2) meant the error/warning code list was fixed up front.

## What didn't (and how it was handled)

- **ESM vs momentum's CJS git hooks.** Root `"type": "module"` made Node parse
  momentum's `.githooks/*.js` (CommonJS) as ESM and crashed the commit-msg hook.
  Fixed non-invasively with a `.githooks/package.json` `{"type":"commonjs"}`
  scope override. Logged as **TD-002** — must be re-checked after
  `momentum upgrade`.

## Lessons learned

- An ESM package layered on a momentum repo needs the `.githooks/` CJS scope
  override; bake this into the Phase 1 `engram init` scaffold guidance so vaults
  created in ESM repos don't hit the same wall.
- `prettier --check .` must ignore the markdown/specs tree, or doc formatting
  fights the code gate; the `.prettierignore` scoping resolved this cleanly.

## Deferred / follow-ups

- **TD-002** (P3, resolved-with-workaround) — re-verify hook scope after upgrade.
- **npm publish** deliberately deferred — no user-facing `engram init` yet and
  the `engram` name may be taken; publish when Phase 1 ships something runnable.

## Verification Evidence

Captured fresh on 2026-07-03 (Rule 12).

### `npm run check` (typecheck + lint + format:check + test + build)

```
exit code: 0

All matched files use Prettier code style!

 RUN  v2.1.9

 ✓ tests/cli.test.ts (3 tests)
 ✓ tests/smoke.test.ts (1 test)
 ✓ tests/concept-id.test.ts (4 tests)
 ✓ tests/frontmatter.test.ts (5 tests)
 ✓ tests/validate.test.ts (17 tests)

 Test Files  5 passed (5)
      Tests  30 passed (30)

ESM ⚡️ Build success  (dist/cli.js, dist/index.js)
DTS ⚡️ Build success  (dist/cli.d.ts, dist/index.d.ts)
```

### CLI smoke test

```
$ node dist/cli.js --version
0.1.0
$ node dist/cli.js --help      # exit 0, lists all 7 subcommands
$ node dist/cli.js promote     # stub → exit 2 ("not yet implemented — arriving in Phase 4")
```

### Acceptance criteria

All five criteria in `overview.md` met: build exit 0 · test exit 0 (30/30, incl.
17-case locked corpus) · lint/typecheck/format exit 0 · `engram --version`/`--help`
work · OKF spec committed.
