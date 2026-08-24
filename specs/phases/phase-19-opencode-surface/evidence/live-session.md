# Live session — opencode against a rendered vault

> **Date**: 2026-08-24 · **opencode**: 1.18.21 · **Vault**: scratch vault
> scaffolded by `dist/cli.js init` + `reindex` (the **built binary**, not source),
> with one user skill (`literature-review`) in `engram/skills/`.
> **Model**: `opencode/hy3-free` via `opencode run --dir <vault>` (headless).

## What was asked

> Answer from context only, no tools: 1) List every skill name available to you.
> 2) Which file are this vault's rules injected from? 3) According to the rules,
> what command persists raw content without validating it?

## What came back

```
SKILLS=capture, connect-the-dots, create-skill, customize-opencode, doctor,
engram-capture, engram-connect-the-dots, engram-create-skill, engram-doctor,
engram-format, engram-init, engram-link, engram-reindex, engram-weekly-digest,
example-literature-review, forge, format, init, link, literature-review,
reindex, router, sieve, weekly-digest;
RULES=AGENTS.md;
CAPTURE=engram capture
```

| Claim | Verdict |
|---|---|
| All six operation skills discoverable from `.opencode/skills/engram-<op>/` | ✅ `engram-init`, `engram-capture`, `engram-format`, `engram-link`, `engram-reindex`, `engram-doctor` all listed |
| User skills render unprefixed beside them | ✅ `literature-review` listed |
| Rules injected from root `AGENTS.md` | ✅ answered without tools |
| Contract content actually read | ✅ "persist raw content without validating" → `engram capture` |
| `/engram-*` slash-command execution | ⏳ **not exercisable headless** — commands are TUI-executed per docs; the files' mechanics (frontmatter, `$ARGUMENTS`, marker) are smoke-checked against the built binary. Owner confirms `/engram-capture <text>` in a TUI session once; expected to pass |

The unprefixed duplicates of engram's own names (`capture`, `format`, …) come from
other discovery scopes on this machine (global directories), not from this vault's
render — which is exactly why engram prefixes its own: both can coexist without
ambiguity about who wrote what.

## Consequence

The opencode descriptor's `verified:` fields now cite this file. The skills claim
is fully earned; the commands claim stays explicit that TUI execution awaits one
owner action.
