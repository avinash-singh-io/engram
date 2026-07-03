import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkIndexQuality } from '../../src/retrieval/index-quality';
import { FIXTURE_VAULT } from './fixture';

describe('index-quality', () => {
  it('passes on the navigation-grade fixture vault', () => {
    const r = checkIndexQuality(FIXTURE_VAULT);
    expect(r.ok).toBe(true);
    expect(r.issues).toHaveLength(0);
    expect(r.stats.concepts).toBe(126);
    expect(r.stats.indexedConcepts).toBe(126);
    expect(r.stats.indexes).toBe(20);
  });

  it('flags a degraded vault: missing child link, missing description, flat layout', () => {
    const dir = mkdtempSync(join(tmpdir(), 'engram-degraded-'));
    // Root index lists a concept with NO description and does NOT link the child.
    writeFileSync(join(dir, 'AGENTS.md'), '# agents\n');
    writeFileSync(join(dir, 'index.md'), '# Vault Index\n\n## Concepts\n\n* [A](/a.md) - \n');
    writeFileSync(
      join(dir, 'a.md'),
      '---\ntype: Concept\ntitle: A\ndescription: A.\ntags: [x]\ntimestamp: 2026-07-03T00:00:00Z\n---\n\n# A\n',
    );
    mkdirSync(join(dir, 'sub'), { recursive: true });
    writeFileSync(
      join(dir, 'sub', 'index.md'),
      '# sub\n\n## Concepts\n\n* [B](/sub/b.md) - B desc\n',
    );
    writeFileSync(
      join(dir, 'sub', 'b.md'),
      '---\ntype: Concept\ntitle: B\ndescription: B.\ntags: [y]\ntimestamp: 2026-07-03T00:00:00Z\n---\n\n# B\n',
    );

    const r = checkIndexQuality(dir);
    const codes = r.issues.map((i) => i.code);
    expect(r.ok).toBe(false);
    expect(codes).toContain('missing-child-link');
    expect(codes).toContain('description-missing');
    expect(codes).toContain('flat-layout');
  });

  it('reports a missing directory index as an error', () => {
    const dir = mkdtempSync(join(tmpdir(), 'engram-noindex-'));
    writeFileSync(join(dir, 'AGENTS.md'), '# agents\n');
    writeFileSync(
      join(dir, 'index.md'),
      '# Vault Index\n\n## Sections\n\n* [sub/](/sub/index.md) - 1 concept\n',
    );
    mkdirSync(join(dir, 'sub'), { recursive: true });
    writeFileSync(
      join(dir, 'sub', 'b.md'),
      '---\ntype: Concept\ntitle: B\ndescription: B.\ntags: [y]\ntimestamp: 2026-07-03T00:00:00Z\n---\n\n# B\n',
    );
    const r = checkIndexQuality(dir);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain('index-missing');
  });
});
