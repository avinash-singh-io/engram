/**
 * `init` — scaffold a vault.
 *
 * ADR-0023 is explicit that engram has **no opinion about the shape**: this writes
 * a starting tree the user is free to ignore or rebuild. `--structure` accepts
 * `default` only. Named presets (PARA, Zettelkasten, Johnny.Decimal) were declined
 * — ADR-0019 makes any structure a choice of which `part-of` edges you author, so a
 * preset adds no capability, only an opinion engram claims not to hold. The flag is
 * kept so adding one later is additive rather than a CLI break.
 */

import { DERIVED_GITIGNORE, ROOT_MARKER } from '../core/paths.js';
import type { Clock, FileStore } from '../core/ports.js';
import { reindex } from './reindex.js';

export const STRUCTURES = ['default'] as const;
export type Structure = (typeof STRUCTURES)[number];

/**
 * ADR-0023's reference tree. Illustrative, not prescribed.
 *
 * `AGENTS.md` is deliberately absent: `reindex` generates it from the live
 * registries, so a hand-written copy here would be the drift the generation exists
 * to prevent.
 */
const SCAFFOLD: Record<string, string> = {
  '/inbox/.gitkeep': '',
  '/concepts/.gitkeep': '',
  '/decisions/.gitkeep': '',
  '/sources/.gitkeep': '',
  '/projects/.gitkeep': '',
  [`/${ROOT_MARKER}/config.json`]: `${JSON.stringify({ structure: 'default' }, null, 2)}\n`,
};

export interface InitResult {
  created: string[];
  skipped: string[];
  reindexed: string[];
}

/**
 * Non-destructive by construction: an existing file is skipped, never overwritten.
 * Running `init` twice is safe, and running it in a populated directory adds only
 * what is missing.
 */
export async function init(
  files: FileStore,
  clock: Clock,
  structure: string = 'default',
): Promise<InitResult> {
  if (!(STRUCTURES as readonly string[]).includes(structure)) {
    throw new Error(
      `unknown structure "${structure}" — engram ships only: ${STRUCTURES.join(', ')}. ` +
        `ADR-0023: engram has no opinion about the shape; build your own tree.`,
    );
  }

  const created: string[] = [];
  const skipped: string[] = [];

  for (const [path, content] of Object.entries(SCAFFOLD)) {
    if (await files.exists(path)) {
      skipped.push(path);
      continue;
    }
    await files.write(path, content);
    created.push(path);
  }

  const gitignore = (await files.read('/.gitignore')) ?? '';
  if (!gitignore.includes('/views/')) {
    const merged =
      gitignore === ''
        ? DERIVED_GITIGNORE.join('\n')
        : `${gitignore.trimEnd()}\n\n${DERIVED_GITIGNORE.join('\n')}`;
    await files.write('/.gitignore', `${merged}\n`);
    created.push('/.gitignore');
  } else {
    skipped.push('/.gitignore');
  }

  const { written } = await reindex(files, clock);
  return { created: created.sort(), skipped: skipped.sort(), reindexed: written };
}
