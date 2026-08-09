import { describe, expect, it } from 'vitest';
import { extractFromLines, isHumanPrompt } from '../../tools/gate1/reader.js';

/**
 * Synthetic fixture mirroring the record shapes observed in real transcripts.
 * The counts here encode the finding that motivated the filters: most
 * `type: "user"` records are not human prompts (ADR-0037 / Group 1).
 */
const line = (o: unknown) => JSON.stringify(o);

const humanPrompt = {
  type: 'user',
  uuid: 'u-1',
  sessionId: 's-1',
  timestamp: '2026-08-10T09:00:00Z',
  userType: 'external',
  promptSource: 'sdk',
  message: { role: 'user', content: 'what did we decide about retries?' },
};

const toolResult = {
  type: 'user',
  uuid: 'u-2',
  sessionId: 's-1',
  timestamp: '2026-08-10T09:00:01Z',
  toolUseResult: { stdout: 'ok' },
  message: { role: 'user', content: [{ type: 'tool_result', text: 'ok' }] },
};

const metaTurn = {
  type: 'user',
  uuid: 'u-3',
  sessionId: 's-1',
  timestamp: '2026-08-10T09:00:02Z',
  isMeta: true,
  message: { role: 'user', content: [{ type: 'text', text: 'system-reminder' }] },
};

const sidechainTurn = {
  type: 'user',
  uuid: 'u-4',
  sessionId: 's-1',
  timestamp: '2026-08-10T09:00:03Z',
  isSidechain: true,
  message: { role: 'user', content: 'subagent instruction' },
};

const attachmentOnly = {
  type: 'user',
  uuid: 'u-5',
  sessionId: 's-1',
  timestamp: '2026-08-10T09:00:04Z',
  message: { role: 'user', content: [{ type: 'image' }] },
};

const assistantTurn = { type: 'assistant', uuid: 'a-1', message: { content: 'hi' } };

describe('isHumanPrompt', () => {
  it('accepts a real human prompt', () => {
    expect(isHumanPrompt(humanPrompt)).toBe(true);
  });

  it.each([
    ['a tool result fed back to the model', toolResult],
    ['a harness meta turn', metaTurn],
    ['a subagent (sidechain) prompt', sidechainTurn],
    ['an attachment-only turn with no prompt text', attachmentOnly],
    ['an assistant turn', assistantTurn],
  ])('rejects %s', (_label, record) => {
    expect(isHumanPrompt(record)).toBe(false);
  });

  it.each([[null], [undefined], [{}], ['not-an-object']])(
    'rejects malformed input %#',
    (record) => {
      expect(isHumanPrompt(record)).toBe(false);
    },
  );
});

describe('extractFromLines', () => {
  const lines = [
    humanPrompt,
    toolResult,
    metaTurn,
    sidechainTurn,
    attachmentOnly,
    assistantTurn,
  ].map(line);

  it('keeps only the human prompt out of six records', () => {
    const got = extractFromLines(lines, { rootId: 'root-abc123' });
    expect(got).toHaveLength(1);
    expect(got[0]).toEqual({
      id: 'u-1',
      text: 'what did we decide about retries?',
      ts: '2026-08-10T09:00:00Z',
      session: 's-1',
      root: 'root-abc123',
    });
  });

  it('skips blank lines and a truncated tail without losing earlier prompts', () => {
    const got = extractFromLines(['', line(humanPrompt), '   ', '{"type":"user","message":{"con'], {
      rootId: 'root-abc123',
    });
    expect(got).toHaveLength(1);
    expect(got[0].id).toBe('u-1');
  });

  it('stamps the opaque root id and never a semantic root name', () => {
    const got = extractFromLines([line(humanPrompt)], { rootId: 'root-def456' });
    expect(got[0].root).toBe('root-def456');
  });
});
