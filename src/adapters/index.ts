import { antigravityAdapter } from './antigravity';
import { claudeAdapter } from './claude';
import { codexAdapter } from './codex';
import type { Adapter } from './types';

export type { Adapter, AdapterFile } from './types';
export {
  COMMAND_DEFINITIONS,
  getCommand,
  renderAntigravityCommand,
  renderClaudeCommand,
  renderCodexPrompt,
  type CommandDefinition,
} from './commands';
export { antigravityAdapter, claudeAdapter, codexAdapter };

/** All registered adapters by id. A new agent is one entry here + a descriptor module. */
export const ADAPTERS: Record<string, Adapter> = {
  [claudeAdapter.id]: claudeAdapter,
  [codexAdapter.id]: codexAdapter,
  [antigravityAdapter.id]: antigravityAdapter,
};

export function getAdapter(id: string): Adapter | undefined {
  return ADAPTERS[id];
}

export function adapterIds(): string[] {
  return Object.keys(ADAPTERS);
}
