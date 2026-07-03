import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderAgentsContract, writeAgentsContract } from '../../src/retrieval/agents-contract';

describe('agents-contract', () => {
  it('renders the traversal contract with the read-budget and recall sections', () => {
    const c = renderAgentsContract();
    expect(c).toContain('Start at `/index.md`');
    expect(c).toContain('NEVER read the whole vault');
    expect(c).toContain('Read budget');
    expect(c).toContain('engram recall');
    // OKF reserved passthrough: no frontmatter block.
    expect(c.startsWith('---\n')).toBe(false);
  });

  it('writes the contract, then is idempotent (second write is a no-op)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'engram-agents-'));
    const first = writeAgentsContract(dir);
    expect(first.changed).toBe(true);
    expect(existsSync(first.path)).toBe(true);

    const second = writeAgentsContract(dir);
    expect(second.changed).toBe(false);
    expect(readFileSync(second.path, 'utf8')).toBe(renderAgentsContract());
  });
});
