/**
 * `upgrade` — bring a vault written by an older engram up to the current shape.
 *
 * **Nothing here is required.** Every legacy location is still read: guardrails
 * and skills in `.engram/` still load, and notes in `inbox/` are still indexed.
 * A vault that never runs this keeps working. What upgrading buys is the
 * *benefit* of the newer layout — chiefly that the files you author become
 * visible in Obsidian.
 *
 * Two rules shape what it will and will not do.
 *
 * **It reports before it acts.** Same stance as the approval queue: engram shows
 * you the change and waits. `--apply` is a second, deliberate step.
 *
 * **It never moves your notes.** Renaming `inbox/` to `raw/` is your call, not
 * engram's — those are your files in a folder you chose, and ADR-0023 says engram
 * has no opinion about your folders. It reports the rename and hands you the
 * `git mv`, which also keeps the history that a copy would lose.
 */

import { ENGRAM_DIR, ROOT_MARKER } from '../core/paths.js';
import type { FileStore } from '../core/ports.js';
import {
  GUARDRAILS_PATH,
  LEGACY_GUARDRAILS_PATH,
  loadVaultConfig,
  vaultConfig,
} from '../policy/config.js';
import { LEGACY_SKILLS_DIR, SKILLS_DIR } from '../policy/skills.js';
import { isOlderSeries, VERSION } from '../version.js';

export interface Move {
  from: string;
  to: string;
  why: string;
}

export interface Manual {
  what: string;
  command: string;
  why: string;
}

export interface UpgradePlan {
  /** The version that created this vault, or `null` when it predates the stamp. */
  createdWith: string | null;
  current: string;
  /** Engram's own files that can be relocated safely. */
  moves: Move[];
  /** Changes only you should make, with the command to make them. */
  manual: Manual[];
  /** True when the config lacks a provenance stamp and `--apply` would add one. */
  stampMissing: boolean;
}

const LEGACY_RAW = '/inbox';

/**
 * Work out what is out of date. Reads only — safe to run any time.
 */
export async function planUpgrade(files: FileStore): Promise<UpgradePlan> {
  const config = await loadVaultConfig(files);
  const all = await files.list();

  // No config at all means engram has never run here, so there is nothing to
  // bring up to date. Reporting "predates version stamping" for a directory that
  // was simply never initialised would be noise, and doctor's warnings are only
  // worth reading if every one of them is actionable.
  const initialised = await files.exists(`/${ROOT_MARKER}/config.json`);
  if (!initialised) {
    return {
      createdWith: null,
      current: VERSION,
      moves: [],
      manual: [],
      stampMissing: false,
    };
  }

  const moves: Move[] = [];
  const manual: Manual[] = [];

  // v0.12 — the authoring surface moved out of the hidden directory.
  if ((await files.exists(LEGACY_GUARDRAILS_PATH)) && !(await files.exists(GUARDRAILS_PATH))) {
    moves.push({
      from: LEGACY_GUARDRAILS_PATH,
      to: GUARDRAILS_PATH,
      why: 'you edit this file, and Obsidian will not show anything starting with a dot',
    });
  }

  for (const path of all) {
    if (!path.startsWith(`${LEGACY_SKILLS_DIR}/`) || !path.endsWith('.md')) continue;
    const to = path.replace(LEGACY_SKILLS_DIR, SKILLS_DIR);
    if (await files.exists(to)) continue;
    moves.push({ from: path, to, why: 'your skills should be visible and editable in Obsidian' });
  }

  // v0.11 — inbox/ became raw/. These are YOUR notes, so engram will not move them.
  const inInbox = all.filter((p) => p.startsWith(`${LEGACY_RAW}/`) && p.endsWith('.md'));
  if (inInbox.length > 0) {
    manual.push({
      what: `${inInbox.length} note(s) still in ${LEGACY_RAW}/`,
      command: `git mv ${LEGACY_RAW.slice(1)} raw`,
      why:
        'capture writes to raw/ now. Your notes in inbox/ still work and are still ' +
        'indexed — this is cosmetic. Engram will not move your notes for you, and ' +
        '`git mv` keeps the history a copy would lose',
    });
  }

  return {
    createdWith: config.createdWith ?? null,
    current: VERSION,
    moves,
    manual,
    stampMissing: config.createdWith === undefined,
  };
}

export interface UpgradeResult {
  moved: string[];
  /** Legacy files left behind — engram copies rather than deletes. */
  leftBehind: string[];
  stamped: boolean;
}

/**
 * Perform the safe half of a plan.
 *
 * **Copies; never deletes.** The `FileStore` port has four methods and removal is
 * deliberately not one of them — the same instinct as the `no-delete` guardrail,
 * and the reason the approval queue keeps resolved proposals rather than erasing
 * them. The legacy files are listed so you can remove them yourself once you have
 * seen that the new ones are right.
 */
export async function applyUpgrade(files: FileStore, plan: UpgradePlan): Promise<UpgradeResult> {
  const moved: string[] = [];
  const leftBehind: string[] = [];

  for (const move of plan.moves) {
    const content = await files.read(move.from);
    if (content === null) continue;
    await files.write(move.to, content);
    moved.push(move.to);
    leftBehind.push(move.from);
  }

  let stamped = false;
  if (plan.stampMissing) {
    // Stamped with the version doing the upgrade, since the original is unknowable.
    const config = await loadVaultConfig(files);
    await files.write(`/${ROOT_MARKER}/config.json`, vaultConfig(config.structure));
    stamped = true;
  }

  return { moved, leftBehind, stamped };
}

/** Is there anything to do? */
export const needsUpgrade = (plan: UpgradePlan): boolean =>
  plan.moves.length > 0 || plan.manual.length > 0 || plan.stampMissing;

/**
 * A one-line warning for `doctor` when the vault predates the running engram.
 *
 * Note files are safe across versions by construction — each carries its own
 * `okf_version` and is read by a matching codec. Config files are not, which is
 * the gap this reports.
 */
export function versionSkew(plan: UpgradePlan): string | null {
  // `stampMissing` rather than `createdWith === null`: a directory engram has
  // never touched has no stamp either, and telling someone their non-vault
  // predates version stamping is noise. Doctor's warnings are only worth reading
  // if every one of them is actionable.
  if (plan.stampMissing) {
    return (
      `[version] this vault predates version stamping, so engram cannot tell what wrote it. ` +
      `Run \`engram upgrade\` to record the current version (${plan.current}) and see what else is out of date.`
    );
  }
  if (plan.createdWith !== null && isOlderSeries(plan.createdWith, plan.current)) {
    return (
      `[version] created with engram ${plan.createdWith}; you are running ${plan.current}. ` +
      `Your notes are safe — each carries its own format version — but engram's own ` +
      `files may be laid out the old way. Run \`engram upgrade\` to see what changed.`
    );
  }
  return null;
}

export { ENGRAM_DIR };
