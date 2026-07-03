import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CliError } from '../../src/commands/util';
import { countConcepts, resolveVaultRoot, rootIndexPath } from '../../src/retrieval/vault-root';
import { FIXTURE_VAULT } from './fixture';

describe('vault-root', () => {
  it('discovers the vault root by walking up from a nested subdirectory', () => {
    const start = join(FIXTURE_VAULT, 'distributed-systems', 'consensus');
    expect(resolveVaultRoot(start)).toBe(FIXTURE_VAULT);
  });

  it('honors an explicit --vault override', () => {
    expect(resolveVaultRoot(tmpdir(), FIXTURE_VAULT)).toBe(FIXTURE_VAULT);
  });

  it('throws CliError(2) for a --vault path without an index.md', () => {
    const empty = mkdtempSync(join(tmpdir(), 'engram-novault-'));
    try {
      resolveVaultRoot(tmpdir(), empty);
      expect.unreachable('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(CliError);
      expect((e as CliError).code).toBe(2);
    }
  });

  it('throws CliError(2) when cwd is not inside a vault', () => {
    const outside = mkdtempSync(join(tmpdir(), 'engram-outside-'));
    try {
      resolveVaultRoot(outside);
      expect.unreachable('should throw');
    } catch (e) {
      expect((e as CliError).code).toBe(2);
    }
  });

  it('counts concepts by enumeration only (the bounded-fraction denominator)', () => {
    expect(countConcepts(FIXTURE_VAULT)).toBe(126);
  });

  it('resolves the root index path', () => {
    expect(rootIndexPath(FIXTURE_VAULT)).toBe(join(FIXTURE_VAULT, 'index.md'));
  });
});
