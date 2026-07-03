import { join } from 'node:path';
import { COMMAND_DEFINITIONS, renderClaudeCommand } from './commands';
import type { Adapter, AdapterFile } from './types';

/**
 * Claude Code adapter — slash-commands (rendered from the shared command set)
 * plus a PostToolUse write-hook. The root `AGENTS.md` traversal contract is
 * shared across all agents and emitted by `engram init`, not by this adapter.
 */
export const claudeAdapter: Adapter = {
  id: 'claude',
  label: 'Claude Code (slash-commands + PostToolUse write-hook)',
  files(assetsRoot: string): AdapterFile[] {
    const commands: AdapterFile[] = COMMAND_DEFINITIONS.map((def) => ({
      dest: `.claude/commands/${def.name}.md`,
      content: renderClaudeCommand(def),
    }));
    return [
      ...commands,
      {
        dest: '.claude/settings.json',
        src: join(assetsRoot, 'claude', 'settings.json'),
        mode: 'merge-json',
      },
    ];
  },
};
