# Phase 15 — Tasks

> Legend: `[ ]` todo · `[/]` in progress · `[x]` done
> Execution: Group 0 → Group 1 → (Groups 2 + 3 parallel) → Group 4 → Group 5 → Group 6
> **TDD is on** (Rule 13) — the failing test comes first in every group.

## Group 0 — ADR-0041 and the skill schema — blocks everything

- [x] Write **ADR-0041** — the MCP surface amends ADR-0034's trust boundary
- [x] Record what actually changes: a listening socket where there was none, so the
      security story stops being structural and becomes configured
- [x] Record the three constraints as **acceptance criteria, not defaults**
- [x] Record what is **not** solved: no authentication; localhost + opt-in is the
      whole control, and reverting restores the structural property in full
- [x] Skill schema — `name`, `description`, `uses`, `emits`, `guardrails`, `origin`
- [x] Correct **FEAT-004** to `resolved` — verified against shipped code and its
      30 tests, not against a document
- [x] **Found and removed two dead runtime dependencies** — `commander` and `yaml`,
      unimported since Phase 8's rewrite but still shipped to every installer.
      Engram now has **zero runtime dependencies** (TD-005)
- [x] Verify: `npm run check` exits 0 — 373 tests, with both deps gone

## Group 1 — Skills: discover, validate, expose

- [ ] Tests first
- [ ] Discover built-ins + `.engram/skills/*.md`
- [ ] **Vault-local wins** on a name collision
- [ ] Reject a skill whose `uses:` names an operation that does not exist, **naming
      the offending operation**
- [ ] Reject a skill whose `guardrails:` would **loosen**; accept one that tightens
- [ ] A tightened guardrail actually applies when the skill is in force
- [ ] Reject a malformed skill loudly — never skip it silently
- [ ] List discovered skills in `AGENTS.md`
- [ ] Verify: `npx vitest run tests/policy/skills.test.ts`

## Group 2 — MCP over stdio — parallel with 3

- [ ] Tests first
- [ ] Six operations as typed tools with JSON schemas
- [ ] Skills as **prompts**, not tools — engram does not execute them
- [ ] Every tool routes to the same operation the CLI calls (translation only)
- [ ] A tool call that the gate rejects returns the rule that fired
- [ ] Verify: `npx vitest run tests/surface/mcp.test.ts`

## Group 3 — MCP over HTTP — parallel with 2

- [ ] Tests first
- [ ] **Refuses to start** without the explicit opt-in flag
- [ ] Binds `127.0.0.1` by default
- [ ] An explicit override to another host is possible but deliberate
- [ ] **Startup warning names the exact root being exposed**
- [ ] Same tools and prompts as stdio — one server, two transports
- [ ] Verify: `npx vitest run tests/surface/mcp-http.test.ts`

## Group 4 — Adapters

- [ ] Tests first
- [ ] Descriptor-driven: a name plus a native instructions path
- [ ] Each emits a **pointer** to `AGENTS.md`, containing no contract content
- [ ] Adding an agent is adding a descriptor — asserted by test
- [ ] Non-destructive: an existing native file is not overwritten
- [ ] Verify: `npx vitest run tests/surface/adapters.test.ts`

## Group 5 — CLI wiring and e2e

- [ ] `engram skill new <name>` scaffolds a skill that passes validation
- [ ] `engram mcp` (stdio) · `engram mcp --http` (opt-in)
- [ ] e2e: a **real MCP handshake** over stdio, listing tools and prompts
- [ ] e2e: HTTP refuses to start without the flag
- [ ] Verify: `npx vitest run tests/e2e/`

## Group 6 — Verification

- [ ] Full `npm run check` exits 0 with fresh output
- [ ] Deliberate import violation re-proves both architecture rules fire
- [ ] Smoke-test the **built** binary, incl. the HTTP refusal path
- [ ] Acceptance sweep from `overview.md` — every box
- [ ] Capture output for `retrospective.md` § Verification Evidence (Rule 12)
- [ ] Write `retrospective.md`
- [ ] Run `/sync-docs`
