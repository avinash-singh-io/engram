import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractMarkdownLinks, isInternalMarkdownLink, validateConcept } from '../../src/format';
import { reindex } from '../../src/indexer';
import { runInit } from '../../src/commands/init';
import { runPromote } from '../../src/commands/promote';

const ADR = join(
  import.meta.dirname,
  '..',
  'fixtures',
  'promote',
  'sources',
  'adr-shared-engine.md',
);

function newVault(): string {
  const dir = mkdtempSync(join(tmpdir(), 'engram-e2e-promote-'));
  runInit({ dir });
  return dir;
}

describe('e2e: promote a momentum ADR into a linked OKF concept (phase acceptance)', () => {
  it('validates ok, is indexed, is logged, and carries an absolute internal link', () => {
    const root = newVault();

    const res = runPromote(ADR, { cwd: root, to: 'references' });
    const abs = join(root, res.targetPath);
    const text = readFileSync(abs, 'utf8');

    // (a) validateConcept ok:true, zero errors.
    const validation = validateConcept(text, res.targetPath);
    expect(validation.ok).toBe(true);
    expect(validation.errors).toEqual([]);

    // (b) appears as a bullet in the target directory index.md.
    const refIndex = readFileSync(join(root, 'references', 'index.md'), 'utf8');
    expect(refIndex).toContain(`](/${res.targetPath})`);
    // reachable from the root index (descent).
    expect(readFileSync(join(root, 'index.md'), 'utf8')).toContain('(/references/index.md)');

    // (c) a newest-first log.md Promoted entry exists.
    const log = readFileSync(join(root, 'log.md'), 'utf8');
    expect(log).toMatch(/\*\*Promoted\*\* \[.+\]\(\/references\/adr-shared-engine\.md\)/);

    // 'linked' pinned: at least one absolute bundle-relative internal link.
    const absInternal = extractMarkdownLinks(text).filter(
      (l) => isInternalMarkdownLink(l.target) && l.target.startsWith('/'),
    );
    expect(absInternal.length).toBeGreaterThan(0);

    // provenance is present and one-way.
    expect(text).toContain('# Source');
    expect(text).toContain('momentum ADR-0007');

    // vault stays idempotent after the promote.
    expect(reindex(root, { check: true }).changed).toEqual([]);
  });

  it('is idempotent-safe: a second promote of the same source is refused without --force', () => {
    const root = newVault();
    runPromote(ADR, { cwd: root });
    expect(() => runPromote(ADR, { cwd: root })).toThrow();
    // --force re-promotes over the existing concept.
    const res = runPromote(ADR, { cwd: root, force: true });
    expect(existsSync(join(root, res.targetPath))).toBe(true);
  });
});
