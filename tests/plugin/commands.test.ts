import { describe, expect, it } from 'vitest';
import {
  approveCommand,
  captureCommand,
  formatCommand,
  pendingQueue,
  rejectCommand,
} from '../../plugin/commands.js';
import { fixedClock, memoryFileStore } from '../../src/substrate/index.js';

const AT = '2026-08-13T09:00:00.000Z';

const GUARDRAILS = ['---', 'enabled: [propose-only]', 'proposeOnly: [/decisions/]', '---', ''].join(
  '\n',
);

const deps = (seed: Record<string, string> = {}) => ({
  files: memoryFileStore(seed),
  clock: fixedClock(AT),
  by: 'human',
});
const deferring = (seed: Record<string, string> = {}) =>
  deps({ '/.engram/guardrails.md': GUARDRAILS, ...seed });

/**
 * The plugin's work, tested without Obsidian.
 *
 * This is why `commands.ts` exists separately from `main.ts`: everything except
 * "does it load in the editor" is ordinary code over a `FileStore`. What remains
 * genuinely untestable here is the shell — `Notice`, `ItemView`, the ribbon — and
 * that is checked by hand and recorded as manual (Rule 12).
 */
describe('capture, in an editor', () => {
  it('never rejects, whatever the selection holds', async () => {
    const d = deps();
    for (const text of ['', '   ', '👨‍👩‍👧‍👦', 'x'.repeat(10_000)]) {
      await expect(captureCommand(text, d)).resolves.toMatch(/captured/);
    }
  });

  it('writes what was selected', async () => {
    const d = deps();
    await captureCommand('a half-formed thought', d);
    const raw = (await d.files.list()).find((p) => p.startsWith('/raw/'));
    expect(await d.files.read(raw!)).toBe('a half-formed thought');
  });
});

describe('format, in an editor', () => {
  it('files a note and reports where it went', async () => {
    const d = deps();
    const msg = await formatCommand('# Raft', { title: 'Raft', container: 'concepts' }, d);

    expect(msg).toContain('/concepts/raft.md');
    expect(await d.files.read('/concepts/raft.md')).toContain('id: raft');
  });

  it('reads the vault guardrails, not the built-in defaults', async () => {
    const d = deferring();
    const msg = await formatCommand('# D', { id: 'd1', path: '/decisions/d1.md' }, d);

    expect(msg).toMatch(/held for review by propose-only/);
    expect(await d.files.read('/decisions/d1.md')).toBeNull();
  });

  it('reports a rejection with the rule that fired', async () => {
    const d = deps({
      '/.engram/guardrails.md': ['---', 'enabled: [require-sources]', '---'].join('\n'),
    });
    const msg = await formatCommand('# S', { id: 'synthesis-x' }, d);
    expect(msg).toMatch(/rejected \[require-sources\]/);
  });
});

describe('the approval panel', () => {
  const queued = async () => {
    const d = deferring();
    await formatCommand('# D', { id: 'd1', path: '/decisions/d1.md' }, d);
    return d;
  };

  it('shows what is pending, with the current file for the diff', async () => {
    const d = await queued();
    const items = await pendingQueue(d);

    expect(items).toHaveLength(1);
    expect(items[0]!.proposal.target).toBe('/decisions/d1.md');
    expect(items[0]!.current).toBeNull();
    expect(items[0]!.stale).toBe(false);
  });

  /** The panel disables Approve on these, rather than letting the click fail. */
  it('marks a proposal stale once the target moves under it', async () => {
    const d = await queued();
    await d.files.write('/decisions/d1.md', '# edited by hand since');

    const items = await pendingQueue(d);
    expect(items[0]!.stale).toBe(true);
    expect(items[0]!.current).toBe('# edited by hand since');
  });

  it('approve applies it — the human half of the deferral', async () => {
    const d = await queued();
    const id = (await pendingQueue(d))[0]!.proposal.id;

    expect(await approveCommand(id, d)).toMatch(/applied/);
    expect(await d.files.read('/decisions/d1.md')).toContain('id: d1');
    expect(await pendingQueue(d)).toHaveLength(0);
  });

  it('approve refuses a stale proposal and says engram will not merge', async () => {
    const d = await queued();
    const id = (await pendingQueue(d))[0]!.proposal.id;
    await d.files.write('/decisions/d1.md', '# mine');

    const msg = await approveCommand(id, d);
    expect(msg).toMatch(/will not merge/i);
    expect(await d.files.read('/decisions/d1.md')).toBe('# mine');
  });

  it('reject discards without touching the target', async () => {
    const d = await queued();
    const id = (await pendingQueue(d))[0]!.proposal.id;

    expect(await rejectCommand(id, 'no thanks', d)).toMatch(/not touched/);
    expect(await d.files.read('/decisions/d1.md')).toBeNull();
    expect(await pendingQueue(d)).toHaveLength(0);
  });

  it('reports an unknown id rather than throwing', async () => {
    await expect(approveCommand('nope', deps())).resolves.toMatch(/no such proposal/);
    await expect(rejectCommand('nope', '', deps())).resolves.toMatch(/no such proposal/);
  });
});
