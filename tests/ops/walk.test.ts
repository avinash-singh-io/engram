import { describe, expect, it } from 'vitest';
import { walk } from '../../src/ops/walk.js';
import { memoryFileStore } from '../../src/substrate/index.js';

const store = (paths: string[]) =>
  memoryFileStore(Object.fromEntries(paths.map((p) => [p, 'content'])));

describe('TD-004 — a nested vault root is refused, and reported', () => {
  /**
   * The disclosure this closes: a parent `reindex` descending into a nested vault
   * would write its titles and one-line descriptions into a shared, committed
   * index.md. The obvious thing a user tries when told to keep private notes in a
   * separate directory.
   */
  it('skips everything under a nested root', async () => {
    const { paths } = await walk(
      store([
        '/concepts/public.md',
        '/private/.engram/config.json',
        '/private/medical-records.md',
        '/private/deep/passport.md',
      ]),
    );
    expect(paths).toEqual(['/concepts/public.md']);
    expect(paths.join(' ')).not.toMatch(/medical|passport/);
  });

  it('reports the skip rather than performing it silently', async () => {
    const { findings } = await walk(
      store(['/a.md', '/private/.engram/config.json', '/private/secret.md']),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.code).toBe('nested-root-skipped');
    expect(findings[0]!.path).toBe('/private/');
    // Silence is indistinguishable from the feature not existing.
    expect(findings[0]!.message).toMatch(/skipped entirely/);
  });

  /**
   * As load-bearing as the positive case. A false positive silently drops real
   * authored content, which is a WORSE failure than the disclosure being guarded
   * against — so detection is on the explicit marker, never a heuristic.
   */
  it('does NOT skip an ordinary subdirectory', async () => {
    const { paths, findings } = await walk(
      store(['/projects/alpha/notes.md', '/projects/beta/notes.md', '/concepts/x.md']),
    );
    expect(paths).toEqual([
      '/concepts/x.md',
      '/projects/alpha/notes.md',
      '/projects/beta/notes.md',
    ]);
    expect(findings).toEqual([]);
  });

  it('does not mistake a similarly-named directory for a marker', async () => {
    const { paths, findings } = await walk(
      store(['/engram-notes/x.md', '/my.engram.backup/y.md', '/z.md']),
    );
    expect(paths).toHaveLength(3);
    expect(findings).toEqual([]);
  });

  it("does not treat the vault's OWN sidecar as a nested root", async () => {
    const { paths, findings } = await walk(store(['/.engram/config.json', '/concepts/x.md']));
    expect(paths).toEqual(['/concepts/x.md']);
    expect(findings).toEqual([]);
  });

  it('handles several nested roots at different depths', async () => {
    const { paths, findings } = await walk(
      store([
        '/ok.md',
        '/client-a/.engram/c.json',
        '/client-a/brief.md',
        '/deep/client-b/.engram/c.json',
        '/deep/client-b/brief.md',
      ]),
    );
    expect(paths).toEqual(['/ok.md']);
    expect(findings.map((f) => f.path).sort()).toEqual(['/client-a/', '/deep/client-b/']);
  });
});

describe('reserved files are never authored content', () => {
  it('excludes them at any depth', async () => {
    const { paths } = await walk(
      store(['/index.md', '/a/index.md', '/AGENTS.md', '/CLAUDE.md', '/log.md', '/a/real.md']),
    );
    expect(paths).toEqual(['/a/real.md']);
  });

  it('does not exclude a file merely containing a reserved name', async () => {
    const { paths } = await walk(store(['/my-index.md', '/indexed.md', '/logbook.md']));
    expect(paths).toHaveLength(3);
  });
});

describe('derived state is not authored content', () => {
  it('excludes the views subtree', async () => {
    const { paths } = await walk(
      store(['/views/superseded.md', '/views/recent.md', '/concepts/x.md']),
    );
    expect(paths).toEqual(['/concepts/x.md']);
  });
});

describe('enumeration counts structure without reading bodies', () => {
  it('counts what it enumerated', async () => {
    const { count, paths } = await walk(store(['/a.md', '/b/c.md', '/index.md']));
    expect(count).toBe(2);
    expect(count).toBe(paths.length);
  });

  it('ignores non-markdown files', async () => {
    const { paths } = await walk(store(['/a.md', '/image.png', '/data.json']));
    expect(paths).toEqual(['/a.md']);
  });

  it('returns paths sorted, so generated output is deterministic', async () => {
    const { paths } = await walk(store(['/z.md', '/a.md', '/m.md']));
    expect(paths).toEqual(['/a.md', '/m.md', '/z.md']);
  });

  it('an empty vault is not an error', async () => {
    const { paths, count, findings } = await walk(memoryFileStore());
    expect(paths).toEqual([]);
    expect(count).toBe(0);
    expect(findings).toEqual([]);
  });
});
