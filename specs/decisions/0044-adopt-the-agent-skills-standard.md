# 0044 — Adopt the Agent Skills standard, and distribute skills to every agent

> **Status**: accepted
> **Date**: 2026-08-23
> **Deciders**: Avinash Kumar Singh
> **Extends**: [ADR-0011](0011-adapters-converge-on-agents-md.md) and
> [ADR-0017](0017-agent-contract-files-full.md) — the adapter registry and the
> rendering strategy this reuses wholesale.

## Context

Engram's skills are reachable only over MCP, as prompts. That was defensible when
MCP looked like the way agents took instruction, and it is now wrong on two counts.

**There is an open standard, and engram invented a parallel format instead.**
[Agent Skills](https://agentskills.io/specification) — originally Anthropic's,
released as an open standard and adopted by Claude Code, Cursor, Codex CLI, the
Gemini CLI and others. A skill is a *directory* containing `SKILL.md`, with
exactly two required frontmatter fields, `name` and `description`. Engram instead
writes a *single file* carrying `uses`, `emits` and `guardrails` at the top level
— fields the spec does not define. The result works in engram and nowhere else,
which is the opposite of the vendor-neutrality the project claims.

**MCP is the wrong delivery mechanism for this.** Agents already read skills from
their own directories and expose them as slash commands, with no server involved.
Requiring an MCP connection to reach a skill adds a dependency the standard
deliberately does not have, and it failed in practice: the owner could not invoke
`connect-the-dots` from Claude Code, because the vault had no `.mcp.json` and
nothing about the failure said so.

The two mechanisms are not equivalent, either. An MCP prompt must be invoked
deliberately. A `SKILL.md` in an agent's directory is **also loaded automatically
when the agent judges it relevant** — which is the behaviour that makes a skill
worth writing.

This is the AGENTS.md story repeating. ADR-0011 converged the contract on one
file; ADR-0017 then established that each agent must receive it in its own
location, in full, because agents do not follow pointers. Skills need the same
treatment, and the machinery already exists.

## Options Considered

### Delivery

**A — MCP prompts only.** Status quo. No filesystem writes into another tool's
directory. But it requires a server, cannot be model-invoked, and is invisible to
every agent not wired to engram.

**B — Write `SKILL.md` into each agent's own skills directory.** Uses the adapter
registry already in place. Slash-command invocable, model-invocable, no MCP. Costs:
engram writes into directories other tools own, and must never clobber a skill the
user wrote.

**C — Both.** B for reach, A retained for agents already connected that way.

### Duplication

**Symlinks** from each agent's directory back to `engram/skills/`. No duplication.
But they break on Windows without developer mode, break in archives, break on
several sync services, and Obsidian follows them inconsistently — the same
objection that rejected symlinks for the contract files.

**Copies**, regenerated on every `reindex`.

### Collisions

**Namespace everything** as `engram-<name>`, so nothing can collide. Zero risk,
permanently uglier commands (`/engram-connect-the-dots`).

**Provenance marker** — engram writes a marker into `metadata`, regenerates only
what carries it, and never touches anything else.

## Decision

**Option C for delivery, copies for duplication, provenance markers for
collisions.**

### 1. Engram's skill format becomes `SKILL.md`, exactly as specified

`engram/skills/<name>/SKILL.md`, with `name` matching the directory as the spec
requires, and `description` written to say *what it does and when to use it* —
because that string is what an agent matches against when deciding to load it.

Engram's own fields move into `metadata`, which is the field the spec provides for
exactly this:

```yaml
name: connect-the-dots
description: Read several sources, find the shared thread, emit one synthesis citing them all. Use when several articles or papers should add up to a single claim.
metadata:
  engram-uses: capture format link
  engram-guardrails: require-sources
```

Engram still validates `engram-uses` against the real operations and still refuses
a skill that would loosen a guardrail. Those checks are unchanged; only their
location in the file moves. To an agent that has never heard of engram, the skill
is an ordinary valid skill.

### 2. Skills are rendered into every agent's own directory

Each adapter descriptor gains a skills path — `.claude/skills/` for Claude Code,
and the equivalent for each agent engram knows about. `reindex` writes every
discovered skill, built-in and vault-local alike, into each of them.

**Project-local, never personal.** `~/.claude/skills/` is machine-wide; writing
there would leak one vault's skills into every unrelated project. `.claude/skills/`
lives in the vault, travels with a `git clone`, and disappears when the vault does.

### 3. Copies, not symlinks

The duplication is safe for the same reason ADR-0017's is: **there is exactly one
generator**, and every copy is rewritten by `reindex`. No copy is more real than
another, so no copy can fall behind. Symlinks trade that for portability problems
on the platforms engram most wants to survive — Windows, sync services, archives —
and this project has already rejected them once on those grounds.

### 4. A provenance marker decides what engram may overwrite

Every rendered skill carries `metadata.engram-managed`. On regeneration:

| State of the target | What happens |
|---|---|
| Absent | Written |
| Present, carries the marker | Regenerated |
| Present, no marker | **Never touched**, and reported |

This is the contract splice's rule in a different shape: engram owns what engram
wrote and nothing else. It also means a user who wants to take over a skill simply
deletes the marker, and engram stops managing it — no flag, no configuration.

Namespacing was rejected because `/engram-connect-the-dots` is a permanent tax on
every invocation to avoid a collision that the marker handles precisely.

### 5. Skills stay model-invocable by default

Claude Code's `disable-model-invocation` exists for actions whose *timing* matters
— deploys, commits, sending messages. Engram's skills are not of that kind: every
write they lead to still passes the gate, still obeys the vault's guardrails, and
is still held by `propose-only` where that applies. The protection is at the gate,
not at invocation, so restricting invocation would buy nothing and cost the
automatic loading that makes skills useful.

### What this does NOT change

**Engram still never executes a skill.** It discovers, validates, renders and
exposes. The agent follows it. That is what bounds a downloaded skill's blast
radius, and rendering into more directories does not widen it — a skill can still
only sequence operations that already exist.

**MCP prompts remain.** They cost nothing and serve agents already connected that
way. Delivery is additive.

## Consequences

- **Engram's skills become portable.** A skill written here works in any agent
  implementing the standard, including agents engram has never heard of. That is
  the vendor-neutrality claim made real rather than asserted.
- **Engram writes into directories other tools own.** It already does this for
  `CLAUDE.md` and `.antigravity/AGENTS.md`, so the precedent is set — but the
  marker rule matters more here, because a skills directory is far more likely to
  already contain the user's own work.
- **The existing skill format breaks.** `engram/skills/<name>.md` becomes
  `engram/skills/<name>/SKILL.md`. Legacy single files must still be read, and
  `engram upgrade` gains a migration — which is precisely the case that command
  was built for.
- **Adding an agent stays a descriptor.** One more field on an existing entry, no
  code, no branch.
- **`.claude/skills/` should not be gitignored** — the skills are meant to travel
  with the vault. Worth stating, because derived state elsewhere in engram is
  gitignored and the inconsistency will look like an oversight otherwise.
- **A claimed universal fallback was not adopted.** Several sources describe
  `.agents/skills/` as a directory every agent reads. The specification does not
  mention it, and engram will not write to a location it cannot verify is read.
  Revisit if the spec adopts it.
