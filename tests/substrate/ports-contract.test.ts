import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe } from 'vitest';
import { memoryFileStore, nodeFileStore } from '../../src/substrate/index.js';
import { obsidianFileStore, type VaultAdapter } from '../../src/substrate/obsidian.js';
import { fileStoreContract } from './contract.js';

/**
 * A stand-in for Obsidian's `DataAdapter`, faithful to the parts that matter:
 * vault-relative paths with no leading slash, `read` that **throws** on a missing
 * file, `list` that goes one directory deep, and `write` that will not create a
 * folder for you.
 *
 * Those four behaviours are precisely where a `FileStore` written against
 * `node:fs` habits would break on a phone, so the fake reproduces them rather than
 * being a convenient map.
 */
function fakeAdapter(): VaultAdapter {
  const files = new Map<string, string>();
  const folders = new Set<string>();

  return {
    async read(path) {
      const content = files.get(path);
      if (content === undefined) throw new Error(`ENOENT: ${path}`);
      return content;
    },
    async write(path, data) {
      const parent = path.slice(0, Math.max(0, path.lastIndexOf('/')));
      if (parent !== '' && !folders.has(parent)) {
        throw new Error(`no such folder: ${parent}`);
      }
      files.set(path, data);
    },
    async exists(path) {
      return files.has(path) || folders.has(path);
    },
    async list(path) {
      const dir = path === '/' || path === '' ? '' : path.replace(/^\/+|\/+$/g, '');
      const prefix = dir === '' ? '' : `${dir}/`;
      const inDir = (p: string) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/');
      return {
        files: [...files.keys()].filter(inDir),
        folders: [...folders].filter(inDir),
      };
    },
    async mkdir(path) {
      // Obsidian's mkdir is not recursive; build the chain like it would need to be.
      const parts = path.split('/').filter(Boolean);
      for (let i = 1; i <= parts.length; i++) folders.add(parts.slice(0, i).join('/'));
    },
  };
}

describe('FileStore contract — memoryFileStore', () => {
  fileStoreContract(() => memoryFileStore());
});

describe('FileStore contract — nodeFileStore', () => {
  fileStoreContract(() => nodeFileStore(mkdtempSync(join(tmpdir(), 'engram-contract-'))));
});

/**
 * The one that makes the claim testable: this is the store the Obsidian plugin
 * runs on, including on mobile where `node:fs` does not exist.
 */
describe('FileStore contract — obsidianFileStore', () => {
  fileStoreContract(() => obsidianFileStore(fakeAdapter()));
});
