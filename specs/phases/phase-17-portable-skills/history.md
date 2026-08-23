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
### [ARCH_CHANGE] 2026-08-23 — The YAML subset gains one level of nesting
Topics: format, frontmatter, skills, okf
Affects-phases: none
Affects-specs: specs/architecture/v2-overview.md#2
Detail: `parseSimpleYaml` was flat by design because OKF frontmatter is flat
(ADR-0020). The Agent Skills standard puts every tool-specific field under
`metadata`, and the flat parser read `metadata:` followed by indented keys as a null
`metadata` plus top-level keys — a silent misparse, not a refusal. Extended to one
level of block nesting, with a lookahead so `aliases:` with nothing after it still
reads as null: **a strict superset for any flat document**, which is the property the
tests pin. `parseScalar` now unescapes quoted strings and a new `yamlScalar` quotes on
write, because a `SKILL.md` is parsed by other agents with real YAML engines rather
than by engram's subset — OKF's tolerance of unquoted prose was safe only because
engram is its sole reader. Additive under Rule 10; reconciled at `/sync-docs`.

---

### [DISCOVERY] 2026-08-23 — A freshly created vault reported needing an upgrade
Topics: init, upgrade, skills
Affects-phases: none
Affects-specs: none
Detail: Adding the flat-to-directory skill migration made `needsUpgrade` true for a
vault `init` had just created, because `init` still wrote the example skill in the
flat layout. Caught by the existing test "has nothing to say about a vault this
version created" — a test asserting a *property* rather than a path, which is why it
fired at all. Fixed at the cause: `init` writes `<name>/SKILL.md`. Worth noting that
the upgrade planner is now also a consistency check on `init`, and that relationship
should be kept.

---

### [DECISION] 2026-08-23 — Migration moves the file and never rewrites the content
Topics: upgrade, skills
Affects-phases: none
Affects-specs: none
Detail: `engram upgrade` moves a flat skill to `<name>/SKILL.md` but leaves the
frontmatter exactly as written, because `parseSkill` reads both layouts and the
source file is the user's prose. Rewriting it would edit their words to satisfy a
format only engram reads — the rendered copies are what other agents see, and those
are generated in the standard shape regardless. The **declared name wins over the
filename** when choosing the directory, since the standard requires them to match;
a file named `notes.md` declaring `name: mine` becomes `mine/SKILL.md`, and a
malformed skill falls back to its filename rather than being silently left behind.

---
### [ARCH_CHANGE] 2026-08-23 — One operation registry, replacing two lists
Topics: operations, agents-md, skills, registry
Affects-phases: none
Affects-specs: specs/architecture/v2-overview.md#6
Detail: `skill-schema.ts` named the six operations a skill may sequence; a separate
literal table in `surface/agents-md.ts` held the same six with their descriptions.
That is BUG-008's shape a third time — adding a seventh operation would not fail, it
would silently ship a contract that omits it. New `policy/operations.ts` holds the
single registry: name, command, one-line description, when-to-use, and steps. The
contract table and the generated skills both read from it, and `operations()` throws
at load if the two lists ever diverge. Additive under Rule 10.

---

### [DECISION] 2026-08-23 — Each operation gets a skill *about* it; the operations stay six
Topics: operations, skills
Affects-phases: none
Affects-specs: none
Detail: The owner asked for operations to be invocable as skills. They are — as
`/engram:capture` and so on — but by generating a skill that *describes* each
operation, never by adding an operation. A skill is instructions an agent follows and
engram never runs one (v2-overview §6); that is what bounds a careless or downloaded
skill to sequencing operations that already exist. A seventh operation called "skill"
would make engram interpret skills and dissolve the guarantee. The generated skills
go through `serializeSkill` and back through `parseSkill` like any other, so a mistake
in one of engram's own fails exactly as a mistake in a user's does.

---

### [NOTE] 2026-08-23 — `allowed-tools` is documented as a hint, not a guarantee
Topics: skills, guardrails
Affects-phases: none
Affects-specs: none
Detail: Every operation skill declares `allowed-tools: Bash(engram:*)`. It is
experimental in the hosts, so both the code comment and the test say plainly that it
narrows what a well-behaved agent reaches for and enforces nothing. The real bound is
unchanged and is elsewhere: every write still passes the gate under the vault's
guardrails. Claiming otherwise would be the `visibility: private` mistake ADR-0030
refused — shipping something that looks like a boundary and is not.

