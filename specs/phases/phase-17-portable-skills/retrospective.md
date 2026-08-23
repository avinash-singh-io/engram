# Phase 17 — Retrospective

> **Portable skills**, released as **v0.14.0**. Engram's operations and skills are
> invocable as slash commands in any agent implementing the Agent Skills standard,
> with no MCP server — and it is visible at every invocation which skills engram
> wrote and which the user did.

## What shipped

| | |
|---|---|
| Skill format | `<name>/SKILL.md` with engram's fields under `metadata`. The legacy single-file layout and the legacy `.engram/skills/` location are both still read; `engram upgrade` migrates, taking both hops at once |
| Operations as skills | One generated `SKILL.md` per operation, from a single registry. Each states the **shell command** — the gap that started the phase |
| Delivery | A skills-directory plugin at `.claude/skills/engram/`; plain `SKILL.md` directories for hosts with no plugin concept |
| Naming | `/engram:format` where the host namespaces, `/engram-format` where it does not, `/your-name` always |
| Protection | Regeneration, not permission. `doctor` warns before an edit is lost and names the source file |
| Authoring | `create-skill` as a built-in, and `engram skill new` which renders immediately |
| Contract | `AGENTS.md` gains **How to run these** — shell, slash, MCP, and the host constraints engram cannot fix |
| Root discovery | `engram` walks up for `.engram/`, stopping at a repository boundary (ADR-0046) |

Two ADRs: [0045](../../decisions/0045-skills-namespaced-by-the-host.md) amends
ADR-0044's collision decision; [0046](../../decisions/0046-vault-root-discovery.md)
amends ADR-0030's discovery half.

## What the phase actually taught

### The gate on T0.1 was the most valuable half-hour in it

The phase rested on a documentation claim. Verifying it first found that the
mechanism works **and** that two host constraints existed which the plan knew nothing
about — the one-time workspace trust dialog, and that project-scope plugins do not
walk up to the repository root. Both had to be *said* rather than fixed, in the
contract and in `doctor`. Neither would have been discovered by building first; both
would have shown up as "why don't my skills load" from a user.

The plan had a fallback ready if T0.1 failed. It wasn't needed, and having it meant
the gate cost nothing to hold.

### BUG-008's shape appeared twice more, and was prevented rather than fixed

`GEMINI.md` was the first, `STRUCTURE.md` the second — both the same mistake, a
generated file the walker did not know about. This phase found it in two more places:
`agents-md.ts` held a **second list of the six operations**, and a rendered `SKILL.md`
would have been indexed as a knowledge node.

Both were closed by deriving from a registry rather than restating. `operations()`
throws at load if the two lists ever diverge, and `isSkillPath` asks the adapter
registry the same way `isContractFile` already did. The invariant test — an empty
vault reports zero nodes for every structure, on both runs — catches the whole class,
which is why it fired for `STRUCTURE.md` and would fire again.

### Deferred work needs a name, or it becomes silent

Three findings arrived as "engram cannot do anything about this": overriding a
built-in leaves a stale render (`FileStore` has no removal, by design), a foreign file
blocks a render, and a hand-edited render is about to be lost. Each was returned in a
result object first — which is the same as not detecting it. All three now surface
through `doctor`, one line per condition. The first version emitted 27 warnings saying
the same thing, which is also the same as not detecting it.

### The honest answer to "how do we prevent editing" was "we don't"

The owner asked how built-in skills could be prohibited from modification. They
cannot be, on a filesystem the user owns, and a tool whose pitch is *plain files you
own* should not try. What made that acceptable was building the alternative:
regeneration takes the edit back, `doctor` warns first and names the source, and
override-by-name means nobody ever needs to edit engram's copy. Read-only file modes
were considered and rejected — they break on Windows, under sync, and through
`git clone`, and would assert a control engram does not have.

### A test that overstates what it checks is worse than a smaller one

The natural registry test — run every command, assert none falls through to the
switch default — hangs, because two commands read stdin and one is a server. Rather
than contriving arguments and quietly testing something weaker than the name implies,
it asserts what it can (every registered name is documented) and says in a comment
exactly what it does not cover and where that coverage lives.

## Verification Evidence

Every claim below was produced by running the command in this session and reading its
output. Where something could not be verified, it is listed at the end as not
verified rather than described as working.

