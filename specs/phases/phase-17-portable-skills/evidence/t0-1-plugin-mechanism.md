# T0.1 — Does a skills-directory plugin load, and is it namespaced?

> **Verdict: PASS.** The mechanism is real, the manifest shape engram will generate
> validates, and namespacing works. Two constraints were discovered that the phase
> plan did not know about; both are recorded below and neither invalidates the design.
>
> Run 2026-08-23 against Claude Code **2.1.235**.

## Why this was a gate

The whole phase rests on a claim taken from documentation: that a folder under a
skills directory containing `.claude-plugin/plugin.json` loads with no marketplace
and no install step. Building on an unverified claim is how BUG-002 stayed "resolved"
for ten days while the registry disagreed. So it was verified first.

## Fixture

```
<scratch>/t0-1-plugin-probe/
├── .claude/skills/engram/
│   ├── .claude-plugin/plugin.json     { "name": "engram" }
│   └── skills/probe/SKILL.md          name: probe
└── .claude/skills/loose-probe/
    └── SKILL.md                       name: loose-probe
```

## Evidence

### 1. The manifest engram will generate validates

```
$ claude plugin validate <fixture>/.claude/skills/engram
✔ Validation passed with warnings
```

Warnings, all actionable and all taken into the implementation: no `version`, no
`description`, no `author`. Engram will emit all three — `version` from `VERSION`,
so a rendered plugin says which engram wrote it.

### 2. Namespacing works

```
$ claude -p "List every skill available to you..." --plugin-dir <fixture>/.claude/skills/engram
...
loose-probe
engram:probe          ← namespaced by the platform
frontend-design:frontend-design
...
```

Both shapes appear together: the plugin skill as `engram:probe`, the loose project
skill as `loose-probe`. **This is the phase's decision 2 demonstrated, not assumed** —
built-ins carry the prefix, user skills do not, and they coexist.

### 3. Auto-discovery did not fire under `-p`, and that is expected

The same command **without** `--plugin-dir` listed `loose-probe` but not
`engram:probe`. Three further placements were probed and none auto-loaded either:
`.claude/plugins/<name>/`, `.claude/<name>/`, `./<name>/`.

The official reference explains it exactly:

> Project-scope plugins (from `<cwd>/.claude/skills/`) load **only after you accept
> the workspace trust dialog**. Simply trusting a parent folder or running with `-p`
> is insufficient.

A headless `-p` run cannot accept a dialog, so this is the documented behaviour
rather than a defect. `claude plugin init` scaffolding to `~/.claude/skills/<name>/`
and auto-loading as `<name>@skills-dir` confirms the mechanism is first-class.

## Constraints discovered — new, and neither was in the plan

### C1 — Project scope requires a one-time workspace trust acceptance

`~/.claude/skills/` (personal) loads everywhere with no restrictions;
`<cwd>/.claude/skills/` (project) loads only after the trust dialog.

**Engram still chooses project scope**, per ADR-0044: `~/.claude/skills/` is
machine-wide and would leak one vault's skills into every unrelated project. The
friction is accepted deliberately, and it is one dialog the user sees anyway the
first time they open Claude Code in the vault. This is now a documented trade-off
rather than an unexamined default — the friction-free option exists and is refused.

### C2 — Project-scope plugins do **not** walk up to the repository root

> They load **only from `.claude/skills/` of the directory where you start Claude
> Code.** They do not walk up to the repository root like plain skills and commands do.

Start Claude Code in a subdirectory of the vault and the engram plugin does not load
at all. Engram cannot fix this — it is the host's rule — so it must be **said**:
`doctor` gains a check, and the contract says where to start a session.

This also strengthens Group 4 rather than duplicating it. Root discovery fixes
`engram capture` misfiling from a subdirectory; it cannot make the plugin load there.
The two are independent, and the vault root is the answer to both.

## What this changes in the plan

| | |
|---|---|
| Decision 1 (plugin) | **Confirmed.** No fallback needed. |
| Decision 2 (namespace) | **Confirmed by observation** — `engram:probe` and `loose-probe` listed side by side. |
| Manifest contents | Add `version`, `description`, `author` — the validator asks for all three. |
| New work | `doctor` check + contract text for C1 and C2. |
