import { join } from 'node:path';
import type { Adapter, AdapterFile } from './types';

/** Claude Code adapter — slash-commands + a PostToolUse write-hook. */
export const claudeAdapter: Adapter = {
  id: 'claude',
  files(assetsRoot: string): AdapterFile[] {
    const command = (name: string): AdapterFile => ({
      dest: `.claude/commands/${name}.md`,
      src: join(assetsRoot, 'claude', 'commands', `${name}.md`),
    });
    return [
      command('capture'),
      command('refine'),
      command('link'),
      command('reindex'),
      {
        dest: '.claude/settings.json',
        src: join(assetsRoot, 'claude', 'settings.json'),
        mode: 'merge-json',
      },
    ];
  },
};
