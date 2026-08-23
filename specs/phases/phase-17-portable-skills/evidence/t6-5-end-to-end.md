# T6.5 — Does an agent actually get the skills?

> **Verdict: PASS, with one half still user-side.** A real Claude Code session lists
> every engram skill under `/engram:`, lists the user's own unprefixed, and
> successfully *invokes* one end to end. What remains manual is auto-discovery
> without `--plugin-dir`, which needs the interactive workspace trust dialog.
>
> Run 2026-08-23 against Claude Code **2.1.235** and engram built from
> `phase-17-portable-skills`.

## The vault

Built with the shipped binary, nothing hand-placed:

```bash
engram init --vault <v>
engram skill new literature-review --vault <v>
```

Which rendered:

```
.claude/skills/engram/.claude-plugin/plugin.json
.claude/skills/engram/skills/{init,capture,format,link,reindex,doctor}/SKILL.md
.claude/skills/engram/skills/{connect-the-dots,weekly-digest,create-skill}/SKILL.md
.claude/skills/example-literature-review/SKILL.md
.claude/skills/literature-review/SKILL.md
```

## 1. Both shapes appear, and they are distinguishable at a glance

```
$ claude -p "List every skill available to you, by exact invocation name…" \
    --plugin-dir <v>/.claude/skills/engram

/example-literature-review     ← yours
/literature-review             ← yours
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

**This is the phase's central claim, observed rather than argued.** Engram's own
skills carry the namespace; the user's do not. Typing `/engram:` lists the whole
engram set, which was the discovery objection that started the naming decision.

## 2. Invoking one works end to end

```
$ claude -p "/engram:capture a thought that arrived during verification" …

Captured → `raw/2026-08-23T13-38-15-249Z.md` (42 bytes).

It's unfiled and unvalidated, which is the point — nothing was rejected. When you
want it promoted out of `raw/`, `/engram:format` will give it a title, a container,
and its relations.
```

And on disk:

```
$ cat <v>/raw/*.md
a thought that arrived during verification
```

Two things are proved here, not one. The slash command reached the agent **and** the
skill body taught it the semantics: it volunteered that capture never rejects and
named the next operation. That is what the `when`/`steps` fields in the operation
registry are for, and it is why a skill is worth more than a table entry.

## 3. What is still manual

Auto-discovery **without** `--plugin-dir` needs the workspace trust dialog, and a
headless `-p` run cannot accept one — the reference is explicit that trusting a parent
folder or running with `-p` is insufficient. So this remains a user step, once per
vault:

1. Open Claude Code **at the vault root**.
2. Accept the workspace trust prompt.
3. `/engram:` should list the skills above.

Engram chooses project scope knowing this costs a prompt. The alternative,
`~/.claude/skills/`, has no prompt and is machine-wide — it would leak one vault's
skills into every unrelated project. That trade is recorded in ADR-0045 rather than
left as an unexamined default.

Two host rules engram cannot work around, both now stated in `AGENTS.md` and both
covered by `doctor` where detectable: the trust prompt above, and that project-scope
plugins **do not walk up** — a session started in a subdirectory gets no engram
skills. `engram` itself works from any subdirectory (ADR-0046); the slash commands do
not, and that is Claude Code's rule.

## 4. The official validator agrees

`scripts/smoke-skills.mjs` runs `claude plugin validate` against the rendered plugin
on every `npm run check` where `claude` is on the PATH, so this does not depend on
anyone remembering to re-check it:

```
✓ `claude plugin validate` accepts the rendered plugin
```
