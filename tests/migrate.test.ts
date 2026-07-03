import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateConcept } from '../src/format';
import { defaultConfig, writeConfig } from '../src/vault';
import { applyMigration, convertWikilinks, deriveFrontmatter, planMigration } from '../src/migrate';

function tmpVault(): string {
  const root = mkdtempSync(join(tmpdir(), 'engram-mig-'));
  writeConfig(root, defaultConfig());
  return root;
}
function put(root: string, rel: string, text: string): void {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text);
}

describe('deriveFrontmatter', () => {
  it('derives title from heading, description from first sentence, tags from path', () => {
    const fm = deriveFrontmatter(
      'Projects/Momentum/note.md',
      '# Lanes Gap\n\nThe board misses worktrees. More detail follows.',
      new Date('2026-07-03T10:00:00Z'),
    );
    expect(fm.title).toBe('Lanes Gap');
    expect(fm.description).toBe('The board misses worktrees.');
    expect(fm.tags).toEqual(['projects', 'momentum']);
    expect(fm.timestamp).toBe('2026-07-03T10:00:00Z');
    expect(fm.type).toBe('Reference');
  });

  it('falls back to filename when there is no heading', () => {
    const fm = deriveFrontmatter('my-note.md', 'plain text.', new Date());
    expect(fm.title).toBe('my note');
  });
});

describe('convertWikilinks', () => {
  it('rewrites [[Target]] and [[Target|Alias]] to standard links', () => {
    const resolve = (t: string) => (t === 'Known' ? '/dir/known.md' : null);
    const { body, conversions } = convertWikilinks(
      'See [[Known]] and [[Ghost|the ghost]].',
      resolve,
    );
    expect(body).toBe('See [Known](/dir/known.md) and [the ghost](/ghost.md).');
    expect(conversions.find((c) => c.to.includes('known.md'))?.resolved).toBe(true);
    expect(conversions.find((c) => c.to.includes('ghost.md'))?.resolved).toBe(false);
  });
});

describe('planMigration / applyMigration', () => {
  it('migrates non-conformant notes to valid OKF concepts, skipping valid ones', () => {
    const root = tmpVault();
    put(
      root,
      'Projects/Momentum/Issue 1.md',
      'Root cause summary. Details here.\n\nSee [[Issue 2]].',
    );
    put(root, 'Projects/Momentum/Issue 2.md', '# Issue Two\n\nAnother finding.');
    // an already-valid concept:
    put(
      root,
      'ok.md',
      '---\ntype: Concept\ntitle: OK\ndescription: Already valid.\ntags: [x]\ntimestamp: 2026-07-03T00:00:00Z\n---\n\n# Body\n',
    );

    const plan = planMigration(root);
    expect(plan.alreadyValid).toContain('ok.md');
    expect(plan.items.map((i) => i.path).sort()).toEqual([
      'Projects/Momentum/Issue 1.md',
      'Projects/Momentum/Issue 2.md',
    ]);
    expect(plan.items.every((i) => i.valid)).toBe(true);

    applyMigration(root, plan);
    // re-read + validate on disk
    const check = planMigration(root);
    expect(check.items).toHaveLength(0); // everything conformant now
    // the wikilink was resolved to Issue 2
    const migrated = validateConcept(
      readFileSync(join(root, 'Projects/Momentum/Issue 1.md'), 'utf8'),
      'Projects/Momentum/Issue 1.md',
    );
    expect(migrated.ok).toBe(true);
  });
});
