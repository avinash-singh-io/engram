# 0045 — Skills ship as a plugin, and the namespace is the differentiator

> **Status**: accepted
> **Date**: 2026-08-23
> **Deciders**: Avinash Kumar Singh
> **Amends**: [ADR-0044](0044-adopt-the-agent-skills-standard.md) — §Collisions is
> reversed and §2 is made specific. Everything else in ADR-0044 stands unchanged.

## Context

ADR-0044 decided that engram's skills adopt the Agent Skills standard and get
rendered into every agent's own directory. It left two things unresolved that turned
out to be the same question:

1. **How does a reader tell engram's skills from their own?**
2. **How is engram stopped from squatting a generic name like `/format`?**

ADR-0044 answered both with a provenance marker and explicitly rejected namespacing,
on the grounds that `/engram-connect-the-dots` is a permanent tax on every invocation
to avoid a collision the marker already handles precisely.

Then the owner raised the objection that reversed it:

> we can say `engram-skills:format`, but I will never be able to search the actual
> skill properly because I will need to type `engram-skills` all the way.

Both concerns are real and they pull opposite ways. A prefix hurts invocation; no
prefix hurts attribution. **The premise both share is that engram must choose the
name.** It does not.

### What the hosts actually do

| Host | Project-scoped skills directory | Namespacing | Verified |
|---|---|---|---|
| Claude Code | `.claude/skills/` | A folder carrying `.claude-plugin/plugin.json` loads as a plugin, and its skills become `/<plugin>:<skill>` | 2.1.235, 2026-08-23 — `claude plugin validate` passed and a session listed `engram:probe` |
| Antigravity | `.antigravity/skills/` | none documented | documentation, 2026-08-23 |
| Gemini CLI | `.gemini/skills/` (workspace tier) | none documented | documentation, 2026-08-23 |

Claude Code loads such a plugin **with no marketplace and no install step**. Engram
does not have to invent a prefix, because the platform provides a namespace — and it
is not a prefix a human types to search, since `/engram:` lists the whole set.

## Options Considered

### Naming

**Provenance marker only** (ADR-0044). Unprefixed `/format`. Attribution invisible at
the point of use; engram squats a generic name it has no claim to.

**Engram-chosen prefix.** `/engram-format` everywhere. Attribution visible, and the
owner's objection stands — it is engram's invention, uniformly imposed.

**Host-provided namespace where one exists, prefix where none does.** Attribution
visible everywhere; zero invention where the platform has already solved it.

### Protection of engram's own skills

**Filesystem read-only modes.** Break on Windows, under Dropbox and iCloud sync, and
through `git clone`. Worse, they assert a control engram does not have.

**Derived state.** Rendered skills are regenerated; editing one loses the edit at the
next `reindex`, exactly like `index.md` and `views/`.

## Decision

### 1. Where a host supports a plugin, engram ships as one

`<vault>/.claude/skills/engram/` with `.claude-plugin/plugin.json`. The manifest
carries `name`, `description`, `version` (engram's own) and `author` — the validator
warns about the last three, and a rendered plugin should say which engram wrote it.

Skills go at the **plugin root** under `skills/<name>/SKILL.md`, never inside
`.claude-plugin/`, which holds `plugin.json` and nothing else.

### 2. The namespace is the differentiator

> **If it carries engram's mark, engram wrote it. If it does not, you did.**

| | Invocation |
|---|---|
| Engram's own, host with a plugin concept | `/engram:format` |
| Engram's own, host without one | `/engram-format` |
| Yours, every host | `/literature-review` |

Only the separator changes — `:` where the host namespaces for us, `-` where it does
not. The rule a person has to remember is one sentence, and it holds everywhere.

Engram namespaces *its own* names because they are generic and it has no claim to
`/format`. It leaves the user's names alone because they chose them, in their vault,
for their notes.

### 3. Overriding a built-in removes it rather than shadowing it

A skill at `engram/skills/connect-the-dots/` means engram renders no built-in of that
name: `/engram:connect-the-dots` disappears and `/connect-the-dots` is yours. This
preserves `discoverSkills`'s existing name-collision semantics and produces no
duplicate for a human to disambiguate.

### 4. `engram/skills/` is source; every agent directory is a render target

One invariant: **you never edit an agent directory — you edit source and re-render.**
The same relationship `index.md` has to your notes.

### 5. Protection is regeneration, not permission

Engram's premise is plain files you own, and a tool that says that and then chmods
your files is lying about one of the two. So there is no lock. Instead:

- Rendered skills are **derived state** under [ADR-0029](0029-derived-state-never-committed.md).
  `reindex` overwrites them.
- Each carries a banner naming the source file to edit instead. Prohibition without
  an alternative just gets worked around.
- `doctor` warns before `reindex` silently eats an edit, through the
  `[derived-not-generated]` check that already exists.
- Provenance still governs what may be overwritten (ADR-0044 §4, unchanged): a file
  without the marker is never touched, so a skill someone else wrote into the same
  directory is safe.

The absence of a lock costs nothing, because **nobody ever needs to edit engram's
copy** — overriding by name gives a full replacement in a file that is yours, visible
and committed. The unlockable thing is the disposable copy; the durable thing is
already yours.

### 6. A descriptor may declare a skills directory only with recorded evidence

Each target carries a `verified` string saying how and when someone watched a skill
load from it, and a test asserts every target has one. ADR-0044 refused to write to
`.agents/skills/` because it could not verify it was read; that principle is now
mechanical rather than a sentence in a document.

## Consequences

- **Attribution is visible at the point of use**, in every host, without engram
  inventing a convention where the platform has one.
- **`/engram:` lists the whole set**, which is better discovery than either
  unprefixed (scattered among everything else) or a hyphenated prefix.
- **Project scope requires a one-time workspace-trust acceptance** in Claude Code.
  The personal directory has no such prompt, and engram refuses it anyway: it is
  machine-wide and would leak one vault's skills into every unrelated project. The
  friction is chosen, and this is where that choice is recorded.
- **Project-scoped plugins do not walk up to the repository root.** Start a session
  in a subdirectory and engram's plugin does not load at all. Engram cannot fix a
  host rule, so it says so — in the contract and in `doctor`.
- **Skills are named slightly differently per host.** `/engram:format` and
  `/engram-format` are the same skill. `AGENTS.md` renders the name each host
  actually uses, so nobody has to work it out.
- **ADR-0044's stated reason for avoiding `.agents/skills/` is now partly falsified.**
  It is read by the Gemini CLI, at both user and workspace tier, and takes precedence
  over `.gemini/skills/`. Engram still writes only agent-specific paths — one shared
  location read by an unknown set of agents is a worse target than several known
  ones — but the ADR's premise was "cannot verify", and for one agent that is no
  longer true. Recorded so the next reader does not inherit a stale justification.
