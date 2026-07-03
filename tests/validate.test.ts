import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateConcept } from '../src/format';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, 'fixtures');

interface Expected {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const expected = JSON.parse(readFileSync(join(fixturesDir, 'expected.json'), 'utf8')) as Record<
  string,
  Expected
>;

const sorted = (xs: string[]): string[] => [...xs].sort();

describe('validateConcept — locked fixtures corpus v1', () => {
  for (const [rel, exp] of Object.entries(expected)) {
    it(`${rel} → ok=${exp.ok}`, () => {
      const text = readFileSync(join(fixturesDir, rel), 'utf8');
      const result = validateConcept(text, rel);

      expect(result.ok).toBe(exp.ok);
      expect(sorted(result.errors.map((e) => e.code))).toEqual(sorted(exp.errors));
      expect(sorted(result.warnings.map((w) => w.code))).toEqual(sorted(exp.warnings));
    });
  }

  it('ok is exactly the absence of errors', () => {
    for (const rel of Object.keys(expected)) {
      const text = readFileSync(join(fixturesDir, rel), 'utf8');
      const result = validateConcept(text, rel);
      expect(result.ok).toBe(result.errors.length === 0);
    }
  });
});
