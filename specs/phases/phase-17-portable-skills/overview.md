# Phase 17 — Portable skills

> **Goal**: An agent can invoke engram's operations and skills as slash commands,
> with no MCP server, in any agent that implements the Agent Skills standard —
> and can tell at a glance which skills engram wrote and which the user did.
>
> **Target release**: v0.14.0
> **Branch**: `phase-17-portable-skills`
> **Implements**: FEAT-009 (P1) · [ADR-0044](../../decisions/0044-adopt-the-agent-skills-standard.md)

## Why now

Engram has six operations and two built-in skills, and as of v0.13.0 the only way
to reach any of them from an agent is an MCP server the vault has to be configured
for. The owner could not invoke `connect-the-dots` from Claude Code; the vault had
no `.mcp.json`, and nothing about the failure said so.

Three further gaps were found by inspection during this brainstorm, each verified
against the built binary:

| Finding | Evidence |
|---|---|
| `AGENTS.md` never says **how** to run an operation | It lists `engram capture [text]` in a table with no mention of shell, CLI or MCP. An agent is told what exists and not how to invoke it. |
| No vault-root discovery | `engram capture` run from `concepts/` created `concepts/raw/` and filed the note there. |
| A rendered `SKILL.md` would be indexed as a knowledge node | An empty vault with one `.claude/skills/*/SKILL.md` reports 1 node and lists it in `index.md`. This is BUG-008's shape for the third time. |

## Key decisions

| # | Decision | Rationale | Record |
|---|---|---|---|
| 1 | Engram ships as a **skills-directory plugin** at `<vault>/.claude/skills/engram/` | A folder under a skills directory containing `.claude-plugin/plugin.json` loads as a plugin with **no marketplace and no install step**, and Claude Code namespaces it natively | ADR-0045 |
| 2 | Built-ins invoke as `/engram:<name>`; user skills invoke as `/<name>` | The namespace *is* the differentiator, visible at every invocation. Engram namespaces its own generic names rather than squatting `/format`; the user's names are theirs | ADR-0045 (amends ADR-0044 §Collisions) |
| 3 | `engram/skills/` is **source**; every agent directory is a **render target** | One invariant: you never edit an agent directory, you edit source and re-render. Same relationship `index.md` has to notes | ADR-0044 §3 |
| 4 | Protection is **regeneration, not permission** | Engram's premise is plain files the user owns; a tool that chmods them is lying about one of the two. Rendered skills are derived state (ADR-0029) — edit one and `reindex` overwrites it | ADR-0045 |
| 5 | Each operation gets a skill **about** it; operations stay six | A skill is instructions an agent follows. Adding a seventh operation named "skill" would make engram interpret skills, which §6 forbids | ADR-0044 §What this does NOT change |
| 6 | Overriding a built-in **removes** it rather than shadowing it | `engram/skills/connect-the-dots/` means `/engram:connect-the-dots` disappears and `/connect-the-dots` is yours. Preserves `discoverSkills`'s existing name-collision semantics with no duplicate | ADR-0045 |
| 7 | `engram` walks up for `.engram/` to find the vault root | ADR-0030 made the invocation root the only root; that conflated a **boundary** rule with a **discovery** rule. The boundary is unchanged — one root is still the whole world | ADR-0046 (amends ADR-0030) |

## In scope

- Skill format moves to `<name>/SKILL.md` with engram's fields under `metadata`
- Legacy single-file skills still read; migration added to `engram upgrade`
- A `SKILL.md` per operation, generated from the operation registry
- Adapter descriptors gain a skills target; `reindex` renders into each
- Provenance marker (`metadata.engram-managed`) governs what may be overwritten
- Rendered skill directories excluded from the walk and from `index.md`
- `create-skill` — an engram skill that writes a user skill
- `AGENTS.md` gains a section stating how to invoke an operation
- Vault-root discovery by walking up for `.engram/`
- `doctor` reports an edited generated skill and an unrendered skill

## Out of scope

- **Writing to `.agents/skills/`** — widely described as a universal fallback, absent
  from the specification. Engram will not write to a location it cannot verify is read
- **Removing MCP** — delivery is additive (ADR-0044). Prompts stay
- **`~/.claude/skills/`** — machine-wide; would leak one vault into every project
- **A skill marketplace, registry, or install command** — engram renders what the
  vault already has
- **Executing skills** — engram discovers, validates, renders, exposes. Never runs

## Deliverables

| Deliverable | Verification command |
|---|---|
| `SKILL.md` format with `metadata.engram-*` | `npm test -- skills` |
| Legacy layout still parses | `npm test -- skills` |
| `engram upgrade` migrates legacy skills | `npm test -- upgrade` |
| One skill per operation, from the registry | `npm test -- operations-as-skills` |
| Plugin rendered at `.claude/skills/engram/` | `node scripts/smoke-skills.mjs` |
| User skills rendered unprefixed alongside it | `node scripts/smoke-skills.mjs` |
| Provenance marker respected | `npm test -- render` |
| Rendered skills never become nodes | `npm test -- walk` |
| `reindex` idempotent with skills present | `node scripts/smoke-skills.mjs` |
| `create-skill` writes a valid user skill | `npm test -- create-skill` |
| `AGENTS.md` states how to invoke | `npm test -- agents-md` |
| Vault-root discovery | `npm test -- root` + `node scripts/smoke-cli.mjs` |
| Whole suite + both existing smokes | `npm run check` |

## Acceptance criteria

1. `npm run check` green — suite, lint, typecheck, `smoke-cli`, `smoke-plugin`, and the new `smoke-skills`
2. In a freshly scaffolded vault, `.claude/skills/engram/.claude-plugin/plugin.json` exists and `skills/format/SKILL.md` sits beside it — **asserted by smoke check, not by eye**
3. `engram reindex` twice reports identical node counts with skills present
4. A user skill in `engram/skills/` appears rendered without the `engram` prefix
5. Editing a rendered skill and running `doctor` produces a warning naming the source file to edit instead
6. A rendered skill with the marker removed survives `reindex` and is reported
7. `engram capture "x"` from a subdirectory files into the **vault's** `raw/`, not a nested one
8. **Manual, and stated as manual**: a Claude Code session opened in the vault lists `/engram:format` and the user's own skills. The suite cannot assert this — it needs a real agent session, exactly like Phase 16's plugin load
