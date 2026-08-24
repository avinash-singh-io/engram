---
name: momentum-validate
description: Check spec structure health of the momentum project. Activates when the user runs `/validate`, asks for a health check, or when spec changes need verification before phase completion.
---

# momentum-validate

When spec health validation is needed:

1. Read `specs/status.md` — verify required fields are present
2. Read `specs/backlog/backlog.md` — verify all 4 section tables
3. For each phase directory under `specs/phases/`: verify all required files
   and frontmatter
4. Check `.momentum/installed.json` — verify schema and agent entries
5. Verify `AGENTS.md` or `CLAUDE.md` primary instruction file has the
   `## Project Extensions` marker
6. Report all failures found

This skill supports the `/validate` command for deep spec structure checks.
Use it proactively before `/complete-phase` to catch structural issues early.

## When NOT to apply

- During active implementation work (validation should not interrupt flow)
- When the user explicitly asks for no validation

## References

- `/validate` command — run health checks
- `specs/status.md` — project status
- Rule 9 in `AGENTS.md` — doc sync protocol
