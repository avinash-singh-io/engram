/**
 * Rendering commands into agent directories — the user-invoked twin of the
 * operation skills, with exactly the same refusal rules.
 */

import { describe, expect, it } from 'vitest';
import { reindex } from '../../src/ops/reindex.js';
import { init } from '../../src/ops/init.js';
import { auditSkills, renderCommand, renderCommands } from '../../src/surface/render-skills.js';
import { operations } from '../../src/policy/operations.js';
import { managedBy } from '../../src/policy/skills.js';
import { fixedClock, memoryFileStore } from '../../src/substrate/index.js';

const clock = fixedClock('2026-08-23T09:00:00.000Z');
const DIR = '/.opencode/commands';

const vault = async () => {
  const files = memoryFileStore();
  await init(files, clock);
  await reindex(files, clock);
  return files;
};

describe('every operation gets a command', () => {
  it('renders one per operation, from the registry', async () => {
    const files = await vault();
    for (const def of operations()) {
      expect(await files.exists(`${DIR}/engram-${def.name}.md`), def.name).toBe(true);
    }
    // And nothing else — no hand-invented extras.
    const rendered = (await files.list()).filter((p) => p.startsWith(`${DIR}/`));
    expect(rendered).toHaveLength(operations().length);
  });

  it('carries a description, the registry steps, and $ARGUMENTS passthrough', async () => {
    const files = await vault();
    const raw = (await files.read(`${DIR}/engram-capture.md`))!;

    expect(raw).toMatch(/^---\ndescription: /);
    expect(raw).toContain('Capture never rejects');
    expect(raw).toContain('$ARGUMENTS');
    expect(raw).toContain('engram capture [text]');
  });

  it('is always managed-prefixed, so nothing of the user can be shadowed', async () => {
    const files = await vault();
    for (const path of await files.list()) {
      if (!path.startsWith(`${DIR}/`)) continue;
      expect(path).toMatch(/\/engram-[a-z-]+\.md$/);
    }
  });
});

describe('the provenance marker decides what engram may overwrite', () => {
  it('never touches a command it did not write, and says so', async () => {
    const files = memoryFileStore();
    await init(files, clock);
    const theirs = '---\ndescription: Mine first.\n---\n\nTheirs.\n';
    await files.write(`${DIR}/engram-format.md`, theirs);

    const { commands } = await reindex(files, clock);
    expect(await files.read(`${DIR}/engram-format.md`)).toBe(theirs);
    expect(commands.skipped.map((s) => s.path)).toContain(`${DIR}/engram-format.md`);
  });

  it('regenerates one that carries the marker — the edit is taken back', async () => {
    const files = await vault();
    const path = `${DIR}/engram-format.md`;
    await files.write(path, `${(await files.read(path))!}\n\nEDITED BY HAND\n`);
    await reindex(files, clock);
    expect(await files.read(path)).not.toContain('EDITED BY HAND');
  });

  it('stops managing a file once you delete the marker', async () => {
    const files = await vault();
    const path = `${DIR}/engram-format.md`;
    const mine = (await files.read(path))!.replace(/^\s*engram-managed:.*$/m, '  mine: yes');
    await files.write(path, mine);
    expect(managedBy(mine)).toBeNull();

    await reindex(files, clock);
    expect(await files.read(path)).toBe(mine);
  });

  it('reports an orphaned render instead of deleting it', async () => {
    const files = await vault();
    await files.write(`${DIR}/engram-gone.md`, renderCommand(operations()[0], '0.15.0'));

    const { commands } = await reindex(files, clock);
    expect(commands.stale).toContain(`${DIR}/engram-gone.md`);
    expect(await files.exists(`${DIR}/engram-gone.md`)).toBe(true);
  });
});

describe('a rendered command is never mistaken for a note', () => {
  it('reindex stays idempotent with commands present, byte for byte', async () => {
    const files = await vault();
    const snapshot = async () =>
      Promise.all(
        (await files.list())
          .sort()
          .map(async (p) => [p, await files.read(p)] as const),
      );
    const before = await snapshot();
    await reindex(files, clock);
    expect(await snapshot()).toEqual(before);
  });

  it('and no command appears in the index', async () => {
    const files = await vault();
    const index = (await files.read('/index.md'))!;
    expect(index).not.toContain('.opencode/commands');
    expect(index).not.toContain('engram-capture');
  });
});

describe('the audit sees commands too', () => {
  it('reports an edited generated command, naming that there is no source to edit', async () => {
    const files = await vault();
    const path = `${DIR}/engram-format.md`;
    await files.write(path, `${(await files.read(path))!}\n\nEDITED BY HAND\n`);

    const audit = await auditSkills(files, []);
    expect(audit.edited).toContain(path);
  });

  it('reports every unrendered command on a fresh vault', async () => {
    const files = memoryFileStore();
    const audit = await auditSkills(files, []);
    expect(audit.unrendered.filter((p) => p.startsWith(DIR))).toHaveLength(
      operations().length,
    );
  });
});

describe('renderCommands on its own', () => {
  it('writes nothing for agents without a commands target', async () => {
    const files = memoryFileStore();
    const result = await renderCommands(files, [
      { name: 'no-commands', contractFile: '/X.md', why: 'test' },
    ]);
    expect(result.written).toEqual([]);
    expect(await files.list()).toEqual([]);
  });
});
