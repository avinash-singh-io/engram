/**
 * `init` — scaffold a vault around a **declared** structure.
 *
 * ADR-0023 says engram has no opinion about the shape, and that stands: it ships
 * several philosophies and prefers none, plus `custom` for people who want to
 * declare their own. What changed is that a vault must *say* which one it uses.
 *
 * "No opinion" had been read as "say nothing", and saying nothing cost more than
 * the design intended — with no stated convention, two agents filing into one
 * vault invent different containers for the same kind of note. The structure is
 * therefore a contract rendered into `AGENTS.md`, not a preference engram holds.
 */

import {
  DERIVED_GITIGNORE,
  isDerived,
  RESERVED_FILES,
  ROOT_MARKER,
  STRUCTURE_GUIDE,
} from '../core/paths.js';
import type { Clock, FileStore } from '../core/ports.js';
import { GUARDRAILS_PATH, scaffoldGuardrails } from '../policy/config.js';
import { getStructure, guideFor, RAW, structureIds } from '../policy/structures.js';
import { AGENTS } from '../surface/adapters.js';
import { reindex } from './reindex.js';

/**
 * `raw/` is created for every vault, whatever structure it declares.
 *
 * It is the one directory the design requires: `capture` must put bytes somewhere
 * before anything has been decided about them, and capture never rejects.
 */
const alwaysTree = (): Record<string, string> => ({ [`/${RAW.name}/.gitkeep`]: '' });

/**
 * The declared structure's own directories.
 *
 * Created because the user *chose* them. The earlier problem was imposing five
 * folders on everyone; choosing PARA and not getting PARA's four folders would be
 * the opposite mistake, since the whole value of PARA is seeing those buckets when
 * you `ls`. `custom` declares none and gets only `raw/`.
 */
const structureTree = (id: string): Record<string, string> => {
  const def = getStructure(id);
  const out: Record<string, string> = {};
  for (const c of def?.containers ?? []) out[`/${c.name}/.gitkeep`] = '';
  return out;
};

/** What every vault needs, whatever shape it already has. */
const ESSENTIAL: Record<string, string> = {
  // Written per-structure below; this map holds only what never varies.
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
    if (AGENTS.some((a) => a.contractFile === path)) continue;
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
  const def = getStructure(structure);
  if (def === undefined) {
    throw new Error(
      `unknown structure "${structure}" — engram ships: ${structureIds().join(', ')}. ` +
        `Pick one, or "custom" to declare your own shape.`,
    );
  }

  const created: string[] = [];
  const skipped: string[] = [];
  const notes: string[] = [];

  // An existing vault already has a shape, and ADR-0023 says engram does not get
  // an opinion about it. Only an empty vault gets the reference tree.
  const adopting = await hasAuthoredNotes(files);
  const scaffold = {
    ...(adopting ? {} : { ...alwaysTree(), ...structureTree(structure) }),
    ...ESSENTIAL,
    [`/${ROOT_MARKER}/config.json`]: `${JSON.stringify({ structure }, null, 2)}\n`,
    // The guide, so the structure is usable by a human as well as an agent.
    // Non-destructive like everything else: an existing one is left alone.
    [STRUCTURE_GUIDE]: guideFor(def),
  };
  if (adopting) {
    notes.push(
      'this vault already has notes, so no directories were created — engram has no ' +
        'opinion about your folders (ADR-0023). File notes wherever you already do, ' +
        `and see ${STRUCTURE_GUIDE} for the conventions agents will follow.`,
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

  // reindex writes AGENTS.md and splices the contract into every agent's own
  // file (ADR-0017), so init does not write them itself.
  const { written, contracts } = await reindex(files, clock);
  for (const path of contracts.merged) {
    notes.push(
      `${path} is yours — engram added its contract in a marked block at the end and ` +
        `left everything you wrote untouched. That block is regenerated on reindex.`,
    );
  }
  return { created: created.sort(), skipped: skipped.sort(), reindexed: written, notes };
}
