# Phase 1 — MVP Vault + Claude Code — Retrospective

> **Completed**: 2026-07-03 · **Release**: v0.2.0 · **Branch**: `phase-1-mvp-vault`

## Summary

Turned the Phase 0 format core into a working product: `engram init` scaffolds an
OKF vault; `capture`/`refine`/`link`/`reindex` maintain it; a PostToolUse
write-hook keeps it valid, indexed, and logged with zero manual index
maintenance. Shipped the **shared foundations** (register-hook dispatch, canonical
vault walker, adapter seam, serializer, reusable reindex/log libs) that make
Wave 2 genuinely parallel.

## What went well

- **Shared foundations landed as designed.** The `register?()` dispatch + single
  loop means Phases 2/3/4 each add one registry entry, not a shared-file edit.
- **Determinism held.** `reindex --check` is a clean idempotency gate; the e2e
  test asserts run-twice-no-diff.
- **Fail-loud write-hook** is a pure function over a payload — fully unit-tested
  without Claude Code in the loop.

## What didn't (and how it was handled)

- **Root-index pollution bug:** a scaffolded doc at the vault root got indexed as
  an empty concept. Fixed structurally by relocating non-concept docs into the
  `.engram/` sidecar (ADR-0009) rather than special-casing a filename.
- **Flow-style tags padding:** yaml renders `[ a, b ]`; normalized to the OKF
  fixture convention `[a, b]`.
- **CliError refactor:** commands threw `process.exit`, which made the reject path
  untestable; switched to a `CliError` caught at the CLI boundary.

## Lessons / carry-forward

- The vault walker is now the single enumeration source — Phases 2/3/5 must
  consume `readVault`, not fork it (biggest cross-phase risk per the plan).
- Phase 2 depends on the **nested child-index links** the generator emits; keep
  that contract stable.

## Deferred
- Affected-only reindex (currently full-read, diff-write — bounded enough for v0.2.0).
- npm publish still deferred until the retrieval story (Phase 2) lands.

## Verification Evidence

Captured fresh 2026-07-03 (Rule 12).

### `npm run check` (typecheck + lint + format:check + test + build)

```
exit code: 0
All matched files use Prettier code style!
      Tests  52 passed (52)
ESM ⚡️ Build success
DTS ⚡️ Build success
```

### End-to-end (built binary, temp vault)

```
$ engram init            # scaffolds AGENTS.md, log.md, inbox/, .engram/, .claude/, index.md
$ engram capture "…"     # -> inbox/<stamp>-<slug>.md
$ engram refine inbox/…  --type Reference --title … --description "…" --tags … --to system-design/temporal.md
$ engram reindex --check # engram: indexes up to date  (exit 0 — idempotent)
$ engram link system-design/temporal --to system-design/idempotency   # inserts absolute See-also link
# PostToolUse hook: valid concept -> exit 0; invalid (no frontmatter) -> "missing-frontmatter", exit 2
```

### Acceptance criteria
All 11 criteria in `overview.md` met: init scaffolds + is non-destructive +
deep-merges settings; capture/refine/link/reindex work; refine is validate-gated;
reindex is idempotent; the write-hook validates/reindexes/logs and fails loud;
`npm run check` exit 0; the public command surface is unchanged with the hidden
hook registered.
