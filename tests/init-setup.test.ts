import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runInit } from '../src/commands/init';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'engram-initsetup-'));
}

describe('init auto-setup', () => {
  it('configures a detected Obsidian vault (standard/absolute links)', () => {
    const root = tmp();
    mkdirSync(join(root, '.obsidian'), { recursive: true });
    const res = runInit({ dir: root, git: false });
    expect(res.editors.map((e) => e.editor)).toContain('obsidian');
    const cfg = JSON.parse(readFileSync(join(root, '.obsidian', 'app.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(cfg.useMarkdownLinks).toBe(true);
    expect(cfg.newLinkFormat).toBe('absolute');
  });

  it('does not touch an editor that is not present (editor-agnostic)', () => {
    const root = tmp();
    const res = runInit({ dir: root, git: false });
    expect(res.editors).toEqual([]);
    expect(existsSync(join(root, '.obsidian'))).toBe(false);
  });

  it('git-inits a non-repo vault', () => {
    const root = tmp();
    const res = runInit({ dir: root });
    expect(res.gitInitialized).toBe(true);
    expect(existsSync(join(root, '.git'))).toBe(true);
  });

  it('respects --no-git and --no-editor-setup', () => {
    const root = tmp();
    mkdirSync(join(root, '.obsidian'), { recursive: true });
    const res = runInit({ dir: root, git: false, editorSetup: false });
    expect(res.gitInitialized).toBe(false);
    expect(existsSync(join(root, '.git'))).toBe(false);
    expect(res.editors).toEqual([]);
  });

  it('scaffolds CLAUDE.md pointing to AGENTS.md', () => {
    const root = tmp();
    runInit({ dir: root, git: false, agent: 'claude' });
    expect(readFileSync(join(root, 'CLAUDE.md'), 'utf8')).toContain('AGENTS.md');
  });
});
