import { copyFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

/**
 * Two targets from one repo (Phase 14).
 *
 * The Obsidian plugin lives here rather than in its own package or repository so
 * that a change to `src/` that breaks it fails **now**, in this typecheck and this
 * test run, instead of in another repo's next build. One version, one CI. It also
 * has nothing to depend on elsewhere: engram is not on npm (BUG-002).
 */
export default defineConfig([
  {
    name: 'lib',
    entry: ['src/index.ts', 'src/cli.ts'],
    format: ['esm'],
    target: 'node20',
    dts: true,
    // Scoped, not `true`: a blanket clean of `dist/` races the plugin target,
    // which writes into `dist/obsidian/`. Each target cleans only its own output.
    clean: ['dist/*.js', 'dist/*.d.ts', 'dist/*.map'],
    sourcemap: true,
    splitting: false,
  },
  {
    name: 'obsidian-plugin',
    entry: { main: 'plugin/main.ts' },
    outDir: 'dist/obsidian',
    // Obsidian loads plugins as CommonJS and provides `obsidian` itself, so it is
    // an external rather than a bundled dependency. Engram's own runtime
    // dependencies stay at zero — `obsidian` is types-only and dev-only.
    format: ['cjs'],
    // Obsidian loads exactly `main.js`. tsup would emit `main.cjs` for a CJS
    // build, and a plugin folder without `main.js` simply does not load.
    outExtension: () => ({ js: '.js' }),
    clean: ['dist/obsidian'],
    external: ['obsidian'],
    target: 'es2020',
    platform: 'browser',
    dts: false,
    sourcemap: false,
    splitting: false,
    // A plugin folder is main.js + manifest.json + styles.css. Obsidian will not
    // load one without the manifest, so the build emits all three or none.
    async onSuccess() {
      copyFileSync('plugin/manifest.json', 'dist/obsidian/manifest.json');
      copyFileSync('plugin/styles.css', 'dist/obsidian/styles.css');
      // This repo is `"type": "module"`, which makes a CommonJS `main.js`
      // ambiguous under Node's own rules — it inherits ESM from the root package
      // and fails to load. Obsidian's loader does not care either way, but an
      // artifact that only works because one particular loader is lenient is not
      // one anybody can verify. Six bytes buys `require()` working everywhere.
      writeFileSync('dist/obsidian/package.json', `${JSON.stringify({ type: 'commonjs' })}\n`);
    },
  },
]);