---
### [DISCOVERY] 2026-08-23 — Overriding a built-in after it has rendered leaves the old copy
Topics: skills, render, no-delete, doctor
Affects-phases: none
Affects-specs: none
Detail: Found by a test that asserted the wrong thing. Writing
`engram/skills/connect-the-dots/` before the first render means engram never writes
its own copy — clean. Writing it *after* leaves `/.claude/skills/engram/skills/
connect-the-dots/SKILL.md` on disk, so `/engram:connect-the-dots` keeps working
alongside `/connect-the-dots` until the file is removed. Engram will not delete it:
the `FileStore` port has four methods and removal is deliberately not one, the same
instinct as the `no-delete` guardrail and as `upgrade`, which copies and then tells
you what it left behind. `renderSkills` therefore returns `stale`, and Group 5 must
surface it with the exact `rm` — a leftover that is merely returned in a result
object and never printed is the same as not detecting it.

---

### [DECISION] 2026-08-23 — The gitignore block is delimited, not a whole-directory ignore
Topics: skills, derived-state, gitignore
Affects-phases: none
Affects-specs: specs/decisions/0029-derived-state-never-committed.md
Detail: Rendered skills are derived state and must not be committed, but ignoring
`.claude/` wholesale would quietly stop the user's own `settings.json`, `commands/`
and hand-written skills being committed. So engram writes a **delimited managed
block** listing exactly the directories it renders — the contract splice's pattern in
a second place, for the same reason: engram owns what is between the markers and
nothing else. Regenerated by `reindex`, so it stays accurate as skills are added and
removed. A test asserts `.claude/` itself is never ignored.

---

### [ARCH_CHANGE] 2026-08-23 — reindex renders skills and manages the ignore block
Topics: reindex, skills, adapters, derived-state
Affects-phases: none
Affects-specs: specs/architecture/ecosystem.md
Detail: Additive under Rule 10. `reindex` now discovers skills, renders them into
every agent target, and splices the managed gitignore block, returning a
`SkillRenderResult` alongside the contract result. Called from `reindex` rather than
`init` for the same reason ADR-0017 gave for the contracts: a file written once at
init goes stale the moment a skill changes, and regenerating keeps every copy in sync
from a single source. `walk` excludes rendered skills via `isSkillPath`, derived from
the registry — the third occurrence of BUG-008's shape, prevented rather than fixed.

---
### [DECISION] 2026-08-23 — ADR-0046: discovery walks up; the boundary rule is unchanged
Topics: cli, vault-root, boundaries
Affects-phases: none
Affects-specs: specs/decisions/0030-boundaries-are-repos.md
Detail: Reproduced against the built binary before writing anything: `engram capture`
from `concepts/` created `concepts/raw/`, filed the note there, and reported
`/raw/...` — a path relative to a root the user did not believe they were in.
ADR-0030 conflated **boundary** (how far a vault extends, its actual subject) with
**discovery** (which root you are in, which it never argued for). ADR-0046 amends the
discovery half only: walk up for `.engram/`, nearest wins, stop at a `.git` with no
vault in it. Verified fixed against the built binary, plus the git-boundary refusal
and that `init` still works where there is no vault.

---

### [DISCOVERY] 2026-08-23 — "No vault here" preempted "unknown command"
Topics: cli, error-reporting
Affects-phases: none
Affects-specs: none
Detail: Requiring a vault before dispatch made `engram frobnicate` answer "no vault
here" and exit 1 instead of naming the unknown command and exiting 2 — true, and not
the point. Caught by an existing e2e test. Fixed by giving the CLI a **command
registry**: one list that decides both what an unknown command is and which commands
may run outside a vault. Those two facts were previously implicit at separate sites
and disagreed with each other, which is how the regression was possible at all.

---

### [NOTE] 2026-08-23 — What a registry test can and cannot assert
Topics: testing, cli
Affects-phases: none
Affects-specs: none
Detail: The natural test — run every registered command and assert none falls through
to the switch's default — hangs: `capture` and `format` read stdin when given no
argument, and `mcp` is a server that never returns. Rather than contrive arguments
for each and quietly test something weaker than it appears to, the test asserts that
every registered name appears in the usage text, and says in a comment exactly what
it does not cover and where that coverage lives instead. A test whose name overstates
what it checks is worse than a smaller honest one.

---
