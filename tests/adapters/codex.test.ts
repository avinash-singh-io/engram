import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { codexAdapter } from '../../src/adapters';
import { assetsRoot } from '../../src/assets';
import { validateConcept } from '../../src/format';

const GOLDEN = join(import.meta.dirname, '..', 'fixtures', 'adapters', 'codex');

function golden(dest: string): string {
  return readFileSync(join(GOLDEN, dest.replace(/^\./, '').replace(/\//g, '__')), 'utf8');
}

describe('codex adapter (locked v1 golden)', () => {
  const files = codexAdapter.files(assetsRoot());

  it('emits a Codex prompt for every shared command under .codex/prompts/', () => {
    expect(files.map((f) => f.dest).sort()).toEqual([
      '.codex/prompts/capture.md',
      '.codex/prompts/link.md',
      '.codex/prompts/promote.md',
      '.codex/prompts/refine.md',
      '.codex/prompts/reindex.md',
    ]);
  });

  it('renders content inline (no bundled src) matching the locked golden fixtures', () => {
    for (const f of files) {
      expect(f.src, f.dest).toBeUndefined();
      expect(f.content, f.dest).toBe(golden(f.dest));
    }
  });

  it('emits no reserved or concept-shaped files (command docs are not concepts)', () => {
    for (const f of files) {
      // Command prompt files carry no OKF frontmatter — they are agent docs, not
      // vault concepts, and live under a dot-dir excluded from enumeration.
      expect(f.dest.startsWith('.codex/')).toBe(true);
      expect(validateConcept(f.content ?? '', f.dest).ok).toBe(false);
    }
  });
});
