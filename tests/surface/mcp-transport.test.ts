import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import {
  exposureWarning,
  HttpNotEnabledError,
  serveHttp,
  serveStdio,
} from '../../src/surface/mcp-transport.js';
import { fixedClock, memoryFileStore, staticDetector } from '../../src/substrate/index.js';

const deps = (root = '/Users/someone/vault-private') => ({
  files: memoryFileStore(),
  clock: fixedClock('2026-08-12T09:00:00.000Z'),
  detect: staticDetector({}),
  by: 'test',
  root,
});

/** Drive a real stdio exchange: write JSON-RPC lines in, read lines out. */
async function exchange(requests: unknown[]): Promise<Record<string, unknown>[]> {
  const input = new PassThrough();
  const output = new PassThrough();
  const replies: Record<string, unknown>[] = [];
  output.on('data', (chunk: Buffer) => {
    for (const line of chunk.toString('utf8').split('\n')) {
      if (line.trim() !== '') replies.push(JSON.parse(line));
    }
  });
  const done = serveStdio(deps(), input, output);
  for (const r of requests) input.write(`${JSON.stringify(r)}\n`);
  input.end();
  await done;
  return replies;
}

describe('stdio transport — no socket, ADR-0034 untouched', () => {
  it('completes a real handshake and lists tools', async () => {
    const replies = await exchange([
      { jsonrpc: '2.0', id: 1, method: 'initialize' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    ]);
    expect(replies).toHaveLength(2);
    expect((replies[0]!.result as Record<string, unknown>).serverInfo).toMatchObject({
      name: 'engram',
    });
    expect((replies[1]!.result as { tools: unknown[] }).tools.length).toBeGreaterThan(0);
  });

  it('writes no reply for a notification', async () => {
    const replies = await exchange([
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    ]);
    // One request had no id, so exactly one reply is correct.
    expect(replies).toHaveLength(1);
  });

  it('survives genuinely malformed JSON instead of dying mid-session', async () => {
    // Raw bytes, not JSON.stringify('not json') — that produces a valid JSON
    // string and would test nothing.
    const input = new PassThrough();
    const output = new PassThrough();
    const replies: Record<string, unknown>[] = [];
    output.on('data', (c: Buffer) => {
      for (const l of c.toString().split('\n')) if (l.trim()) replies.push(JSON.parse(l));
    });
    const done = serveStdio(deps(), input, output);
    input.write('{ this is not json\n');
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'initialize' })}\n`);
    input.end();
    await done;

    expect((replies[0]!.error as { code: number }).code).toBe(-32700);
    // The session continues: a bad line must not take the server down.
    expect(replies[1]!.result).toBeDefined();
  });

  it('answers a non-object payload with method-not-found rather than crashing', async () => {
    const replies = await exchange(['a bare string' as never]);
    expect((replies[0]!.error as { code: number }).code).toBe(-32601);
  });

  it('ignores blank lines', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const replies: unknown[] = [];
    output.on('data', (c: Buffer) => {
      for (const l of c.toString().split('\n')) if (l.trim()) replies.push(JSON.parse(l));
    });
    const done = serveStdio(deps(), input, output);
    input.write('\n\n');
    input.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' })}\n`);
    input.end();
    await done;
    expect(replies).toHaveLength(1);
  });
});

/**
 * ADR-0041's three constraints. Each is an acceptance criterion rather than a
 * default, so each gets a test: a default can be changed by anyone, a tested
 * constraint changes visibly.
 */
describe('HTTP transport — the constraints ADR-0041 exists for', () => {
  it('CONSTRAINT 1: refuses to start unless explicitly enabled', () => {
    expect(() => serveHttp(deps(), { enabled: false })).toThrow(HttpNotEnabledError);
  });

  it('the refusal explains what enabling it actually does', () => {
    try {
      serveHttp(deps(), { enabled: false });
      expect.unreachable('should have thrown');
    } catch (e) {
      const message = (e as Error).message;
      expect(message).toMatch(/opt-in/);
      expect(message).toMatch(/no authentication/i);
      expect(message).toMatch(/listens on nothing by default/);
    }
  });

  it('CONSTRAINT 2: binds 127.0.0.1 by default', () => {
    const warnings: string[] = [];
    const server = serveHttp(deps(), { enabled: true, port: 0 }, (m) => warnings.push(m));
    expect(warnings.join('')).toContain('127.0.0.1');
    server.close();
  });

  it('CONSTRAINT 3: warns at startup, naming the exact root exposed', () => {
    const warnings: string[] = [];
    const server = serveHttp(
      deps('/Users/someone/vault-private'),
      { enabled: true, port: 0 },
      (m) => warnings.push(m),
    );
    const said = warnings.join('');
    expect(said).toContain('EXPOSING: /Users/someone/vault-private');
    expect(said).toMatch(/No authentication/);
    server.close();
  });

  it('the warning names the root, because ADR-0030 depends on knowing which vault this is', () => {
    // A server started in the wrong directory reaches straight past ADR-0030's
    // separate-repo boundary. The warning is the only thing that surfaces it.
    expect(exposureWarning('/private/medical', '127.0.0.1', 7777)).toContain('/private/medical');
  });

  it('serves the same protocol as stdio — one server, two transports', async () => {
    const warnings: string[] = [];
    const server = serveHttp(deps(), { enabled: true, port: 0 }, (m) => warnings.push(m));
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address() as { port: number };

    const res = await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    const body = (await res.json()) as { result: { tools: unknown[] } };
    expect(body.result.tools.length).toBeGreaterThan(0);
    server.close();
  });

  it('rejects a non-POST request rather than serving anything', async () => {
    const server = serveHttp(deps(), { enabled: true, port: 0 }, () => {});
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address() as { port: number };
    const res = await fetch(`http://127.0.0.1:${port}`);
    expect(res.status).toBe(405);
    server.close();
  });
});
