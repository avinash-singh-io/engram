# Phase 19 — Retrospective

## What shipped

opencode is a first-class engram host: the contract via native `AGENTS.md`, all
six operations plus vault skills rendered flat into `.opencode/skills/`, and every
operation reachable as `/engram-<op>` from `.opencode/commands/`. The descriptor
model gained its second render-target type (commands), `doctor` now shows one row
per registered agent with what is rendered where and which claims are verified,
and `docs/adapters.md` finally describes the seam as it exists — with an
evidence-backed checklist for the next agent.

## Verification evidence

| Gate | Command | Result |
|---|---|---|
| Whole check | `npm run check` | green — typecheck, lint, format, **924 tests**, build, 5 smokes incl. new `smoke:opencode` |
| Built-binary surface | `node scripts/smoke-opencode.mjs` | 17 checks: flat skill renders w/ name-matching dirs, commands w/ description + `$ARGUMENTS` + marker, idempotent reindex, nothing indexed, gitignore covers commands |
| Live discovery (T0) | headless opencode session | probe skill listed; `AGENTS.md` injected; unknown frontmatter tolerated (`evidence/t0-discovery-probe.md`) |
| Live session (G4) | headless opencode vs built-binary vault | six `engram-*` skills + unprefixed user skill listed; rules = `AGENTS.md`; contract question answered correctly (`evidence/live-session.md`) |

**Still manual**: executing `/engram-capture <text>` in a real TUI session.
Headless `opencode run` cannot execute slash commands (verified twice). The
command files themselves are smoke-checked against the built binary; the owner
confirms execution once — expected to pass, and it is the only remaining piece of
acceptance criterion 7.

## What was learned

- **Grounding before code paid for itself.** The live docs check confirmed the
  root cause (one-level discovery vs two-level plugin nesting) and killed three
  design risks before a line was written — frontmatter compatibility turned out
  to be already solved by `renderedName()` and flat metadata.
- **The probe changed one thing worth knowing**: commands are TUI-only. That
  moved part of acceptance criterion 7 to the owner instead of surprising anyone
  at review time.
- **`git add -A` in a dirty tree sweeps unrelated work in.** G0's commit carried
  momentum runtime state and `.bak` files; untracked-with-ignore-rules followed
  immediately (`dc48117`). Stage paths, not everything.

## Debt and follow-ups

- codex re-entry is now a checklist exercise, not a project — deliberately left
  for a follow-up so this phase stayed one shape of work.
- MCP wiring docs for opencode (`opencode.json` mcp stanza) remain undocumented;
  works today, docs-only follow-up.
- TD-008 (P1) untouched by design this phase; still next.
