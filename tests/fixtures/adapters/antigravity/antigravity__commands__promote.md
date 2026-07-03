---
name: promote
description: Import a momentum ADR/learning as an OKF concept
---

Promote a momentum artifact (an ADR or a history/learning entry) into this
vault as a one-way, point-in-time OKF `Reference` concept.

1. Identify the momentum source file by path (Engram reads it as plain text —
   no momentum tooling is invoked).
2. Preview first:
   `engram promote <path/to/adr.md> --dry-run`
3. If the rendered concept validates, write it:
   `engram promote <path/to/adr.md> --to references --tags a,b`

The concept maps to `type: Reference`, derives a one-sentence `description`
from the ADR `## Decision` (override with `--description`), carries a
`# Source` provenance block, and passes the OKF validator as a hard pre-write
gate. It is a snapshot — Engram never syncs changes back to momentum.
