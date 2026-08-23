# Phase 17 — Implementation plan

# Execution order:
# Group 0 → Group 1 → (Groups 2 + 3 + 4 in parallel) → Group 5 → Group 6

## Reference specs (Rule 10)

Read as a **stable reference** during implementation. Gaps are logged as
`[ARCH_CHANGE]` in `history.md` with `Affects-specs:` and reconciled at
`/sync-docs`, never edited mid-phase.

| Spec | Why it is relevant |
|---|---|
| [`specs/architecture/v2-overview.md`](../../architecture/v2-overview.md) §6 | Defines what a skill is and the guarantee that bounds it — a skill can only sequence operations that already exist, because engram never runs one. Groups 1–2 must not weaken this. |
| [`specs/architecture/v2-overview.md`](../../architecture/v2-overview.md) §1 | Engram mediates two of four write paths. Rendering skills into agent directories adds no write path — the agent still calls the same operations through the same gate. |
| [`specs/architecture/ecosystem.md`](../../architecture/ecosystem.md) | Where agent adapters sit. This phase extends the descriptor registry rather than adding a layer. |

**Additive vs decisional (Rule 10).** Giving `AgentDescriptor` a skills target is
*additive* — a new field on an existing design, reconciled at completion. The
namespace change and vault-root discovery are *decisional*, so ADR-0045 and
ADR-0046 are written **before** any spec update, as T0.4 and T4.1.

---

## Group 0 — Verify the mechanism, then write the contracts

**Sequential. Blocks everything.**
External dependencies: a real Claude Code session for T0.1.

The whole phase rests on a claim from documentation. Verify it against a running
agent before building on it — the same discipline BUG-002 was resolved under:
check the thing itself, not the record of it.

- **T0.1** Hand-build `.claude/skills/engram/` with a two-line `plugin.json` and one
  trivial `SKILL.md` in a scratch directory. Open a session there. Confirm the skill
  lists as `/engram:<name>` with no marketplace and no install. **If this fails, the
  phase stops here and falls back to ADR-0044's provenance-marker plan unchanged.**
- **T0.2** `SkillTarget` on `AgentDescriptor` — the directory an agent reads skills
  from, plus whether it supports a plugin manifest. Descriptors only; no code.
- **T0.3** Constants in one place: `PLUGIN_DIR`, `PLUGIN_MANIFEST`, `MANAGED_KEY`.
  Restating a path in a second module is what produced BUG-008 twice.
- **T0.4** ADR-0045 — the plugin, the namespace, regeneration-as-protection.
  Amends ADR-0044 §Collisions and §2.

Commit: `docs(specs): ADR-0045 — skills ship as a plugin, namespaced by the platform`

---

## Group 1 — The skill format becomes SKILL.md

**Sequential. Depends on Group 0. Blocks 2 and 3.**

- **T1.1** `parseSkill` reads `metadata.engram-uses` / `engram-guardrails`, and still
  reads top-level `uses`/`guardrails` as legacy. Validation logic unchanged — only
  the field's location moves. The array-before-object ordering trap in the current
  parser stays covered by its existing test.
- **T1.2** `discoverSkills` accepts three source layouts: `<name>/SKILL.md`,
  flat `<name>.md`, and the legacy `.engram/skills/`. Directory form wins on a tie.
- **T1.3** `serializeSkill` — one generator producing spec-shaped output. Every
  rendered file in Groups 2 and 3 goes through it, so no caller can emit a variant.
- **T1.4** `engram upgrade` migrates legacy skills to the directory layout. Copies,
  never deletes — same rule the rest of `upgrade` already follows.

Commit: `feat(skills): the Agent Skills format, with the legacy layout still read`

---

## Group 2 — Operations become skills

**Parallel with Groups 3 and 4. Depends on Group 1.**

- **T2.1** Extend the operation registry with what a skill needs: a
  when-to-use sentence and the invocation shape. Derived from `OPERATIONS`, so a
  seventh operation cannot ship without a skill.
- **T2.2** Generate a `SKILL.md` per operation. Each states the shell command, the
  arguments, what the gate may do to the result, and that a QUEUE outcome is not a
  failure.
- **T2.3** `allowed-tools: Bash(engram:*)` on each. Experimental and non-enforcing —
  a hint, and the tests say so rather than asserting a guarantee.
