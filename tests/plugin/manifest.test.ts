import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as Record<string, unknown>;

const manifest = () => read('../../plugin/manifest.json');
const pkg = () => read('../../package.json');

/**
 * Obsidian reads `manifest.json` and nothing else to decide what it has installed.
 * Everything asserted here is a way the plugin fails to load, or loads and lies.
 */
describe('the plugin manifest', () => {
  it('declares the same version as the package', () => {
    // Two version numbers for one repo is a drift waiting to happen, and the
    // symptom — Obsidian reporting an old version — looks like a stale install.
    expect(manifest().version).toBe(pkg().version);
  });

  it('carries every field Obsidian requires to load a plugin', () => {
    for (const field of ['id', 'name', 'version', 'minAppVersion', 'description', 'author']) {
      expect(manifest()[field]).toBeTruthy();
    }
  });

  /**
   * The whole point of `obsidianFileStore`. `nodeFileStore` cannot run on mobile,
   * so if this were ever flipped to `true` the port swap would have bought nothing.
   */
  it('is not desktop-only, which is what the FileStore port buys', () => {
    expect(manifest().isDesktopOnly).toBe(false);
  });

  it('keeps engram at zero runtime dependencies', () => {
    expect(pkg().dependencies ?? {}).toEqual({});
    // `obsidian` is types-only and provided by the host at runtime.
    expect((pkg().devDependencies as Record<string, string>).obsidian).toBeTruthy();
  });
});
