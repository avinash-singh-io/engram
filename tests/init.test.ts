import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deepMergeJson, runInit } from '../src/commands/init';

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'engram-init-'));
}

describe('deepMergeJson', () => {
  it('appends deduped array entries and preserves existing keys', () => {
    const merged = deepMergeJson(
      { hooks: { PostToolUse: [{ matcher: 'A' }] }, keep: 1 },
      { hooks: { PostToolUse: [{ matcher: 'B' }] } },
    ) as { hooks: { PostToolUse: Array<{ matcher: string }> }; keep: number };
    expect(merged.keep).toBe(1);
    expect(merged.hooks.PostToolUse.map((h) => h.matcher)).toEqual(['A', 'B']);
  });
});

describe('runInit', () => {
  it('scaffolds a full OKF vault', () => {
    const dir = tmpDir();
    const res = runInit({ dir });
    for (const f of [
      'AGENTS.md',
      'log.md',
      'index.md',
      '.gitignore',
      'inbox/.gitkeep',
      '.engram/config.json',
      '.claude/commands/refine.md',
      '.claude/settings.json',
    ]) {
      expect(existsSync(join(dir, f)), f).toBe(true);
    }
    expect(res.created).toContain('index.md');
    expect(readFileSync(join(dir, 'index.md'), 'utf8')).toContain('okf_version: 0.1');
  });

  it('is non-destructive on a second run', () => {
    const dir = tmpDir();
    runInit({ dir });
    writeFileSync(join(dir, 'AGENTS.md'), 'CUSTOM');
    const res = runInit({ dir });
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toBe('CUSTOM');
    expect(res.skipped).toContain('AGENTS.md');
  });

  it('deep-merges an existing .claude/settings.json, preserving user hooks', () => {
    const dir = tmpDir();
    runInit({ dir });
    const settingsPath = join(dir, '.claude', 'settings.json');
    writeFileSync(
      settingsPath,
      JSON.stringify({ hooks: { SessionStart: [{ note: 'mine' }] } }, null, 2),
    );
    runInit({ dir });
    const merged = JSON.parse(readFileSync(settingsPath, 'utf8')) as {
      hooks: Record<string, unknown[]>;
    };
    expect(merged.hooks.SessionStart).toHaveLength(1); // user's hook preserved
    expect(merged.hooks.PostToolUse).toBeDefined(); // engram's hook added
  });
});
