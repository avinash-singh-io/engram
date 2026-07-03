import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { enumerateConceptFiles, readVault } from '../src/vault';

const here = dirname(fileURLToPath(import.meta.url));
const vault = join(here, 'fixtures', 'valid');

describe('vault read', () => {
  it('enumerates concept files, excluding reserved names', () => {
    const names = enumerateConceptFiles(vault).map((f) => f.split(/[\\/]/).pop());
    expect(names).toContain('concept-minimal.md');
    expect(names).toContain('concept-full.md');
    expect(names).not.toContain('index.md');
    expect(names).not.toContain('log.md');
  });

  it('reads concepts into a model with parsed frontmatter and ids', () => {
    const model = readVault(vault);
    const c = model.concepts.find((x) => x.path === 'concept-minimal.md');
    expect(c).toBeDefined();
    expect(c?.id).toBe('concept-minimal');
    expect(c?.frontmatter?.title).toBe('Idempotency Patterns');
    expect(c?.dir).toBe('');
  });
});
