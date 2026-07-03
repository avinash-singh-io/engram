import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateConcept } from '../src/format';
import { reindex } from '../src/indexer';
import { runWriteHook } from '../src/hooks';
import { runCapture } from '../src/commands/capture';
import { runInit } from '../src/commands/init';
import { runLink } from '../src/commands/link';
import { runRefine } from '../src/commands/refine';
import { CliError } from '../src/commands/util';

function newVault(): string {
  const dir = mkdtempSync(join(tmpdir(), 'engram-e2e-'));
  runInit({ dir });
  return dir;
}

describe('e2e vault flow', () => {
  it('init → capture → refine → reindex×2: valid, indexed, logged, idempotent', () => {
    const root = newVault();

    const inbox = runCapture('temporal replay makes workflows durable', root);
    expect(existsSync(inbox)).toBe(true);

    const dest = runRefine(inbox, {
      to: 'system-design/temporal.md',
      title: 'Temporal Internals',
      description: 'How replay makes workflows durable.',
      type: 'Reference',
      tags: 'temporal,distributed-systems',
      cwd: root,
    });

    // OKF-valid
    expect(validateConcept(readFileSync(dest, 'utf8'), 'system-design/temporal.md').ok).toBe(true);
    // indexed in its directory and reachable from root
    expect(readFileSync(join(root, 'system-design', 'index.md'), 'utf8')).toContain(
      '* [Temporal Internals](/system-design/temporal.md)',
    );
    expect(readFileSync(join(root, 'index.md'), 'utf8')).toContain(
      '* [system-design/](/system-design/index.md)',
    );
    // logged
    expect(readFileSync(join(root, 'log.md'), 'utf8')).toContain('**Added** [Temporal Internals]');
    // inbox item archived (moved out of inbox)
    expect(existsSync(inbox)).toBe(false);
    // idempotent
    expect(reindex(root, { check: true }).changed).toEqual([]);
  });

  it('refine refuses a non-conformant concept (validate gate)', () => {
    const root = newVault();
    const inbox = runCapture('note', root);
    expect(() =>
      runRefine(inbox, { to: 'x.md', title: 'T', description: '', tags: 'a', cwd: root }),
    ).toThrow(CliError);
  });

  it('write-hook accepts a refined concept', () => {
    const root = newVault();
    const dest = runRefine(runCapture('idempotency keys', root), {
      to: 'system-design/idempotency.md',
      title: 'Idempotency',
      description: 'Effectively-once via idempotent operations.',
      tags: 'reliability',
      cwd: root,
    });
    expect(runWriteHook(dest).ok).toBe(true);
  });

  it('link inserts an absolute See-also link that re-validates', () => {
    const root = newVault();
    const a = runRefine(runCapture('alpha', root), {
      to: 'a.md',
      title: 'Alpha',
      description: 'Alpha concept.',
      tags: 'shared',
      cwd: root,
    });
    runRefine(runCapture('beta', root), {
      to: 'b.md',
      title: 'Beta',
      description: 'Beta concept.',
      tags: 'shared',
      cwd: root,
    });
    runLink('a', { to: 'b', cwd: root });
    const text = readFileSync(a, 'utf8');
    expect(text).toContain('- [Beta](/b.md)');
    expect(validateConcept(text, 'a.md').ok).toBe(true);
  });
});
