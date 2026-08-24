---
name: momentum-lanes
description: Work with concurrent workstreams (Rule 15). Activates when the session involves multiple active branches, cross-lane coordination, or when starting work that should not live on the current branch.
---

# momentum-lanes

Use this skill when you detect concurrent workstreams or need to coordinate
across branches. Key behaviors:

1. **Lane binding**: your phase is the phase bound to your branch
   (`phase-N-shortname`). `specs/status.md` is the cross-lane overview.
2. **Lane-scoped tracking**: write ONLY your own phase's artifacts
   (`tasks.md`, `history.md`, `evidence/`). Shared files (`status.md`,
   `backlog.md`, `changelog/`) are append / own-row-touch only.
3. **Landing order**: one lane at a time, suite green on updated `main`
   between landings, remaining lanes rebase.

When the user starts a second workstream or asks about what's in flight,
read the lane board before proceeding.

## When NOT to apply

- Single-lane, single-branch sessions with no cross-lane coordination

## References

- Rule 15 in `AGENTS.md` — concurrent workstreams
- `/lanes` command — board, queue, signal, land
- `specs/status.md` — cross-lane overview
