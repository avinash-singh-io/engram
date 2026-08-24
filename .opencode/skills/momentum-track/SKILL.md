---
name: momentum-track
description: Record a new backlog item (bug, feature, tech debt, or enhancement) when you discover work that needs tracking. Activates when the session identifies unplanned work that should be tracked in the backlog.
---

# momentum-track

When you discover something that should be tracked during a session
(a bug, a missing feature, tech debt, an enhancement), automatically:

1. Read `specs/backlog/backlog.md` to find the next available ID
2. Determine item type and prefix: `BUG-`, `FEAT-`, `TD-`, or `ENH-`
3. Add a row to the appropriate table with priority (infer from urgency), status `open`, and target phase or `unscheduled`
4. Mention the new item to the user: "I found [issue] and added it as [ID] to backlog"

This skill codifies Rule 3 (Auto-Track Discoveries) from the project rules.

## When NOT to apply

- If the user explicitly asks you not to track something
- If the issue is already tracked (check the backlog first)
- For purely conversational exploration where no work item is identified

## References

- `/track` command for manual tracking
- `specs/backlog/backlog.md` — the backlog file
- Rule 3 in `AGENTS.md` — auto-track discoveries
