import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectedEditors, obsidianEditor, setupEditors } from '../src/editors';
import { claudeAdapter } from '../src/adapters';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'engram-editor-'));
}

describe('obsidian editor adapter', () => {
  it('detects only when .obsidian exists', () => {
    const root = tmp();
    expect(obsidianEditor.detect(root)).toBe(false);
    mkdirSync(join(root, '.obsidian'), { recursive: true });
    expect(obsidianEditor.detect(root)).toBe(true);
  });

  it('merges app.json to standard/absolute links, preserving other keys', () => {
    const root = tmp();
    mkdirSync(join(root, '.obsidian'), { recursive: true });
    writeFileSync(join(root, '.obsidian', 'app.json'), JSON.stringify({ theme: 'dark' }));

    const res = obsidianEditor.setup(root);
    const cfg = JSON.parse(readFileSync(join(root, '.obsidian', 'app.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(cfg.theme).toBe('dark'); // preserved
    expect(cfg.useMarkdownLinks).toBe(true);
    expect(cfg.newLinkFormat).toBe('absolute');
    expect(res.changes.length).toBeGreaterThan(0);
  });

  it('is idempotent (second setup reports no changes)', () => {
    const root = tmp();
    mkdirSync(join(root, '.obsidian'), { recursive: true });
    obsidianEditor.setup(root);
    expect(obsidianEditor.setup(root).changes).toEqual([]);
  });

  it('setupEditors runs only detected editors', () => {
    const root = tmp();
    expect(setupEditors(root)).toEqual([]); // no editor present
    mkdirSync(join(root, '.obsidian'), { recursive: true });
    expect(detectedEditors(root).map((e) => e.id)).toContain('obsidian');
    expect(setupEditors(root)).toHaveLength(1);
  });
});

describe('claude adapter native pointer', () => {
  it('emits a CLAUDE.md that points at AGENTS.md', () => {
    const claudeMd = claudeAdapter.files('/assets').find((f) => f.dest === 'CLAUDE.md');
    expect(claudeMd).toBeDefined();
    expect(claudeMd?.content).toContain('AGENTS.md');
  });
});
