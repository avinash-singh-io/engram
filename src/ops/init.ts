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
import {
  GUARDRAILS_PATH,
  loadStructureId,
  loadVaultConfig,
  scaffoldGuardrails,
  vaultConfig,
} from '../policy/config.js';
import { exampleSkill, SKILLS_DIR } from '../policy/skills.js';
import { SKILL_FILE } from '../policy/skill-schema.js';
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
  // A worked example, so skills are discoverable rather than a feature you only
  // find by reading docs. Non-destructive like everything else.
  [`${SKILLS_DIR}/example-literature-review/${SKILL_FILE}`]: exampleSkill(),
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

export interface InitOptions {
  /**
   * Create the structure's directories even in a vault that already has notes.
   *
   * Off by default: a vault with its own shape should not acquire folders it did
   * not ask for. But choosing PARA *and* wanting its four buckets in an existing
   * vault is a perfectly reasonable thing to want, and before this there was no
   * way to say so.
   *
   * A flag rather than a prompt, deliberately. The same `init` runs over MCP,
   * where there is no human on stdin — an agent calling a prompting `init` would
   * hang forever. Non-interactive keeps one code path honest for both callers.
   */
  scaffold?: boolean;
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
  /**
   * The structure asked for, or `undefined` when the caller did not ask.
   *
   * The distinction matters: passing `'default'` because no flag was given used to
   * be indistinguishable from asking for it, so `init --structure para` on an
   * already-initialised vault silently did nothing — the config was skipped as an
   * existing file and the flag vanished without a word.
   */
  requested?: string,
  options: InitOptions = {},
): Promise<InitResult> {
  const declared = await loadStructureId(files);
  const structure = requested ?? declared;
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
  const changing = requested !== undefined && requested !== declared;
  const adopting = await hasAuthoredNotes(files);
  // An existing vault gets directories only when asked. `raw/` comes with them,
  // since a vault opting into a shape should have somewhere for capture to land.
  const makeDirs = !adopting || options.scaffold === true;
  const toWrite = {
    ...(makeDirs ? { ...alwaysTree(), ...structureTree(structure) } : {}),
    ...ESSENTIAL,
    // The guide, so the structure is usable by a human as well as an agent.
    // Non-destructive like everything else: an existing one is left alone.
    [STRUCTURE_GUIDE]: guideFor(def),
  };
  if (adopting && !makeDirs) {
    const dirs = def.containers.map((c) => `${c.name}/`).join(' ');
    notes.push(
      'this vault already has notes, so no directories were created — engram has no ' +
        'opinion about your folders (ADR-0023). File notes wherever you already do, ' +
        `and see ${STRUCTURE_GUIDE} for the conventions agents will follow.` +
        (dirs === '' ? '' : `\n      Want them anyway? Re-run with --scaffold to create: ${dirs}`),
    );
  } else if (adopting) {
    notes.push(
      `--scaffold: created this structure's directories in a vault that already has ` +
        'notes. Nothing was moved into them — your existing files are untouched, and ' +
        'the new folders are empty until you or an agent file something there.',
    );
  }

  for (const [path, content] of Object.entries(toWrite)) {
    if (await files.exists(path)) {
      skipped.push(path);
      continue;
    }
    await files.write(path, content);
    created.push(path);
  }

  // The declaration is engram's own file, so it is written rather than skipped —
  // otherwise asking for a different structure would be a silent no-op.
  const configPath = `/${ROOT_MARKER}/config.json`;
  // Preserves an existing `createdWith`, so changing structure never rewrites the
  // stamp that says which engram built this vault.
  const config = vaultConfig(structure, await loadVaultConfig(files));
  if (!(await files.exists(configPath))) {
    await files.write(configPath, config);
    created.push(configPath);
  } else if (changing) {
    await files.write(configPath, config);
    notes.push(`structure changed: ${declared} → ${structure}. ${changeConsequences(adopting)}`);

    // The guide is regenerated only when it is still engram's own words. Once you
    // have edited it, it is yours — a changed structure must not cost you that.
    const guide = await files.read(STRUCTURE_GUIDE);
    const previous = getStructure(declared);
    if (previous !== undefined && guide === guideFor(previous)) {
      await files.write(STRUCTURE_GUIDE, guideFor(def));
      notes.push(`${STRUCTURE_GUIDE} regenerated for ${def.label}.`);
    } else if (guide !== null) {
      notes.push(
        `${STRUCTURE_GUIDE} was left alone because you have edited it — it is yours. ` +
          `Delete it and re-run init to get the ${def.label} guide.`,
      );
    }
  } else if (requested !== undefined) {
    notes.push(`already using the ${def.label} structure; nothing to change.`);
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

/** What actually changes when a vault redeclares its structure. */
function changeConsequences(adopting: boolean): string {
  return adopting
    ? 'AGENTS.md now advertises the new containers, so agents will file there from ' +
        'now on. Nothing on disk moved and no directories were created — your ' +
        'existing notes stay exactly where they are.'
    : 'AGENTS.md now advertises the new containers, and the new directories were created.';
}
