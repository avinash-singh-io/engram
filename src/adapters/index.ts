import { claudeAdapter } from './claude';
import type { Adapter } from './types';

export type { Adapter, AdapterFile } from './types';
export { claudeAdapter };

/** All registered adapters by id. Phase 4 extends this with codex / antigravity. */
export const ADAPTERS: Record<string, Adapter> = {
  [claudeAdapter.id]: claudeAdapter,
};

export function getAdapter(id: string): Adapter | undefined {
  return ADAPTERS[id];
}

export function adapterIds(): string[] {
  return Object.keys(ADAPTERS);
}
