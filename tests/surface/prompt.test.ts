import { describe, expect, it, afterEach } from 'vitest';
import { choose, confirm, interactive } from '../../src/surface/prompt.js';

// `isTTY` is a plain property on the stream, not a getter, so it is assigned
// rather than spied. Captured and restored so one test cannot leak into another.
const original = { in: process.stdin.isTTY, out: process.stdout.isTTY };
const asTTY = (stdin: boolean, stdout: boolean) => {
  process.stdin.isTTY = stdin;
  process.stdout.isTTY = stdout;
};
afterEach(() => asTTY(original.in as boolean, original.out as boolean));

/**
 * The safety property, not a convenience.
 *
 * `engram init` is also reachable over MCP, where no human is on stdin. A prompt
 * that waited there would hang an agent forever on input that never arrives, so
 * every prompt is a no-op without a terminal on both ends.
 */
describe('prompts never block a non-interactive caller', () => {
  it('is not interactive when stdin is not a terminal', () => {
    asTTY(false, true);
    expect(interactive()).toBe(false);
  });

  it('is not interactive when stdout is not a terminal', () => {
    asTTY(true, false);
    expect(interactive()).toBe(false);
  });

  it('choose returns the fallback immediately, without reading stdin', async () => {
    asTTY(false, false);
    await expect(
      choose('pick', [{ id: 'para', label: 'PARA', hint: '' }], 'default'),
    ).resolves.toBe('default');
  });

  it('confirm returns the fallback immediately, without reading stdin', async () => {
    asTTY(false, false);
    await expect(confirm('really?')).resolves.toBe(false);
    await expect(confirm('really?', true)).resolves.toBe(true);
  });

  it('choose with no options never prompts, even at a terminal', async () => {
    asTTY(true, true);
    await expect(choose('pick', [], 'custom')).resolves.toBe('custom');
  });
});
