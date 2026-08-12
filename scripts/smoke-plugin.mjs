/**
 * Load the BUILT Obsidian plugin, against a stub of Obsidian.
 *
 * This does not prove the UI works — only a human in a real vault can say that,
 * and Phase 14 records that check as manual. What it does prove is everything
 * between "the tests pass" and "the human clicks", which is where this project's
 * bugs have actually lived: that `main.js` exists under the name Obsidian looks
 * for, that it parses as CommonJS, that `obsidian` really was left external, that
 * no node builtin sneaked into a bundle destined for a phone, and that `onload()`
 * runs and registers what it claims to.
 *
 * Run after `npm run build`.
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = join(root, 'dist', 'obsidian', 'main.js');

const fail = (message) => {
  console.error(`✖ ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`✓ ${message}`);

const source = readFileSync(bundle, 'utf8');

// 1. Obsidian provides its own API; bundling a copy would ship a second one.
if (!source.includes('require("obsidian")')) fail('`obsidian` was inlined instead of left external');
else pass('`obsidian` is required, not bundled');

// 2. Obsidian mobile has no node builtins. One leaked import breaks the plugin on
//    a device no test in this repo runs on.
const builtins = [...source.matchAll(/require\("(node:[a-z/]+)"\)/g)].map((m) => m[1]);
if (builtins.length > 0) fail(`node builtins in a mobile bundle: ${[...new Set(builtins)].join(', ')}`);
else pass('no node builtins in the bundle — mobile safe');

// 3. Obsidian loads plugins with `require`. If this throws, nothing else matters.
const stub = {
  Plugin: class {
    constructor(app) {
      this.app = app;
    }
  },
  ItemView: class {
    constructor(leaf) {
      this.leaf = leaf;
    }
  },
  Notice: class {},
};

const require_ = createRequire(import.meta.url);
const Module = require_('node:module');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'obsidian') return 'obsidian';
  return originalResolve.call(this, request, ...rest);
};
require_.cache.obsidian = { id: 'obsidian', filename: 'obsidian', loaded: true, exports: stub };

let PluginClass;
try {
  PluginClass = require_(bundle).default;
  pass('the bundle loads as CommonJS');
} catch (e) {
  fail(`the bundle does not load: ${e.message}`);
  process.exit(1);
}

if (typeof PluginClass !== 'function') fail('no default-exported plugin class');
else pass('exports a plugin class as default');

// 4. `onload` is what Obsidian calls. A crash here is a plugin that installs and
//    then does nothing, which looks like a broken install rather than a bug.
const commands = [];
const views = [];
const ribbons = [];

const instance = new PluginClass({ vault: { adapter: {} }, workspace: {} });
instance.registerView = (type) => views.push(type);
instance.addCommand = (c) => commands.push(c.id);
instance.addRibbonIcon = (icon, title) => ribbons.push(title);

try {
  await instance.onload();
  pass('onload() runs without throwing');
} catch (e) {
  fail(`onload() threw: ${e.message}`);
}

const expected = ['engram-capture', 'engram-format', 'engram-queue'];
for (const id of expected) {
  if (commands.includes(id)) pass(`command registered: ${id}`);
  else fail(`command missing: ${id}`);
}
if (views.includes('engram-queue')) pass('the approval queue view is registered');
else fail('the approval queue view is not registered');
if (ribbons.length > 0) pass(`ribbon icon registered: ${ribbons[0]}`);
else fail('no ribbon icon registered');

console.log(
  process.exitCode === 1
    ? '\nplugin smoke FAILED'
    : '\nplugin smoke passed — loading and wiring verified.\nStill manual: that it renders and behaves correctly in a real Obsidian vault.',
);
