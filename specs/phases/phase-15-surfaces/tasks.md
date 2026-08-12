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

- [x] Tests first (26 tests)
- [x] Discover built-ins + `.engram/skills/*.md`; two built-ins shipped
- [x] **Vault-local wins** on a name collision
- [x] Reject a skill whose `uses:` names an operation that does not exist, naming
      the offending one **and** listing what engram actually has
- [x] Reject a skill whose `guardrails:` would **loosen**; accept one that tightens
- [x] A tightened guardrail actually applies when the skill is in force
- [x] Reject a malformed skill loudly, with its path — never skip it silently
- [x] Test that every shipped built-in is itself valid, and every guardrail it
      names actually exists
- [x] **Fixed: the shorthand `guardrails: [x]` form silently produced NO guardrails**
      — `Array.isArray` is `typeof 'object'`, so the object branch swallowed it
- [x] **Fixed: numeric fields arrived as strings** — coerced consumer-side, because
      the YAML subset must not coerce `okf_version: 0.2` into a number
- [ ] List discovered skills in `AGENTS.md` — Group 4, with the adapters
- [x] Verify: `npx vitest run tests/policy/` — 56 passed

## Group 2 — MCP over stdio — parallel with 3

- [x] Tests first (18 tests)
- [x] Six operations as typed tools with JSON schemas — one per real operation,
      asserted against `OPERATIONS` so the two cannot drift
- [x] Skills as **prompts**, not tools; asserted that no skill appears in the
      tool list and that every tool is an `engram_` operation
- [x] `format`'s tool description tells the agent engram does not infer relations
- [x] Every tool routes to the same operation the CLI calls (translation only)
- [x] Guardrails apply to MCP calls too, not only the CLI
- [x] `doctor` proven read-only over MCP as well
- [x] A rejected call returns `isError` naming the rule; unknown tool/method are
      errors rather than crashes
- [x] **Implemented JSON-RPC directly** — five methods, and engram keeps its zero
      runtime dependencies (TD-005)
- [x] Verify: `npx vitest run tests/surface/mcp.test.ts` — 18 passed

## Group 3 — MCP over HTTP — parallel with 2

- [x] Tests first (12 tests, covering both transports)
- [x] **CONSTRAINT 1 — refuses to start** without the explicit opt-in flag, and the
      refusal explains what enabling it does (no authentication, listens on nothing
      by default)
- [x] **CONSTRAINT 2 — binds `127.0.0.1`** by default
- [x] **CONSTRAINT 3 — startup warning names the exact root exposed**, because
      ADR-0030's boundary is only as good as knowing which side of it you are on
- [x] Same tools and prompts as stdio — one `handle()`, two transports, proven by
      a real `fetch` against a live server
- [x] stdio drives a **real handshake** over paired streams; a malformed line does
      not take the session down; notifications get no reply
- [x] Widened `serveStdio` to `NodeJS.ReadableStream`/`WritableStream` — the
      narrowest interfaces it uses, so the exchange is testable with no process
- [x] Verify: `npx vitest run tests/surface/` — 46 passed

## Group 4 — Adapters

- [x] Tests first (13 tests, plus 2 in `init`)
- [x] Descriptor-driven: a name, a native instructions path, and a `why`
- [x] Each emits a **pointer** to `AGENTS.md`, containing no contract content —
      asserted by checking four real contract claims are in `AGENTS.md` and in
      **none** of the pointers, and that no guardrail name leaks into one
- [x] Relative path resolves correctly from nested locations
- [x] Adding an agent is adding a descriptor — proven by inventing one in a test
      and getting a working pointer with no code change
- [x] Every shipped descriptor carries a `why`, which is what stops the list
      accumulating agents that already read `AGENTS.md` natively
- [x] Non-destructive: a user's own `CLAUDE.md` survives untouched
- [x] Wired into `init`; safe to run twice
- [x] Verify: `npx vitest run tests/surface/` — 59 passed; `npm run check` — 444

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