### `npm run check` — exit 0

```
Test Files  44 passed (44)
     Tests  771 passed (771)
CLI smoke passed — the built binary works as installed.
plugin smoke passed — loading and wiring verified.
skills smoke passed — the rendered skill surface is what a person would see.
```

Eight stages: typecheck (both tsconfigs), lint, format:check, test, build, and three
smoke checks against the built artifact.

### End to end in a real Claude Code session (2.1.235)

Against a vault built by the shipped binary, nothing hand-placed:

```
/example-literature-review     ← yours, unprefixed
/literature-review             ← yours, unprefixed
/engram:capture
/engram:connect-the-dots
/engram:create-skill
/engram:doctor
/engram:format
/engram:init
/engram:link
/engram:reindex
/engram:weekly-digest
```

And invoking one:

```
$ claude -p "/engram:capture a thought that arrived during verification"
Captured → `raw/2026-08-23T13-38-15-249Z.md` (42 bytes).
It's unfiled and unvalidated, which is the point — nothing was rejected.

$ cat <vault>/raw/*.md
a thought that arrived during verification
```

Two things proved, not one: the slash command reached the agent, **and** the skill
body taught it the semantics — it volunteered that capture never rejects and named
the next operation unprompted. Full record in
[`evidence/t6-5-end-to-end.md`](evidence/t6-5-end-to-end.md).

### The host's own validator

`smoke-skills.mjs` runs `claude plugin validate` against the rendered plugin whenever
`claude` is on the PATH, so the artifact is judged by the host rather than by engram's
opinion of it:

```
✓ `claude plugin validate` accepts the rendered plugin
```

### Every new check was verified by breaking the code it guards

| Reverted | What failed |
|---|---|
| Walk exclusion (`isSkillPath`) | `reindex node count changed between runs: 30 then 33` — BUG-008's exact signature — plus 6 unit tests |
| Root discovery in the CLI | Both new `smoke-cli` assertions: a second vault created in a subdirectory, and no refusal outside a vault |
| Skills moved inside `.claude-plugin/` | Both plugin-shape assertions in `smoke-skills` |

### The vault-root bug, before and after, on the built binary

```
# before
$ cd my-vault/concepts && engram capture "a thought"
captured 29 bytes -> /raw/...
$ find my-vault -path '*raw*'
my-vault/concepts/raw/...          ← a second vault inside the first

# after
$ cd my-vault/concepts && engram capture "a thought"
engram: vault root /…/my-vault
captured 29 bytes -> /raw/...
$ find my-vault -path '*raw*'
my-vault/raw/...
```

Plus: `engram doctor` outside any vault exits 1 naming `engram init`; a vault above an
unrelated `.git` is not resolved across the boundary (exit 1); `engram init` still
works where there is no vault.

### Acceptance criteria

| # | Criterion | Evidence |
|---|---|---|
| 1 | `npm run check` green | above |
| 2 | Plugin manifest + `skills/format/SKILL.md` | `smoke-skills`, asserted not eyeballed |
| 3 | `reindex` twice, identical node counts | `smoke-skills`; byte-identical asserted in unit tests |
| 4 | User skill rendered unprefixed | `smoke-skills` |
| 5 | Edited render → `doctor` names the source | verified on the built binary; `[skill-edited]` |
| 6 | Marker removed → survives reindex, reported | unit test + `[skill-not-ours]` |
| 7 | `capture` from a subdirectory | `smoke-cli` + manual, above |
| 8 | A real session lists `/engram:format` | above — and invoked it |

### Version propagation, on a freshly built vault

```
config.createdWith: 0.14.0
plugin manifest   : 0.14.0
skill marker      : engram-managed: 0.14.0
```

### Not verified

**Auto-discovery without `--plugin-dir`.** Project-scope plugins load only after the
interactive workspace trust dialog, and a headless run cannot accept one. This is a
documented host requirement, not an engram defect, and it is stated in `AGENTS.md` and
`docs/using-engram.md`. It remains a one-time user step per vault.

**Antigravity and Gemini CLI skill loading.** Their directories were confirmed from
documentation and engram writes to them, but no skill was watched loading in either.
The descriptors record exactly that, and the `verified` field makes the difference in
confidence legible rather than implied.
