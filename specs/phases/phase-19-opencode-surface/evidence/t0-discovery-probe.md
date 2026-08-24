# T0 — opencode discovery probe

> **Date**: 2026-08-24 · **opencode**: 1.18.21 · **Method**: headless
> `opencode run --dir <scratch>` (model `opencode/hy3-free` — the workspace
> default `gpt-5.6-luna` had insufficient balance; a free-tier model proves
> discovery mechanics identically)

## Scratch vault

`/var/folders/v4/698_nt3j7mx_1bwlynrklkjr0000gn/T/opencode/probe-vault/`

| File | Content |
|---|---|
| `.opencode/skills/probe/SKILL.md` | frontmatter `name: probe`, `description: …`, plus unknown field `engram-probe-extra: true` |
| `.opencode/commands/probe.md` | frontmatter `description: …`; body: reply `PROBE-COMMAND-OK` |
| `AGENTS.md` | contains "The vault secret phrase is amber-lantern." |

## Results

| Claim under test | Result | Evidence |
|---|---|---|
| Project skills load from `.opencode/skills/<name>/SKILL.md` | **Confirmed** | Model listed `SKILLS=customize-opencode,forge,probe,router,sieve` — `probe` present beside the user's global skills |
| Root `AGENTS.md` is injected as rules | **Confirmed** | `PHRASE=amber-lantern` answered from context alone, no tools |
| Unknown frontmatter fields are tolerated | **Confirmed** | `engram-probe-extra: true` present; skill still discovered, no error surfaced |
| `/command` executes from `.opencode/commands/*.md` | **Partially** — not exercisable headless | `opencode run "/probe"` passed the string to the model rather than executing the template (commands are TUI-level per docs). Execution check deferred to the G4 manual live-session criterion |

## Conclusion

The descriptor plan holds exactly as drafted: native skills target
`.opencode/skills/` (`plugin: null`), commands target `.opencode/commands/`,
no separate contract file. No divergence from the 2026-08-24 docs was observed.
