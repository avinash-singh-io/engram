# Promote golden corpus — v1 (LOCKED)

> Version tag: **v1** · locked in Phase 4. Do not mutate these expected outputs
> to make a run look better (Rule 11). A change to the promote mapping that
> alters output is a **v2** corpus, not an edit to v1.

## Layout

- `sources/*.md` — sample momentum artifacts modeled on the real momentum ADR
  and history/learning templates (`# NNNN — Title` + `> **Status/Date**`;
  `[TYPE] DATE — title` + `Topics:` + `Detail:`).
- `expected/<name>.concept.md` — the OKF concept `engram promote` renders from
  the matching source.
- `expected/<name>.meta.json` — `{ targetPath, ok, logLine }` for that source.

## Canonical inputs (used by the golden test)

| source | sourcePath (fixed for determinism) | targetDir |
|--------|------------------------------------|-----------|
| `adr-shared-engine.md` | `momentum/decisions/0007-vendor-shared-engine.md` | `references` |
| `learning-entry.md` | `momentum/phases/phase-3-loop/history.md` | `references` |

Every expected concept passes `validateConcept` with zero errors — that is the
promote write gate (ADR-0012).
