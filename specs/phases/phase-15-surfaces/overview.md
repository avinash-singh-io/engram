# Phase 15 — Surfaces: skills, MCP, adapters

> **Status**: planned
> **Branch**: `phase-15-surfaces`
> **Target release**: v0.10.0
> **Not gated on Gate 2** — everything here sequences or exposes operations that
> exist and work regardless of the edge-accuracy verdict.

## Goal

Make the operations reachable. **Skills** package how to *use* the vault, **MCP**
exposes the operations as typed tools, and **adapters** point each agent at
`AGENTS.md`.

## Key decisions (→ ADRs)

| Decision | Rationale | ADR |
|---|---|---|
| **Engram does not execute skills** — it discovers, validates and exposes them | v2-overview §6: a skill is *instructions, never code*. It can only sequence the seven operations, never add an eighth, so the blast radius of a careless or downloaded skill is bounded by what the operations already permit | §6 |
| A skill's `guardrails:` may only **tighten** | Phase 10 built `tighten()` before skills existed precisely for this. A constraint added after the thing it constrains is not a constraint | — |
| **MCP over stdio *and* HTTP**; HTTP is opt-in and localhost-bound | Owner's decision, taken with the cost stated. Requires amending ADR-0034 **first** — that ADR says so itself | **0041** |
| Skills are MCP **prompts**; operations are MCP **tools** | Engram executes operations and does not execute skills. The protocol should assert the same thing the architecture does, rather than implying engram runs a skill | §6, §11 |
| Adapters emit **native pointers only** | [ADR-0011](../../decisions/0011-adapters-converge-on-agents-md.md) converges everything on `AGENTS.md`. v1's per-agent slash-command surfaces reached v1's ops; MCP is that surface now, and every duplicated command is a second place the contract can drift | 0011 |
| `engram skill new` scaffolds a valid skill | Authoring one should not require reading a schema | this phase |

## The trust boundary changes here

Engram's security story has been **structural**: there is nothing to attack because
nothing listens, nothing authenticates, and nothing leaves the machine. An HTTP
server ends that, which is why ADR-0034 requires a revisit before one exists.

Three constraints, all asserted by test:

1. **Opt-in only.** HTTP never starts without an explicit flag. The default remains
   stdio, which is local IPC and transmits nothing.
2. **`127.0.0.1` only** unless deliberately overridden.
3. **A loud startup warning naming the root being exposed.** [ADR-0030](../../decisions/0030-boundaries-are-repos.md)'s
   answer to the private-vault problem is that it is a separate repository the
   working agent has no reason to be in — a server started in the wrong directory
   defeats that, and the warning is what makes it visible rather than silent.

## Scope (In)

1. **Skills** — discovery (built-ins + `.engram/skills/`, vault-local wins on
   collision), validation, exposure in `AGENTS.md`.
2. **MCP server, stdio** — the six operations as typed tools; skills as prompts.
3. **MCP server, HTTP** — opt-in, bound, warned.
4. **Adapters** — descriptor-driven native instruction pointers.
5. **`engram skill new`** and **`engram mcp [--http]`**.
6. **ADR-0041** — the ADR-0034 amendment.

## Scope (Out)

- Obsidian plugin — Phase 14.
- Traversal retrieval — Phase 11, gated on Gate 2.
- Engram's own agent or UI — post-v2.
- Authentication for the HTTP transport. Localhost-bound and opt-in is the whole
  control; if that ever stops being enough, it is an ADR-0041 amendment, not a flag.

## Acceptance (Rule 12)

- [ ] **ADR-0041 accepted before any HTTP code exists**
- [ ] `npm run check` exits 0 with fresh output
- [ ] A skill declaring an operation that does not exist is **rejected**, naming it
- [ ] A skill attempting to **loosen** a guardrail is rejected
- [ ] A skill that only tightens is accepted, and the tightening applies
- [ ] Vault-local wins over a built-in of the same name
- [ ] Every operation is reachable over stdio **and** over HTTP
- [ ] MCP HTTP **refuses to start** without the explicit flag
- [ ] MCP HTTP binds `127.0.0.1` by default
- [ ] The startup warning names the exact root being exposed
- [ ] `AGENTS.md` lists the skills actually discovered
- [ ] Adapters emit a pointer to `AGENTS.md`, not a copy of it
- [ ] `engram skill new` produces a skill that passes validation
- [ ] e2e incl. a real MCP handshake, plus a smoke test of the built binary
- [ ] `retrospective.md` carries a `## Verification Evidence` section

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **The HTTP surface leaks a vault** | The failure ADR-0030 exists to prevent, now reachable over a socket | Opt-in, localhost-bound, and a warning naming the root. All three tested, not documented |
| A skill is treated as executable | §6's guarantee collapses; blast radius becomes unbounded | Engram never runs a skill. Exposed as an MCP *prompt*, so the protocol says so too |
| Validation is advisory | A skill declaring `uses: [rm]` looks permitted | Rejection at load, with the offending name in the message. Tested from both directions |
| Adapters drift from `AGENTS.md` | Two contracts, one stale — the Phase 9 codec failure in a new place | Pointers only. An adapter file contains no contract content to drift |
