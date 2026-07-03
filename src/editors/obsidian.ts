import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, writeFileManaged } from '../vault/write';
import type { EditorAdapter, EditorSetupResult } from './types';

/** Obsidian settings that make it OKF-conformant (standard, absolute links). */
const DESIRED: Record<string, unknown> = {
  useMarkdownLinks: true,
  newLinkFormat: 'absolute',
};

/**
 * Obsidian editor adapter — detected by a `.obsidian/` directory. Setup merges
 * `.obsidian/app.json` so Obsidian writes standard, absolute links instead of
 * `[[wikilinks]]` (ADR-0003). Non-destructive: preserves every other setting.
 */
export const obsidianEditor: EditorAdapter = {
  id: 'obsidian',
  label: 'Obsidian',

  detect(vaultRoot: string): boolean {
    return existsSync(join(vaultRoot, '.obsidian'));
  },

  setup(vaultRoot: string): EditorSetupResult {
    const appPath = join(vaultRoot, '.obsidian', 'app.json');
    let config: Record<string, unknown> = {};
    if (existsSync(appPath)) {
      try {
        const parsed: unknown = JSON.parse(readFileSync(appPath, 'utf8'));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          config = parsed as Record<string, unknown>;
        }
      } catch {
        config = {};
      }
    }

    const changes: string[] = [];
    for (const [key, value] of Object.entries(DESIRED)) {
      if (config[key] !== value) {
        config[key] = value;
        changes.push(`${key} = ${JSON.stringify(value)}`);
      }
    }

    if (changes.length > 0) {
      ensureDir(join(vaultRoot, '.obsidian'));
      writeFileManaged(appPath, `${JSON.stringify(config, null, 2)}\n`);
    }
    return { editor: 'obsidian', changes };
  },
};
