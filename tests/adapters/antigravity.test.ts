import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { antigravityAdapter } from '../../src/adapters';
import { assetsRoot } from '../../src/assets';

const GOLDEN = join(import.meta.dirname, '..', 'fixtures', 'adapters', 'antigravity');

function golden(dest: string): string {
  return readFileSync(join(GOLDEN, dest.replace(/^\./, '').replace(/\//g, '__')), 'utf8');
}

describe('antigravity adapter (locked v1 golden)', () => {
  const files = antigravityAdapter.files(assetsRoot());

  it('emits an Antigravity command for every shared command under .antigravity/commands/', () => {
    expect(files.map((f) => f.dest).sort()).toEqual([
      '.antigravity/commands/capture.md',
      '.antigravity/commands/link.md',
      '.antigravity/commands/promote.md',
      '.antigravity/commands/refine.md',
      '.antigravity/commands/reindex.md',
    ]);
  });

  it('renders content inline (no bundled src) matching the locked golden fixtures', () => {
    for (const f of files) {
      expect(f.src, f.dest).toBeUndefined();
      expect(f.content, f.dest).toBe(golden(f.dest));
    }
  });
});
