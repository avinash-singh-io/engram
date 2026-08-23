# Phase 17 — Tasks

> Order: Group 0 → Group 1 → (2 + 3 + 4) → Group 5 → Group 6
> Mark `[x]` only after a verification command produced passing output **this session** (Rule 12).

## Group 0 — Contracts
- [x] T0.1 Verify a skills-directory plugin loads in a real session — **gate on this**
- [x] T0.2 `SkillTarget` on `AgentDescriptor`
- [x] T0.3 `PLUGIN_DIR` / `PLUGIN_MANIFEST` / `MANAGED_KEY` defined once
- [x] T0.4 ADR-0045

## Group 1 — Format
- [ ] T1.1 `parseSkill` reads `metadata.engram-*`, legacy still accepted
- [ ] T1.2 `discoverSkills` handles all three layouts
- [ ] T1.3 `serializeSkill` — the single generator
- [ ] T1.4 `engram upgrade` migrates legacy skills (copies, never deletes)

## Group 2 — Operations as skills
- [ ] T2.1 Registry carries when-to-use + invocation
- [ ] T2.2 One `SKILL.md` per operation
- [ ] T2.3 `allowed-tools` hint, documented as non-enforcing
- [ ] T2.4 Invariant: every operation has a skill

## Group 3 — Rendering
- [ ] T3.1 `renderSkills` writes plugin + siblings
- [ ] T3.2 Provenance marker governs overwrite
- [ ] T3.3 Override removes the built-in
- [ ] T3.4 Walk exclusion derived from the registry
- [ ] T3.5 Narrow managed gitignore lines
- [ ] T3.6 `reindex` calls `renderSkills`

## Group 4 — Root discovery
- [ ] T4.1 ADR-0046
- [ ] T4.2 `findVaultRoot` with a `.git` stop
- [ ] T4.3 CLI resolves and reports the root
- [ ] T4.4 No root → error naming `engram init`

## Group 5 — Wiring
- [ ] T5.1 `create-skill`
- [ ] T5.2 `engram skill new <name>`
- [ ] T5.3 `AGENTS.md` — How to run these
- [ ] T5.4 `doctor` checks

## Group 6 — Verification
- [ ] T6.1 `scripts/smoke-skills.mjs` in `npm run check`
- [ ] T6.2 Idempotence invariant with skills rendered
- [ ] T6.3 Revert-and-fail both checks
- [ ] T6.4 `docs/using-engram.md`
- [ ] T6.5 Manual session verification, recorded either way