- **T2.4** Invariant test: every name in `OPERATIONS` has a generated skill, asserted
  over the registry rather than a hand-written list.

Commit: `feat(skills): every operation ships as a skill that explains how to run it`

---

## Group 3 — Rendering, provenance, and the walk

**Parallel with Groups 2 and 4. Depends on Group 1.**

- **T3.1** `renderSkills(files, skills, agents)` — writes the plugin manifest and
  engram's built-ins under it, user skills as siblings.
- **T3.2** Provenance: `metadata.engram-managed`. Absent → write. Present → regenerate.
  Present-without-marker → never touch, and report. (ADR-0044 §4, unchanged.)
- **T3.3** Override removes rather than shadows — a user skill named after a built-in
  means engram renders no built-in of that name.
- **T3.4** Walk exclusion **derived from the descriptor registry**, in `walk.ts` where
  both `core/` and `surface/` are reachable — exactly where `isContractFile` already
  lives. Not a new entry in `RESERVED_FILES`.
- **T3.5** Gitignore: engram-managed lines for the render targets, narrowly scoped.
  `.claude/` may hold the user's own settings and commands — engram ignores what it
  renders and nothing else.
- **T3.6** `reindex` calls `renderSkills` after `writeContracts`.

Commit: `feat(surface): render skills into every agent's directory`

---

## Group 4 — Vault-root discovery

**Parallel with Groups 2 and 3. Independent of skills.**

Included here because a slash command runs from wherever the session's cwd is. A
skill that invokes `engram capture` from a subdirectory currently creates a second
vault inside the first, which would make Groups 2–3 ship a working invocation
path onto a broken one.

- **T4.1** ADR-0046 — walking up for `.engram/` is *discovery*; ADR-0030's boundary
  rule is unchanged. One root is still the whole world; engram just stops requiring
  the human to be standing on it.
- **T4.2** `findVaultRoot(cwd)` — walk up to the filesystem root or a `.git` boundary,
  whichever comes first. Stops at `.git` so a vault nested in an unrelated repo is
  never resolved past its own project.
- **T4.3** CLI resolves the root before constructing `NodeFileStore`; prints the
  resolved root when it differs from cwd, so the behaviour is visible rather than magic.
- **T4.4** No root found → an error naming `engram init`, not a silently created vault.

Commit: `fix(cli): find the vault root instead of assuming the current directory`

---

## Group 5 — Wiring

**Sequential. Depends on 2, 3 and 4.**

- **T5.1** `create-skill` — a built-in skill instructing an agent to write a user
  skill into `engram/skills/<name>/SKILL.md`, validate it, and reindex. Invoked as
  `/engram:create-skill`.
- **T5.2** `engram skill new <name>` — the same thing without an agent, since a
  skill that can only be created by an agent is a poor primitive.
- **T5.3** `AGENTS.md` gains **How to run these** — the shell form, the slash form,
  the MCP form, and which are available in this vault. This is the finding that
  started the phase: the contract described capabilities and never invocation.
- **T5.4** `doctor`: an edited managed skill (extend `isDerived` coverage so the
  existing `[derived-not-generated]` check fires and names the source to edit
  instead); a source skill with no rendered copy; a skill whose marker was removed.

Commit: `feat(skills): create-skill, and a contract that says how to invoke`

---

## Group 6 — Verification

**Sequential. Last.**

- **T6.1** `scripts/smoke-skills.mjs` — scaffold a temp vault with the built binary,
  add a user skill, reindex twice, assert the plugin manifest, the namespaced
  built-ins, the unprefixed user skill, unchanged node counts, and that no rendered
  skill appears in `index.md`. Wire into `npm run check`.
- **T6.2** Idempotence invariant extended: an empty vault reports zero nodes for
  every structure, on first and second reindex, **with skills rendered**. This is the
  test that would have caught BUG-008 all three times.
- **T6.3** Revert-and-watch-it-fail for T6.1 and T6.2 — the check that a check works.
- **T6.4** `docs/using-engram.md`: invoking without MCP, writing a skill, what
  regeneration means for anything under an agent directory.
- **T6.5** Manual verification in a real session; record the result in `evidence/`
  whether it passes or fails.

Commit: `test(skills): smoke the rendered skill surface end to end`
