import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { serializeConcept } from '../src/format';
import { defaultConfig, writeConfig } from '../src/vault';
import { generateIndex, reindex } from '../src/indexer';

function tmpVault(): string {
  const root = mkdtempSync(join(tmpdir(), 'engram-idx-'));
  writeConfig(root, defaultConfig());
  return root;
}

function addConcept(root: string, rel: string, fm: Record<string, unknown>): void {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, serializeConcept(fm, '# Body\n\nContent.'));
}

const fmOf = (title: string, description: string): Record<string, unknown> => ({
  type: 'Concept',
  title,
  description,
  tags: ['x'],
  timestamp: '2026-07-03T00:00:00Z',
});

describe('generateIndex', () => {
  it('sorts concepts, emits root okf_version + child sections', () => {
    const out = generateIndex({
      isRoot: true,
      okfVersion: '0.1',
      dirLabel: 'Vault Index',
      concepts: [
        { title: 'Beta', path: '/b.md', description: 'B.', id: 'b' },
        { title: 'Alpha', path: '/a.md', description: 'A.', id: 'a' },
      ],
      children: [{ name: 'system-design', link: '/system-design/index.md', count: 2 }],
    });
    expect(out).toContain('okf_version: 0.1');
    expect(out.indexOf('Alpha')).toBeLessThan(out.indexOf('Beta'));
    expect(out).toContain('* [Alpha](/a.md) - A.');
    expect(out).toContain('* [system-design/](/system-design/index.md) - 2 concepts');
    expect(out.endsWith('\n')).toBe(true);
  });
});

describe('reindex', () => {
  it('builds dir + root indexes and is idempotent', () => {
    const root = tmpVault();
    addConcept(root, 'system-design/idempotency.md', fmOf('Idempotency', 'X.'));

    const first = reindex(root);
    expect(first.changed.length).toBeGreaterThan(0);
    expect(existsSync(join(root, 'index.md'))).toBe(true);
    expect(existsSync(join(root, 'system-design', 'index.md'))).toBe(true);

    expect(readFileSync(join(root, 'system-design', 'index.md'), 'utf8')).toContain(
      '* [Idempotency](/system-design/idempotency.md) - X.',
    );
    expect(readFileSync(join(root, 'index.md'), 'utf8')).toContain(
      '* [system-design/](/system-design/index.md)',
    );

    // idempotent: second pass detects zero changes
    expect(reindex(root, { check: true }).changed).toEqual([]);
  });
});
