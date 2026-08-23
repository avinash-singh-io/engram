/**
 * The engram version, stamped into the bundle at build time.
 *
 * Imported from `package.json` rather than duplicated, so it cannot drift from
 * what npm publishes. `resolveJsonModule` inlines it, so the built `dist/` carries
 * a literal and reads nothing at runtime — this stays usable from the Obsidian
 * plugin, where there is no filesystem to read a manifest from.
 *
 * Lives at the `src/` root rather than in `core/`: a build-stamped constant is not
 * part of the invariant model, and `core/` may import only `core/`.
 */
import pkg from '../package.json';

export const VERSION: string = pkg.version;

/** `0.12.1` → `0.12`. In 0.x, the minor is where a breaking change lands. */
export function series(version: string): string {
  const [major = '0', minor = '0'] = version.split('.');
  return `${major}.${minor}`;
}

/**
 * Is `written` from an older series than `current`?
 *
 * Patch differences are ignored deliberately — warning on every patch would be
 * noise, and a patch by definition does not change what a vault's files mean.
 */
export function isOlderSeries(written: string, current: string): boolean {
  const [wMaj = 0, wMin = 0] = written.split('.').map(Number);
  const [cMaj = 0, cMin = 0] = current.split('.').map(Number);
  if (Number.isNaN(wMaj) || Number.isNaN(wMin)) return false;
  return wMaj < cMaj || (wMaj === cMaj && wMin < cMin);
}
