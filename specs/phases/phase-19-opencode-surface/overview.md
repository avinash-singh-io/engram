---
type: Phase
status: in-progress
tags: [adapters, opencode, skills, commands, doctor]
---

# Phase 19 — opencode surface & agent generalization

> **Status**: planned
> **Branch**: `phase-19-opencode-surface`
> **Target release**: v0.16.0
> **Not gated on Gate 2** — everything here renders surfaces for operations that
> already exist; the edge-accuracy verdict changes none of it.

## Goal

An engram vault works in an opencode session the way it works in Claude Code: the
contract is read, the six operations and any user skills are discoverable and
invocable — and adding the *next* agent is a documented, evidence-backed
descriptor edit rather than an archaeology project.

## Why now

Skills were observed missing in real opencode sessions (owner, 2026-08-24). The
root cause was confirmed against opencode's published docs the same day:

| Finding | Evidence |
|---|---|
| opencode discovers skills at `<skills-dir>/*/SKILL.md` — **one level deep** | [opencode.ai/docs/skills](https://opencode.ai/docs/skills/), 2026-08-24 |
| Engram's built-ins render at `.claude/skills/engram/skills/<name>/SKILL.md` — two levels under Claude's plugin layout, with `/engram:<name>` namespacing | `skillPath()` in `src/surface/adapters.ts` |
| Therefore nothing engram rendered is discoverable by opencode, and no `opencode` descriptor exists to render anything native | `AGENTS` registry has claude, antigravity, gemini only |

opencode *does* discover `.claude/skills/*/SKILL.md` as a compatibility path, but
only one level deep — user skills happen to surface, built-ins never do — and a
user can disable that discovery entirely (`OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1`).
Native rendering is the only robust answer.

## Key decisions

| # | Decision | Rationale | Grounding |
|---|---|---|---|
| 1 | Add an `opencode` descriptor: skills target `.opencode/skills/`, `plugin: null` → engram's own render as `engram-<name>`, user skills stay unprefixed | Mirrors the antigravity/gemini pattern exactly; "if it carries engram's mark, engram wrote it" holds via the prefix. Documented project location; walks up to worktree root like ADR-0046 | [skills docs](https://opencode.ai/docs/skills/) 2026-08-24 |
| 2 | Descriptors gain an optional second render-target type: **commands** (`dir`, naming), generated from the operation registry | Skills are opencode's *agent-invoked* surface (native `skill` tool, no slash form); commands are its *user-invoked* surface (`/engram-capture`). Bodies come from the same registry source beside each SKILL.md — never hand-written, so nothing can drift. `$ARGUMENTS` passes invocation text straight through | [commands docs](https://opencode.ai/docs/commands/) 2026-08-24; owner decision in brainstorm |
| 3 | No separate opencode contract file — the root `AGENTS.md` is the contract | opencode reads project `AGENTS.md` natively; `CLAUDE.md` is a fallback used only when no `AGENTS.md` exists, so engram's dual render causes zero conflict. "opencode doesn't parse file references" is irrelevant — ADR-0017 renders the contract in full. The claim is still proven live in G0 before being relied on | [rules docs](https://opencode.ai/docs/rules/) 2026-08-24 |
| 4 | The descriptor's `verified:` field stays empty until a real opencode session has been watched loading from these paths | ADR-0044 discipline: evidence beside the claim. Docs ground the design; only a live session earns the field | this phase's G0/G4 evidence |
| 5 | Generalization ships as **process**, not new abstraction | Adding an agent is already a descriptor (`src/surface/adapters.ts`). What was missing: `docs/adapters.md` still described the deleted v1 seam, codex vanished from the clean-room registry without a trace, and there was no checklist or evidence template. Rewrite the doc, publish the checklist, let `doctor` show per-agent state | owner decision in brainstorm |

## Frontmatter compatibility (pre-verified)

No serializer change is expected for skills:

- `renderedName()` (`src/surface/render-skills.ts:90`) already rewrites frontmatter
  `name` → `engram-<name>` for plugin-null targets, satisfying opencode's
  name-must-match-directory rule (`^[a-z0-9]+(-[a-z0-9]+)*$`, ≤64 chars).
- Engram's `metadata` is already a flat string→string map per the Agent Skills
  standard — exactly what opencode accepts. Unknown top-level fields (e.g.
  `allowedTools`) are ignored harmlessly; G0 confirms.

## Scope (In)

1. `opencode` descriptor entry (skills + commands targets) in `AGENTS`.
2. Renderer support for command targets: generation from the operation registry,
   provenance marker, stale reporting, markerless-collision skip — semantics
   identical to skills.
3. Walker/index exclusion for `.opencode/` rendered files, **derived from the
   registry** (the GEMINI.md trap must not re-arm).
4. Gitignore block extended for managed command files (`engram-*.md`).
5. `doctor`: per-agent surface state (contract strategy, skills count, commands
   count, verification status) + command audit parity
   (edited/stale/foreign/unrendered).
6. `docs/adapters.md` rewritten for the v2 surface layer, including the
   add-an-agent checklist with an evidence-record template.
7. `docs/using-engram.md` gains opencode rows in the agent table.
8. New smoke script rendering into a scratch vault, asserting the exact emitted
   tree and reindex idempotence.
9. Live verification: real opencode session at vault root sees the skills, exposes
   `/engram-*` commands, answers contract questions from `AGENTS.md`; recorded
   under `specs/phases/phase-19-opencode-surface/evidence/`.

## Scope (Out)

- `.agents/skills/` universal target — still unverified by this project against
  the Agent Skills spec; revisit when someone watches it load (ADR-0044).
- MCP wiring docs for opencode — `engram mcp` already works over stdio;
  documenting that host config is a docs-only follow-up, not this phase.
- codex or any other agent's re-entry — becomes the checklist's first exercise
  later.
- Home-directory scopes (`~/.config/opencode/skills/`) — machine-wide leak,
  refused since ADR-0044.
- Engram executing skills; new operations; anything Gate 2 touches.

## Acceptance criteria

1. `npm run check` green — suite, lint, typecheck, existing smokes, plus
   `smoke-opencode.mjs` (fresh output, this session).
2. Scratch-vault smoke asserts the exact tree: `.opencode/skills/engram-<op>/SKILL.md`
   per operation, user skills unprefixed beside them, `.opencode/commands/engram-<op>.md`
   per operation — asserted by script, not by eye.
3. `reindex` twice reports identical node counts with opencode renders present.
4. A rendered command edited by hand → `doctor` names the source file to edit instead.
5. A managed render with its provenance marker stripped survives `reindex` and is
   reported — existing skill semantics hold for commands.
6. `docs/adapters.md` describes the current seam (`AgentDescriptor`, two target
   types) and carries the evidence-backed add-an-agent checklist.
7. **Manual, and stated as manual**: an opencode session opened at the vault root
   lists engram's skills in `<available_skills>`, exposes `/engram-capture` etc.,
   and answers contract questions from `AGENTS.md`. The suite cannot assert this —
   it needs a real session, exactly like Phase 17 criterion 8. Evidence recorded in
   `evidence/live-session.md`; the descriptor's `verified:` cites it.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Live behavior diverges from the docs this plan is grounded on | Renderer built against wrong paths/names | G0 probe runs **before** code; descriptor-driven design makes adjustment cheap |
| Command-name collisions — opencode custom commands override built-ins | A user command clobbered, or engram's shadowed | Managed files carry the `engram-` prefix; a markerless file at a target path is skipped and reported, never overwritten (the skill rule) |
| Rendered command files become knowledge nodes | BUG-008's shape again; idempotence breaks | Exclusions derived from the registry via `isCommandPath()`, tested from both directions |
| `docs/adapters.md` drifts from reality again | Next agent onboarded against the v1 story | Rewrite ships in this phase, written from the code as it lands |

## Deliverables

| Deliverable | Verification command |
|---|---|
| `CommandTarget` model + derived helpers + exclusions | `npm test -- adapters` |
| opencode descriptor entry (verified pending) | `npm test -- adapters` |
| Command rendering w/ provenance, stale, skip | `npm test -- render` |
| Golden fixture pinning the emitted tree | `npm test -- fixtures` |
| `smoke-opencode.mjs` scratch-vault check | `node scripts/smoke-opencode.mjs` |
| Doctor per-agent state + command audit | `npm test -- doctor` |
| Gitignore lines cover managed commands | `npm test -- ignore` |
| `docs/adapters.md` v2 rewrite + checklist | human review |
| Whole suite + all smokes | `npm run check` |
| Live-session evidence + filled `verified:` | `evidence/live-session.md` exists, cited |
