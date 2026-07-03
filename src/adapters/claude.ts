import { join } from 'node:path';
import { COMMAND_DEFINITIONS, renderClaudeCommand } from './commands';
import type { Adapter, AdapterFile } from './types';

/**
 * Claude Code adapter — slash-commands (rendered from the shared command set)
 * and a PostToolUse write-hook. Claude Code reads its instructions from
 * `CLAUDE.md` (its `contractFile`); `engram init` renders the full traversal
 * contract there, identical to `AGENTS.md` (ADR-0017) — not a pointer.
 */
export const claudeAdapter: Adapter = {
  id: 'claude',
  label: 'Claude Code (CLAUDE.md + slash-commands + PostToolUse write-hook)',
  contractFile: 'CLAUDE.md',
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
