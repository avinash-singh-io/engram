# Phase 19 — Tasks

> Branch: `phase-19-opencode-surface` · Plan: [plan.md](plan.md)
> Order: Group 0 → (Groups 1 + 2 in parallel) → Group 3 → Group 4

## Group 0 — Probe, then contracts

- [ ] G0: Live discovery probe executed — skill loads, `/probe` runs, `AGENTS.md` consulted; recorded in `evidence/t0-discovery-probe.md`
- [ ] G0: `CommandTarget` model + derived helpers (`commandTargets`, `commandPath`, `isCommandPath`) in `src/surface/adapters.ts`
- [ ] G0: `opencode` descriptor entry added (skills + commands targets, `verified:` pending)
- [ ] G0: Registry-derived walker exclusions cover `.opencode/commands/`
- [ ] G0: Unit tests pin path derivation and exclusion predicates

## Group 1 — opencode renderer

- [ ] G1: Renderer generalized over skills + commands targets (plugin-null skill path reused)
- [ ] G1: Command generator from operation registry — `description` frontmatter, body embeds SKILL.md instructions, `$ARGUMENTS` passthrough
- [ ] G1: Provenance / stale / skip semantics hold for commands
- [ ] G1: `auditSkills` expected-map includes command paths
- [ ] G1: Gitignore lines cover managed `engram-*.md` commands
- [ ] G1: Golden fixture `tests/fixtures/adapters/opencode/` pins emitted tree
- [ ] G1: `scripts/smoke-opencode.mjs` green (tree + idempotence)

## Group 2 — doctor visibility

- [ ] G2: Doctor reports per-agent surface state (contract strategy, counts, verification status)
- [ ] G2: Edited-generated-command detection names the source file
- [ ] G2: Unrendered-target warning suggests `engram reindex`

## Group 3 — Docs

- [ ] G3: `docs/adapters.md` rewritten for the v2 surface layer
- [ ] G3: Add-an-agent checklist + evidence-record template included
- [ ] G3: `docs/using-engram.md` opencode rows + caveats from probe

## Group 4 — Verification

- [ ] G4: `npm run check` fresh green incl. `smoke-opencode.mjs`
- [ ] G4: Live-session evidence recorded in `evidence/live-session.md`; descriptor `verified:` filled
- [ ] G4: Retrospective with verification evidence section
