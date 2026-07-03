import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { serializeConcept } from '../src/format';
import { defaultConfig, writeConfig } from '../src/vault';
import { parseHookPayload, runWriteHook } from '../src/hooks';

function tmpVault(): string {
  const r = mkdtempSync(join(tmpdir(), 'engram-hook-'));
  writeConfig(r, defaultConfig());
  return r;
}

function write(root: string, rel: string, text: string): string {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text);
  return abs;
}

const validFm = {
  type: 'Concept',
  title: 'Idempotency',
  description: 'How at-least-once plus idempotent operations is effectively-once.',
  tags: ['reliability'],
  timestamp: '2026-07-03T00:00:00Z',
};

describe('parseHookPayload', () => {
  it('extracts file_path from tool_input', () => {
    const p = parseHookPayload(
      JSON.stringify({ tool_name: 'Write', tool_input: { file_path: '/x/y.md' }, cwd: '/x' }),
    );
    expect(p.filePaths).toEqual(['/x/y.md']);
    expect(p.toolName).toBe('Write');
  });

  it('tolerates non-JSON and non-object payloads', () => {
    expect(parseHookPayload('not json').filePaths).toEqual([]);
    expect(parseHookPayload('123').filePaths).toEqual([]);
  });
});

describe('runWriteHook', () => {
  it('validates, reindexes, and logs a good concept', () => {
    const root = tmpVault();
    const abs = write(root, 'system-design/x.md', serializeConcept(validFm, '# Model\n\nBody.'));
    const res = runWriteHook(abs);
    expect(res.ok).toBe(true);
    expect(res.action).toBe('validated');
    expect(existsSync(join(root, 'system-design', 'index.md'))).toBe(true);
    expect(readFileSync(join(root, 'log.md'), 'utf8')).toContain('**Updated** [Idempotency]');
  });

  it('blocks an invalid concept (fail-loud)', () => {
    const root = tmpVault();
    const abs = write(root, 'bad.md', '# no frontmatter here');
    const res = runWriteHook(abs);
    expect(res.ok).toBe(false);
    expect(res.action).toBe('blocked');
    expect(res.messages.join(' ')).toContain('missing-frontmatter');
  });

  it('skips reserved and inbox files', () => {
    const root = tmpVault();
    expect(runWriteHook(write(root, 'inbox/note.md', 'raw')).action).toBe('skipped');
    expect(runWriteHook(write(root, 'index.md', '# Index')).action).toBe('skipped');
  });
});
