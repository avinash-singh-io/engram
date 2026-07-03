import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Absolute path to the bundled `assets/` directory. Works both from source
 * (tests) and from the built `dist/` bin, because `import.meta.url` resolves to
 * this module's real location and `assets/` sits one level up from both
 * `src/` and `dist/`.
 */
export function assetsRoot(): string {
  return fileURLToPath(new URL('../assets', import.meta.url));
}

export function readAsset(...parts: string[]): string {
  return readFileSync(join(assetsRoot(), ...parts), 'utf8');
}
