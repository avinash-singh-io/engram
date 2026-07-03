Check the spec structure health of the current momentum project.

Run with no arguments for a fast index-first check, or pass `--deep` for a full scan.

> **Which phase is yours (Rule 15):** the phase bound to your branch;
> `status.md` is the fallback and the cross-lane overview. Validation checks
> the whole board, not just your lane.

## Default Mode (index-first)

1. Read `specs/status.md` — verify required fields are present:
   - `Last Updated`, `Current Phase`, `Latest Release`, `Health`
   - Active Phase table exists. **"No active phase" is a VALID state** — a
     single row reading `_(none)_` / `no active phase` (e.g. between phases, or
     during ad-hoc `/hotfix` work) is NOT a failure. **Multiple rows are also
     valid** — one row per active lane (Rule 15, concurrent workstreams). Only
     flag a structurally missing/empty table.
   - Report any missing fields as failures

2. Read `specs/backlog/backlog.md` — verify all 4 section tables present:
   - Bugs, Features, Tech Debt, Enhancements
   - Report any missing table as a failure

3. Read `specs/phases/index.json` — for each phase listed:
   - Verify directory exists at `specs/phases/<phase-id>/`
   - Verify all 4 files present: `overview.md`, `plan.md`, `tasks.md`, `history.md`
   - Report missing directories or files as failures

4. Cross-check active phase consistency:
   - If an active phase is named, it must be listed in `index.json` and its
     directory must exist — report mismatch as a failure. With multiple active
     lanes (Rule 15), check EVERY row: each row's branch must bind to an
     existing phase directory listed in `index.json`.
   - If `Current Phase` is "none" / no active phase, **skip this check** (valid
     between-phases state).

5. Check `.claude/commands/` for standard momentum commands:
   - Required: `brainstorm-idea`, `brainstorm-phase`, `start-project`, `start-phase`,
     `complete-phase`, `log`, `sync-docs`, `track`, `migrate`, `validate`, `hotfix`
   - Report any missing commands as warnings (not failures — project may predate them)

6. Report results:
   ```
   ✓ N checks passed
   ✗ N issues found:
     - specs/phases/index.json: phase-3-gap-fixes directory missing
     - specs/status.md: missing field "Latest Release"
   ```

## `--deep` Flag (full scan)

Run all default mode checks, then additionally:

7. Walk ALL directories under `specs/phases/` — flag any directory not listed in
   `index.json` as an orphaned phase

8. For each phase directory, read `tasks.md`:
   - Extract all backlog ID references: `BUG-NNN`, `FEAT-NNN`, `TD-NNN`, `ENH-NNN`
   - Verify each ID exists as a row in `specs/backlog/backlog.md`
   - Report unresolved IDs as failures

9. For each phase directory, read `history.md`:
   - Verify each entry has all required fields: type tag `[TYPE]`, date in `YYYY-MM-DD`
     format, `Topics:`, `Affects-phases:`, `Affects-specs:`, `Detail:`
   - Report malformed entries (missing fields) as warnings

10. Check `specs/changelog/` — for each phase with status `complete` in `index.json`,
    verify at least one changelog file exists under `specs/changelog/`
    - Report completely absent changelog as a warning

11. Swarm member integrity (Phase 17+, only when ecosystem context exists):
    - For each `<ecosystem-root>/swarms/<id>/manifest.json`:
      - Validate against `core/swarm/schema/manifest.schema.json` (load + structural check)
      - Every `manifest.repos.<id>` must reference a real `ecosystem.json` member
      - Each repo's `phase_slug` must point at an existing phase directory
        in that member repo
    - For every phase brief that carries swarm frontmatter (parsed via
      `core/swarm/lib/brief.js`):
      - `swarm:` must resolve to a real swarm manifest at the ecosystem root
      - `wave:` must match the wave that swarm has assigned this repo
      - `initiative:` must match the swarm manifest's `initiative` field
      - Report mismatch as a failure
    - For every swarm with `status: complete`, verify the initiative's
      `Per-repo contributions` section lists all swarm members.
    - Report unresolved swarm references as failures; report orphaned
      brief frontmatter (swarm: refers to non-existent swarm) as failures.

12. Append deep-scan results to the report before printing.
