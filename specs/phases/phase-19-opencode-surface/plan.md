# Phase 19 — Implementation plan

**Reference Specs** (`specs/architecture/`, stable during work per Rule 10):
[v2-overview.md](../../architecture/v2-overview.md) §6 (skills — instructions,
never code) and §11 (surfaces); ADR-0011, ADR-0017, ADR-0044, ADR-0045, ADR-0046
in `specs/decisions/`. No release-plan.md exists; target release v0.16.0 per
overview.

```
# Sequential: Group 0 → (Groups 1 + 2 in parallel) → Group 3 → Group 4
```

## Group 0 — Probe, then contracts

**Sequential.** Blocks everything: the probe's findings feed the descriptor, and
the descriptor model is the seam both middle groups build on.

**External dependencies**: an installed `opencode` CLI for the probe (manual,
time-boxed; if unavailable on a machine, the probe waits — no code starts until
its evidence exists).

**Commit**: `feat(surface): command render-targets in the descriptor model`

1. **Live discovery probe (manual)**. In a scratch vault, hand-write one minimal
   skill at `.opencode/skills/probe/SKILL.md` and one trivial command at
   `.opencode/commands/probe.md`; open a real opencode session at the vault root;
   confirm all three:
   - the skill appears in `<available_skills>` and loads via the `skill` tool
   - `/probe` executes as a slash command
   - contract questions are answered from `AGENTS.md` content
   Also note whether unknown frontmatter fields (e.g. `allowedTools`) cause any
   warning worth encoding in `caveats`. Record everything in
   `specs/phases/phase-19-opencode-surface/evidence/t0-discovery-probe.md`.
   **If discovery diverges from the docs, adjust the descriptor plan here — before
   any code exists to rework.**
2. Extend `src/surface/adapters.ts`:
   - `CommandTarget { dir: string; verified: string; caveats: string[] }` and
     `commands?: CommandTarget` on `AgentDescriptor`
   - derived helpers: `commandTargets()`, `commandPath(target, name)` →
     `${dir}/engram-${name}.md` (managed prefix is unconditional — commands have
     no user-authored source today), `isCommandPath(path)`
   - the `opencode` entry: skills `{ dir: '/.opencode/skills', plugin: null }`,
     commands `{ dir: '/.opencode/commands' }`, both with `verified:` reading
     "pending — see phase-19 evidence" until G4 fills them
3. Walker/index exclusion covers command dirs via the registry derivation —
   `isCommandPath()` joins `isSkillPath()`/`isContractFile()` wherever the walker
   consults them.
4. Unit tests pinning: path derivation for both target types, prefixed/unprefixed
   skill names, exclusion predicates true inside `.opencode/`, false outside,
   unchanged rejection of unknown agents.

## Group 1 — opencode renderer

**Parallel with Group 2** — touches only `src/surface/render-skills.ts` (+ tests,
fixture, smoke); Group 2 touches only `src/ops` doctor code.

**External dependencies**: none.

**Commit**: `feat(surface): render skills and commands for opencode`

1. Generalize `renderSkills` over both target types. Skills into
   `.opencode/skills/`: built-ins as `engram-<name>/SKILL.md`, user skills as
   `<name>/SKILL.md` — the existing plugin-null path, reused.
2. New command generator from the operation registry:
   - destination `.opencode/commands/engram-<op>.md`
   - frontmatter: `description:` from the operation's registry summary
   - body: embeds the same instruction content the operation's SKILL.md carries,
     plus `$ARGUMENTS` passthrough where the operation accepts input text
     (`capture`, `link`, …) so `/engram-capture some thought` works first try
   - provenance marker written identically to skills
3. Semantics parity with skills, all four:
   - markerless file already at a target path → skipped + reported, never touched
   - managed render no longer mapped to an operation → stale, reported not deleted
   - `auditSkills` extends to commands (expected-map includes command paths) so
     `doctor` gets edited/stale/foreign/unrendered for free from one definition
   - `skillIgnoreLines` gains managed command files (`engram-*.md`) — derived
     state stays uncommitted per ADR-0029
4. Golden fixture `tests/fixtures/adapters/opencode/` pinning the whole emitted
   tree for a vault with one user skill.
5. `scripts/smoke-opencode.mjs`: scratch vault → init → reindex ×2 → assert exact
   tree (skills + plugin-less layout + commands), identical node counts both runs,
   idempotent gitignore block.

## Group 2 — doctor visibility

**Parallel with Group 1** — independent feature area.

**External dependencies**: none.

**Commit**: `feat(ops): doctor reports per-agent surface state`

1. New `doctor` section listing every registered agent: contract strategy
   (native `AGENTS.md` vs rendered file), skills rendered (count by origin),
   commands rendered (count), verification status (verified date/source vs
   "pending — see phase-19 evidence").
2. Edited-generated-file detection extended to commands via the shared audit
   (`Group 1.3`), naming the source file to edit instead — same wording rules as
   skills so nobody learns a second dialect.
3. Unrendered-state warning: an agent whose targets exist but hold zero renders
   suggests running `engram reindex`.

## Group 3 — Docs

**Sequential** — written against the shapes Groups 0–2 landed, so it documents
what exists rather than what was intended.

**External dependencies**: none.

**Commit**: `docs: adapters for the v2 surface layer + add-an-agent checklist`

1. Rewrite `docs/adapters.md` from the current code: the v1 story
   (`src/adapters/commands.ts`, `COMMAND_DEFINITIONS`) replaced by the real seam —
   `AgentDescriptor`, two optional render-target types, registry-derived safety
   (`isSkillPath`/`isCommandPath`/`isContractFile`), provenance-and-regeneration
   protection.
2. Add the add-an-agent checklist, each step naming its artifact:
   live probe → descriptor entry (verified pending) → golden fixture + smoke →
   evidence file → fill `verified:` — plus the evidence-record template the
   probe and live-session checks both follow.
3. `docs/using-engram.md`: opencode rows in the agent table (invocation forms:
   skill-tool names for agent-invoked, `/engram-capture` etc. for commands),
   caveats from G0 (trust dialog if any, cwd-at-vault-root, the
   `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` note).

## Group 4 — Verification

**Sequential.** Last: nothing else may move while evidence is captured.

**External dependencies**: installed `opencode` CLI for the live-session check.

**Commit**: `test: phase-19 acceptance evidence`

1. `npm run check` fresh green (suite, lint, typecheck, smoke-cli, smoke-plugin,
   smoke-skills, smoke-opencode).
2. Live session check per overview criterion 7 →
   `specs/phases/phase-19-opencode-surface/evidence/live-session.md` (template
   from Group 3's checklist). Fill the opencode descriptor's `verified:` fields
   with date + evidence pointer — the single edit that turns "pending" into
   claimed.
3. Retrospective with a `## Verification Evidence` section quoting fresh output.
