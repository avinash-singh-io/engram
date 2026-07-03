import { COMMAND_DEFINITIONS, renderAntigravityCommand } from './commands';
import type { Adapter, AdapterFile } from './types';

/**
 * Antigravity adapter — Antigravity consumes the root `AGENTS.md` natively
 * (shared traversal contract, emitted by `engram init`) and exposes each engram
 * command as a per-agent command file under `.antigravity/commands/<name>.md`.
 * The command bodies are rendered from the same shared definitions as every
 * other agent, so Antigravity is a descriptor, not a fork (ADR-0011).
 */
export const antigravityAdapter: Adapter = {
  id: 'antigravity',
  label: 'Antigravity (AGENTS.md + .antigravity/commands surface)',
  contractFile: 'AGENTS.md',
  files(): AdapterFile[] {
    return COMMAND_DEFINITIONS.map((def) => ({
      dest: `.antigravity/commands/${def.name}.md`,
      content: renderAntigravityCommand(def),
    }));
  },
};
