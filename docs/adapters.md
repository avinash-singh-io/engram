# Agent adapters

> How Engram scaffolds an agent's command surface, and how to add a new agent.
> See [ADR-0011](../specs/decisions/0011-adapters-converge-on-agents-md.md).

## The model

Every supported agent reads the **same** vault. Two things are shared across all
agents and never duplicated per agent:

1. **`AGENTS.md`** — the OKF-mandated root traversal contract (progressive
   disclosure: start at `/index.md`, filter by frontmatter, descend, follow
   absolute links). `engram init` emits it once; it is agent-agnostic.
2. **The command-definition set** (`src/adapters/commands.ts`,
   `COMMAND_DEFINITIONS`) — one agent-neutral instruction body per engram
   command (`capture`, `refine`, `link`, `reindex`, `promote`). This is the
   single source of command semantics.

An **adapter** is a thin descriptor that maps each shared command definition to
that agent's file convention. It implements the `Adapter` seam:

```ts
interface Adapter {
  id: string; // e.g. 'codex'
  label: string; // human-facing one-liner
  files(assetsRoot: string): AdapterFile[]; // what to scaffold
}

interface AdapterFile {
  dest: string; // vault-relative destination
  content?: string; // inline (rendered from a command definition) …
  src?: string; // … or a bundled asset path (exactly one of the two)
  mode?: 'skip' | 'merge-json';
}
```

| Agent | Command surface | Extra |
| --- | --- | --- |
| `claude` | `.claude/commands/<name>.md` (slash-commands) | `.claude/settings.json` PostToolUse write-hook |
| `codex` | `.codex/prompts/<name>.md` (custom prompts, `/name`) | reuses `AGENTS.md` |
| `antigravity` | `.antigravity/commands/<name>.md` | reuses `AGENTS.md` |

## Scaffolding

```bash
engram init --agent claude        # default
engram init --agent codex
engram init --agent antigravity
engram init --agent all           # every registered adapter
```

An unknown `--agent` value is rejected with the list of valid ids. The command
files live under dot-directories, so they are excluded from the concept walker
and never pollute `index.md`.

## Adding a new agent

A new agent is a **descriptor, not a fork** (ADR-0011):

1. Create `src/adapters/<agent>.ts` exporting an `Adapter`. Render each entry of
   `COMMAND_DEFINITIONS` into the agent's file convention (add a
   `render<Agent>(def)` helper in `src/adapters/commands.ts` if the wrapper is
   novel). Reuse the shared `AGENTS.md` — do not re-emit it.
2. Register it in `src/adapters/index.ts` (`ADAPTERS`).
3. Add a golden fixture under `tests/fixtures/adapters/<agent>/` and a
   `tests/adapters/<agent>.test.ts` that pins the emitted tree.

You do **not** write new command instruction text — it already lives in the
shared set, so every agent stays in lockstep.
