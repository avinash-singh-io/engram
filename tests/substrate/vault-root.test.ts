/**
 * Finding the vault you are standing in (ADR-0046).
 *
 * `engram capture` from a subdirectory used to create a second vault inside the
 * first, file the note there, and report a path relative to a root the user did not
 * believe they were in — success, about the wrong place.
 *
 * These use a real filesystem because that is what the function looks at. A
 * `FileStore` is rooted at the vault by construction and cannot see above itself,
 * which is the property that makes the port safe and the reason this cannot use one.
 */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findVaultRoot, noVaultMessage, resolveVaultRoot } from '../../src/substrate/vault-root.js';

let base: string;

const make = (...parts: string[]) => {
  const p = join(base, ...parts);
  mkdirSync(p, { recursive: true });
  return p;
};

beforeEach(() => {
  // realpath via mkdtemp under tmpdir: macOS maps /tmp to /private/tmp, and comparing
  // an unresolved path against a resolved one fails for reasons unrelated to the test.
  base = mkdtempSync(join(tmpdir(), 'engram-root-'));
});
afterEach(() => rmSync(base, { recursive: true, force: true }));

describe('findVaultRoot', () => {
  it('finds the root from the root itself', () => {
    const vault = make('vault');
    make('vault', '.engram');
    expect(findVaultRoot(vault)).toBe(vault);
  });

  it('finds it from any depth below', () => {
    const vault = make('vault');
    make('vault', '.engram');
    const deep = make('vault', 'concepts', 'sub', 'deeper');
    expect(findVaultRoot(deep)).toBe(vault);
  });

  it('resolves a vault that is itself a git repository to itself', () => {
    // The common case. `.engram` is checked before `.git`, or a vault under version
    // control would stop at its own boundary and report no vault at all.
    const vault = make('vault');
    make('vault', '.engram');
    make('vault', '.git');
    expect(findVaultRoot(make('vault', 'notes'))).toBe(vault);
  });

  it('prefers the nearest root when vaults are nested', () => {
    // ADR-0030's "one root is the whole world", evaluated from where you stand —
    // and it matches what the walker already does when it refuses to descend into
    // a nested root.
    make('outer', '.engram');
    const inner = make('outer', 'inner');
    make('outer', 'inner', '.engram');
    expect(findVaultRoot(make('outer', 'inner', 'deep'))).toBe(inner);
  });

  it('stops at a repository that is not a vault', () => {
    // Escaping a repo to find a vault above it would be exactly the boundary
    // violation ADR-0030 exists to prevent.
    make('vault', '.engram');
    make('vault', 'unrelated', '.git');
    expect(findVaultRoot(make('vault', 'unrelated', 'src'))).toBeNull();
  });

  it('returns null rather than guessing when there is no vault', () => {
    expect(findVaultRoot(make('nothing', 'here'))).toBeNull();
  });
});

describe('resolveVaultRoot', () => {
  it('uses an explicit --vault verbatim, with no discovery', () => {
    // A user who names a directory means that directory, even one with no vault in
    // it — explicit beats implicit.
    const named = make('named');
    const r = resolveVaultRoot(make('elsewhere'), named, false);
    expect(r).toEqual({ root: named, how: 'flag', missing: false });
  });

  it('reports how the root was decided, so discovery is not invisible', () => {
    const vault = make('vault');
    make('vault', '.engram');
    const r = resolveVaultRoot(make('vault', 'sub'), undefined, false);
    expect(r.how).toBe('found');
    expect(r.root).toBe(vault);
  });

  it('refuses to invent a vault for a command that needs one', () => {
    const r = resolveVaultRoot(make('empty'), undefined, false);
    expect(r.missing).toBe(true);
  });

  it('lets init proceed where there is no vault, because that is the point', () => {
    const empty = make('empty');
    const r = resolveVaultRoot(empty, undefined, true);
    expect(r).toEqual({ root: empty, how: 'cwd', missing: false });
  });
});

describe('noVaultMessage', () => {
  it('names the fix rather than only the failure', () => {
    const msg = noVaultMessage('/somewhere');
    expect(msg).toContain('/somewhere');
    expect(msg).toContain('engram init');
    expect(msg).toContain('--vault');
  });
});
