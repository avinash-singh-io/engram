import { COMMAND_DEFINITIONS, renderCodexPrompt } from './commands';
import type { Adapter, AdapterFile } from './types';

/**
 * Codex adapter — Codex consumes the root `AGENTS.md` natively (shared traversal
 * contract, emitted by `engram init`) and exposes each engram command as a Codex
 * custom prompt under `.codex/prompts/<name>.md`, invokable as `/<name>`. The
 * command bodies are rendered from the same shared definitions as every other
 * agent, so Codex is a descriptor, not a fork (ADR-0011).
 */
export const codexAdapter: Adapter = {
  id: 'codex',
  label: 'Codex (AGENTS.md + .codex/prompts custom prompts)',
  contractFile: 'AGENTS.md',
  files(): AdapterFile[] {
    return COMMAND_DEFINITIONS.map((def) => ({
      dest: `.codex/prompts/${def.name}.md`,
      content: renderCodexPrompt(def),
    }));
  },
};
