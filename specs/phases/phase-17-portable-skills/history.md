# Phase 17 — History

### [DECISION] 2026-08-23 — Skills ship as a skills-directory plugin
Topics: skills, adapters, namespacing
Affects-phases: none
Affects-specs: specs/decisions/0044-adopt-the-agent-skills-standard.md#collisions
Detail: ADR-0044 rejected namespacing because `/engram-connect-the-dots` taxes every
invocation. Research into how agents actually load skills found that a folder under a
skills directory containing `.claude-plugin/plugin.json` loads as a plugin with no
marketplace and no install step, and is namespaced by the platform as
`/engram:<name>`. That reasoning still holds against an *invented* prefix and is moot
against the platform's own convention. ADR-0045 amends it.

---

### [DECISION] 2026-08-23 — The namespace is the differentiator
Topics: skills, ownership
Affects-phases: none
Affects-specs: none
Detail: Built-ins invoke as `/engram:<name>`, user skills as `/<name>`. One rule,
visible at every invocation: if it carries the prefix, engram wrote it. Engram
namespaces its own generic names rather than squatting `/format`; the user's names
are theirs. Overriding a built-in removes it rather than shadowing it, preserving
`discoverSkills`'s existing collision semantics with no duplicate.

---

### [DECISION] 2026-08-23 — Protection is regeneration, not permission
Topics: skills, derived-state
Affects-phases: none
Affects-specs: specs/decisions/0029-derived-state-never-committed.md
Detail: Asked how built-in skills could be prohibited from editing. They cannot, and
should not be: engram's premise is plain files the user owns, and a tool that chmods
them contradicts it. Read-only modes were considered and rejected — they break on
Windows, under Dropbox/iCloud sync, and through `git clone`. Instead: rendered skills
are derived state, `reindex` overwrites them, each carries a banner naming the source
file to edit, and `doctor`'s existing `[derived-not-generated]` check fires once
`isDerived` covers them. The escape hatch is what makes this acceptable — override by
name means nobody ever needs to edit engram's copy.

---

### [DISCOVERY] 2026-08-23 — AGENTS.md never says how to run an operation
Topics: agents-md, invocation
Affects-phases: none
Affects-specs: none
Detail: The generated contract lists `engram capture [text]` in a table with no
mention of shell, CLI or MCP. An agent is told what exists and not how to invoke it,
which is a plausible contributor to the original FEAT-009 report. Fixed in T5.3.

---

### [DISCOVERY] 2026-08-23 — No vault-root discovery
Topics: cli, vault-root
Affects-phases: none
Affects-specs: specs/decisions/0030-boundaries-are-repos.md
Detail: Verified — `engram capture` run from `concepts/` created `concepts/raw/` and
filed there. ADR-0030 made the invocation root the only root, which conflated a
boundary rule with a discovery rule. Load-bearing for this phase: a slash command
runs from the session's cwd, so shipping invocation onto this would put a working
path on top of a broken one. ADR-0046 amends the discovery half only.

---

### [DISCOVERY] 2026-08-23 — A rendered SKILL.md would be indexed as a knowledge node
Topics: walk, reserved-paths, idempotence
Affects-phases: none
Affects-specs: none
Detail: An empty vault holding one `.claude/skills/*/SKILL.md` reports 1 node and
lists it in `index.md`. This is BUG-008's exact shape for the third time — the first
was `GEMINI.md`, the second `STRUCTURE.md` the same day. Excluded by deriving from
the descriptor registry rather than restating a path, and covered by extending the
invariant test rather than adding a case.

---

### [SCOPE_CHANGE] 2026-08-23 — Operations exposed as skills; vault-root discovery added
Topics: skills, operations, cli
Affects-phases: none
Affects-specs: none
Detail: FEAT-009 covered rendering the two existing skills. Scope grew to a skill per
operation — so an agent with no MCP can reach the whole surface — and to root
discovery, without which those skills misfile from a subdirectory. Operations stay
six: each gets a skill *about* it, because adding a seventh named "skill" would make
engram interpret skills, which §6 forbids.

---
