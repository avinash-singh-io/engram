import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateConcept } from '../../src/format';
import { reindex } from '../../src/indexer';
import { runInit } from '../../src/commands/init';
import { CliError } from '../../src/commands/util';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'engram-e2e-adapters-'));
}

const CLAUDE = ['capture', 'refine', 'link', 'reindex', 'promote'].map(
  (n) => `.claude/commands/${n}.md`,
);
const CODEX = ['capture', 'refine', 'link', 'reindex', 'promote'].map(
  (n) => `.codex/prompts/${n}.md`,
);
const ANTIGRAVITY = ['capture', 'refine', 'link', 'reindex', 'promote'].map(
  (n) => `.antigravity/commands/${n}.md`,
);

describe('e2e: engram init --agent', () => {
  it('--agent all scaffolds Claude, Codex, and Antigravity command surfaces', () => {
    const dir = tmp();
    runInit({ dir, agent: 'all' });
    for (const f of [...CLAUDE, ...CODEX, ...ANTIGRAVITY, '.claude/settings.json']) {
      expect(existsSync(join(dir, f)), f).toBe(true);
    }
    // The shared root AGENTS.md is emitted once and is a reserved passthrough.
    const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    expect(validateConcept(agents, 'AGENTS.md').ok).toBe(true);
    expect(agents).toContain('Traversal contract');
  });

  it('--agent codex scaffolds only the Codex surface', () => {
    const dir = tmp();
    runInit({ dir, agent: 'codex' });
    for (const f of CODEX) expect(existsSync(join(dir, f)), f).toBe(true);
    expect(existsSync(join(dir, '.claude'))).toBe(false);
    expect(existsSync(join(dir, '.antigravity'))).toBe(false);
  });

  it('--agent antigravity scaffolds only the Antigravity surface', () => {
    const dir = tmp();
    runInit({ dir, agent: 'antigravity' });
    for (const f of ANTIGRAVITY) expect(existsSync(join(dir, f)), f).toBe(true);
    expect(existsSync(join(dir, '.codex'))).toBe(false);
  });

  it('emitted command surfaces live in dot-dirs and are not enumerated as concepts', () => {
    const dir = tmp();
    runInit({ dir, agent: 'all' });
    // A fresh reindex must find no drift — command files are excluded from the
    // concept walker (dot-dirs), so they never pollute the index.
    expect(reindex(dir, { check: true }).changed).toEqual([]);
  });

  it('rejects an unknown agent selector', () => {
    expect(() => runInit({ dir: tmp(), agent: 'nope' })).toThrow(CliError);
  });
});
