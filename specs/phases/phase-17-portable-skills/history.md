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
### [DECISION] 2026-08-23 — Group 0: the plugin mechanism verified, ADR-0045 written
Topics: skills, adapters, namespacing, plugins
Affects-phases: none
Affects-specs: specs/decisions/0044-adopt-the-agent-skills-standard.md#collisions
Detail: T0.1 was made a gate because the phase rested on a documentation claim, and
it earned its keep. `claude plugin validate` passed on the exact structure engram
will generate, and a session launched with `--plugin-dir` listed `engram:probe`
beside an unprefixed `loose-probe` — decision 2 demonstrated rather than assumed.
Auto-discovery did **not** fire under `claude -p`, which the reference explains
exactly: project-scope plugins load only after the workspace trust dialog, and
"running with `-p` is insufficient". Evidence in `evidence/t0-1-plugin-mechanism.md`.
ADR-0045 amends ADR-0044 §Collisions and makes §2 specific.

---

### [DISCOVERY] 2026-08-23 — Two host constraints the plan did not know about
Topics: skills, plugins, vault-root, doctor
Affects-phases: none
Affects-specs: none
Detail: (C1) Project-scoped plugins load only after a one-time workspace-trust
acceptance; the personal directory has none of that friction but is machine-wide.
Engram keeps project scope and now records the refusal explicitly rather than
inheriting it. (C2) Project-scope plugins load **only from the directory Claude Code
starts in — they do not walk up to the repository root.** Start a session in a
subdirectory and engram's plugin does not load at all. Engram cannot fix a host rule,
so it must say so: `doctor` gains a check and the contract says where to start. This
strengthens Group 4 rather than duplicating it — root discovery fixes `engram
capture` misfiling from a subdirectory but cannot make the plugin load there.

---

### [ARCH_CHANGE] 2026-08-23 — AgentDescriptor gains a verified skills target
Topics: adapters, skills, ecosystem
Affects-phases: none
Affects-specs: specs/architecture/ecosystem.md
Detail: Additive under Rule 10 — a new optional field on an existing design, not a
change of approach, so it is recorded here and reconciled at `/sync-docs`. All three
agents were researched before any was declared: Claude Code reads `.claude/skills/`
(plugin-capable), Antigravity `.antigravity/skills/`, Gemini CLI `.gemini/skills/` at
the workspace tier. Each target carries a `verified` string saying how and when it
was confirmed, and a test asserts every target has one — making ADR-0044's "engram
will not write to a location it cannot verify is read" mechanical instead of prose.
`isSkillPath` is derived from the registry for the same reason `isContractFile` is.

---

### [DISCOVERY] 2026-08-23 — ADR-0044's reason for avoiding `.agents/skills/` is partly false
Topics: skills, agents-md, standards
Affects-phases: none
Affects-specs: specs/decisions/0044-adopt-the-agent-skills-standard.md
Detail: ADR-0044 refused `.agents/skills/` as "widely described as a universal
fallback but absent from the specification, and engram will not write to a location
it cannot verify is read." The Gemini CLI documents it at both user and workspace
tier, and gives it **precedence over `.gemini/skills/`**. The conclusion still holds
— one shared location read by an unknown set of agents is a worse target than several
known ones — but the stated reason no longer does. Recorded in ADR-0045's consequences
and as ENH-008 so the next reader does not inherit a stale justification.

---
