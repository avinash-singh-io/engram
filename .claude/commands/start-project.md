Scaffold a new project from a clear idea.

Run this on a NEW or EMPTY repository when you know what you're building.
If you're still exploring the idea, run `/brainstorm-idea` first.

Turns a settled concept into a fully spec-driven project: vision, roadmap, Phase 0 ready to go. **Scaffolding happens only after you explicitly approve the plan.** See the [Brainstorm Gate Contract](#brainstorm-gate-contract) below.

## Steps

0. **Enter the brainstorm gate**:
   ```bash
   mkdir -p .momentum && touch .momentum/brainstorm-active
   ```
   From here until Step 8, do NOT call `Write`/`Edit`/`MultiEdit` on any path under `specs/`. The PreToolUse hook will block such calls.

1. Confirm the idea is clear — ask if needed:
   - What does this project build or do?
   - What type of repository? (monorepo with architecture specs / standard library or package)
   - What is the primary tech stack / language?
   - Any hard constraints (performance, compliance, dependencies)?

2. Determine repo type from answers:
   - Monorepo → full architecture constitution in `specs/architecture/`
   - Standard → implementation tracking only

3. **Plan the scaffold in conversation only** — no file writes yet:
   - Sketch the vision (charter, principles, success criteria) in chat
   - For monorepo: sketch initial architecture (core abstractions, interfaces, contracts)
   - Design the phase roadmap (natural phases, dependencies)
   - Draft Phase 0 contents using the [Group Execution Pattern](#group-execution-pattern)
   - List every file that scaffolding will create (paths only — content stays in chat)

4. Present the scaffolding plan for approval:
   - Show the proposed file list
   - Show key sections of vision + Phase 0
   - Ask: "Ready to scaffold? This will create N files. Approve to proceed."

5. **On approval — exit the gate**:
   ```bash
   rm .momentum/brainstorm-active
   ```

6. Scaffold directory structure:
   ```bash
   mkdir -p docs specs/backlog/details specs/changelog specs/decisions \
     specs/phases specs/planning specs/vision scripts \
     .claude/commands .agent/rules
   touch specs/backlog/details/.gitkeep
   # monorepo only:
   mkdir -p specs/architecture/adrs specs/benchmarks
   ```

7. Create all files in one batch:
   - `specs/vision/project-charter.md` — problem, goals, non-goals, stakeholders
   - `specs/vision/principles.md` — engineering principles
   - `specs/vision/success-criteria.md` — measurable completion criteria
   - For monorepo: `specs/architecture/` first-pass architecture doc
   - `specs/planning/roadmap.md`
   - `specs/phases/phase-0-shortname/{overview,plan,tasks,history}.md`
   - `CLAUDE.md` (from `.agent/rules/project.md` template)
   - `specs/phases/index.json`, `specs/decisions/impact-map.json`
   - `specs/status.md`, `specs/backlog/backlog.md`
   - `specs/decisions/0000-template.md`, `specs/decisions/README.md`
   - `specs/phases/README.md`, `specs/README.md`
   - `specs/changelog/YYYY-MM.md`

8. Initial git commit:
    ```bash
    git add .
    git commit -m "feat: initialize spec-driven project — {project name}

    - Vision, roadmap, Phase 0 brainstormed and ready
    - Full spec-driven structure: specs/, CLAUDE.md, commands, hooks
    - Ready for /start-phase"
    ```

9. Report to user:
   - Summary of what was created
   - Phase 0 goal and key deliverables
   - Prompt: "Project scaffolded. Run `/start-phase` to begin Phase 0."

---

## Brainstorm Gate Contract

This command runs in two phases: **brainstorm** (conversational, no disk writes) and **commit** (writes files to disk on explicit approval).

### Sentinel-driven enforcement

A file `.momentum/brainstorm-active` exists for the lifetime of the brainstorm phase. While it exists, the Claude Code `brainstorm-gate.sh` PreToolUse hook blocks any `Write`/`Edit`/`MultiEdit` call whose target lives under `specs/`. The hook is the safety net; the discipline below is the primary contract.

### Sequence

1. **Enter brainstorm** — `mkdir -p .momentum && touch .momentum/brainstorm-active`
2. **Draft in conversation only** — vision sketch, architecture sketch, roadmap, Phase 0 plan all live in chat. NEVER call `Write`/`Edit`/`MultiEdit` on `specs/` paths during this phase.
3. **Present for approval** — show the user the full draft including the list of files scaffolding will create. Ask: "Ready to scaffold? Approve to proceed."
4. **Exit brainstorm on approval** — `rm .momentum/brainstorm-active`, then create all files in one batch and commit.

### Red flags — STOP and stay in conversation

| If you find yourself thinking… | …STOP and stay in conversation |
|---|---|
| "I'll create the directory structure now so I can see it" | The conversation IS the plan. The hook will block any `specs/` write. |
| "The user said the project name; I'll start scaffolding" | Project name ≠ approval. Show the full plan, then ask. |
| "I'll write `specs/vision/project-charter.md` first while we figure out the rest" | All-or-nothing: every file goes in one batch on approval. Otherwise the project ends up half-scaffolded if the user changes their mind. |
| "It's an empty repo, no harm in writing early" | Scaffolding an empty repo creates a commitment to the structure. Approval first. |

### Anti-rationalization counters

- "Faster to scaffold incrementally as we decide each piece" — no: incremental scaffolding makes "undo" expensive. Batch on approval.
- "The user obviously wants this, they ran the command" — they want a project scaffolded; they have not yet seen the proposed structure.
- "The roadmap is generic enough I can write it now" — even a generic roadmap is a commitment; show it first.

---

## Group Execution Pattern

Declare the execution order at the top of every plan.md:

```
# Sequential:  Group 0 → Group 1 → Group 2
# Parallel:    (Groups 0 + 1 + 2 in parallel) → Group 3
# Mixed:       Group 0 → (Groups 1 + 2 in parallel) → Group 3
```

Every group header declares:
- `**Sequential.**` or `**Parallel with Groups X and Y.**`
- External dependencies (libraries, services, running processes)
- Commit message for the group

Standard layout:
- **Group 0** — contracts, types, migrations (sequential, blocks everything)
- **Middle groups** — independent feature areas (parallel candidates)
- **Second-to-last** — wiring and integration (sequential)
- **Last** — verification: tests, benchmarks, smoke tests (sequential)

## Key Principles
- Idea should already be clear before running this — use `/brainstorm-idea` to get there
- Phase 0 scope should be achievable in a focused sprint
- Architecture sketch is a starting point, not a commitment
- Record all key decisions from the dialogue in Phase 0's `history.md`
- **Brainstorm Gate**: see the contract above. Scaffolding only after explicit approval.
