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

import { DERIVED_GITIGNORE, isDerived, RESERVED_FILES, ROOT_MARKER } from '../core/paths.js';
import type { Clock, FileStore } from '../core/ports.js';
import { GUARDRAILS_PATH, scaffoldGuardrails } from '../policy/config.js';
import { AGENTS, writePointers } from '../surface/adapters.js';
import { reindex } from './reindex.js';

export const STRUCTURES = ['default'] as const;
export type Structure = (typeof STRUCTURES)[number];

/**
 * The reference tree. **Only ever written into an empty vault** (BUG-005).
 *
 * ADR-0023 says engram has no opinion about the shape, and writing these into a
 * vault that already has folders is an opinion. It is also actively messy: on a
 * case-insensitive filesystem `projects/` resolves into an existing `Projects/`,
 * dropping a `.gitkeep` beside someone's real notes, and on a case-sensitive one it
 * produces two siblings differing only in case.
 */
const TREE: Record<string, string> = {
  '/inbox/.gitkeep': '',
  '/concepts/.gitkeep': '',
  '/decisions/.gitkeep': '',
  '/sources/.gitkeep': '',
  '/projects/.gitkeep': '',
};

/** What every vault needs, whatever shape it already has. */
const ESSENTIAL: Record<string, string> = {
  [`/${ROOT_MARKER}/config.json`]: `${JSON.stringify({ structure: 'default' }, null, 2)}\n`,
  // What an agent may do to this vault. Scaffolded so the mechanism is
  // discoverable; `proposeOnly` ships empty so a fresh vault defers nothing.
  [GUARDRAILS_PATH]: `${scaffoldGuardrails()}\n`,
};

/**
 * Does this vault already hold notes someone wrote?
 *
 * Reserved and derived paths do not count — a vault that has only `index.md` and
 * `views/` from a previous `reindex` is still empty of authored content.
 */
async function hasAuthoredNotes(files: FileStore): Promise<boolean> {
  for (const path of await files.list()) {
    if (!path.endsWith('.md')) continue;
    if (path.startsWith(`/${ROOT_MARKER}/`) || isDerived(path)) continue;
    if (RESERVED_FILES.includes(path.replace(/^\//, ''))) continue;
    if (AGENTS.some((a) => a.instructionsPath === path)) continue;
    return true;
  }
  return false;
}

export interface InitResult {
  created: string[];
  skipped: string[];
  reindexed: string[];
  /**
   * Things the user needs to know that are neither a created file nor a skipped
   * one — an adopted vault keeping its own shape, or an agent left unrouted.
   */
  notes: string[];
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
  const notes: string[] = [];

  // An existing vault already has a shape, and ADR-0023 says engram does not get
  // an opinion about it. Only an empty vault gets the reference tree.
  const adopting = await hasAuthoredNotes(files);
  const scaffold = adopting ? ESSENTIAL : { ...TREE, ...ESSENTIAL };
  if (adopting) {
    notes.push(
      'this vault already has notes, so the reference tree was not created — engram ' +
        'has no opinion about your folders (ADR-0023). File notes wherever you already do.',
    );
  }

  for (const [path, content] of Object.entries(scaffold)) {
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

  // Native pointers for agents that look for a filename other than AGENTS.md.
  // Non-destructive like everything else here: an existing CLAUDE.md is left alone.
  const pointers = await writePointers(files);
  created.push(...pointers.written);
  skipped.push(...pointers.skipped);

  // BUG-006. Leaving the file alone is right — it may carry instructions engram
  // knows nothing about — but the pointer's only job is to route the agent, so a
  // skip means the agent is never routed. Saying "left alone" does not convey that,
  // and the most common adoption path is precisely a vault that already has a
  // CLAUDE.md. Name the line to add.
  for (const path of pointers.skipped) {
    const agent = AGENTS.find((a) => a.instructionsPath === path);
    if (agent === undefined) continue;
    const existing = (await files.read(path)) ?? '';
    if (existing.includes('AGENTS.md')) continue;
    notes.push(
      `${path} is yours and was left alone — so ${agent.name} will NOT find the ` +
        `contract. Add this line to it:\n    ${pointerLine(agent.instructionsPath)}`,
    );
  }

  const { written } = await reindex(files, clock);
  return { created: created.sort(), skipped: skipped.sort(), reindexed: written, notes };
}

/** The single line a hand-written instructions file needs. */
export function pointerLine(instructionsPath: string): string {
  const depth = instructionsPath.split('/').filter(Boolean).length - 1;
  return `This is an engram vault. The contract is [AGENTS.md](${'../'.repeat(depth)}AGENTS.md) — read it first.`;
}
