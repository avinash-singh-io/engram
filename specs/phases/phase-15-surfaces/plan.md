# Phase 15 — Implementation Plan

```
Sequential: Group 0 → Group 1 → (Groups 2 + 3 in parallel) → Group 4 → Group 5 → Group 6
```

**TDD stays on** (Rule 13). Skill loading and validation are pure functions over
parsed frontmatter; the MCP layer is a translation of operations that already exist
and are already tested.

## Reference specs (constitutional — read, never edit; Rule 10)

[`v2-overview.md`](../../architecture/v2-overview.md) §6 skills, §7 guardrails,
§8 trust boundaries, §11 surfaces · ADR-0011 adapters · ADR-0024 tiering ·
ADR-0030 boundaries are repos · ADR-0034 engram never transmits.

---

## Group 0 — ADR-0041 and the skill schema

**Sequential. Blocks everything.**

ADR-0034 states that if engram ever gains a network surface, *"this section must be
revisited first."* Not a formality — the amendment is what forces the constraints to
be decided before there is code shaped around their absence.

- **ADR-0041** — amend ADR-0034's trust boundary for the MCP surface. Record what
  changes (a listening socket where there was none), the three constraints (opt-in,
  localhost, warned), and what is explicitly *not* solved (no authentication).
- Skill frontmatter schema: `name`, `description`, `uses`, `emits`, `guardrails`.
- Correct **FEAT-004** to `resolved` — verified against the shipped guardrail code
  and its 30 tests, not against a document. That distinction is why BUG-002 stayed
  wrong for five weeks.

*Commit:* `docs(specs): ADR-0041 — MCP surface amends the trust boundary`

---

## Group 1 — Skills: discover, validate, expose

**Sequential.** Depends on Group 0.

> **Engram never runs a skill.** A skill is instructions the *agent* follows. What
> engram owes it is discovery, honest validation, and exposure — nothing more.

- **Discover** — built-ins shipped with engram, plus `.engram/skills/*.md` which
  travel with a `git clone`. On collision **vault-local wins**, so a vault can
  override a built-in without forking engram.
- **Validate** —
  - `uses:` must name only real operations. A skill declaring one that does not
    exist is **rejected at load**, with the offending name in the message.
  - `guardrails:` may only **tighten**, via Phase 10's `tighten()`.
  - A malformed skill is rejected, never silently skipped: a skill that quietly does
    not load is worse than one that fails loudly, because the agent proceeds
    believing it has a capability it does not.
- **Expose** — discovered skills listed in `AGENTS.md`.

*Commit:* `feat(policy): skill discovery, validation and exposure`

---

## Group 2 — MCP server over stdio

**Parallel with Group 3.** Depends on Group 1.

- Six operations as **typed tools**: `init`, `capture`, `format`, `link`, `reindex`,
  `doctor`.
- Skills as **prompts**, because engram does not execute them.
- Thin translation only — every tool call routes to the same operation the CLI
  calls. Any logic here that is not translation belongs in `ops/`.

*Commit:* `feat(surface): MCP server over stdio`

---

## Group 3 — MCP server over HTTP

**Parallel with Group 2.** Depends on Group 1.

The transport ADR-0041 exists for. Three constraints, each tested:

1. **Refuses to start** without an explicit opt-in flag.
2. **Binds `127.0.0.1`** unless deliberately overridden.
3. **Warns at startup, naming the exact root being exposed** — the visibility that
   makes ADR-0030's separate-repo boundary observable rather than assumed.

*Commit:* `feat(surface): MCP server over HTTP, opt-in and bound`

---

## Group 4 — Adapters

**Sequential.** Depends on Groups 2 and 3.

Descriptor-driven: an agent is a name plus the path of its native instructions file.
Each emits a **pointer** to `AGENTS.md` and no contract content, so there is nothing
to drift. Adding an agent is adding a descriptor (ADR-0011).

*Commit:* `feat(surface): agent adapters emit native pointers`

---

## Group 5 — CLI wiring and e2e

**Sequential.**

`engram skill new` and `engram mcp [--http]`. e2e includes a **real MCP handshake**
over stdio — a tool list that does not survive an actual client exchange is not a
working server.

*Commit:* `feat(cli): skill and mcp commands`

---

## Group 6 — Verification

**Sequential.**

Full `npm run check`; the acceptance sweep; a deliberate import violation to re-prove
the architecture rules; a smoke test of the **built** binary including the HTTP
refusal path. Capture output for `retrospective.md` § Verification Evidence.

*Commit:* `test(surface): phase 15 acceptance verification`
