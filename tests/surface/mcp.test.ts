import { describe, expect, it } from 'vitest';
import { handle, PROTOCOL_VERSION, TOOLS } from '../../src/surface/mcp.js';
import { OPERATIONS } from '../../src/policy/skill-schema.js';
import { fixedClock, memoryFileStore, staticDetector } from '../../src/substrate/index.js';

const deps = (seed: Record<string, string> = {}) => ({
  files: memoryFileStore(seed),
  clock: fixedClock('2026-08-12T09:00:00.000Z'),
  detect: staticDetector({}),
  by: 'mcp-test',
  root: '/tmp/vault',
});

const req = (method: string, params?: Record<string, unknown>, id: number | null = 1) => ({
  jsonrpc: '2.0' as const,
  id,
  method,
  params,
});
const call = (name: string, args: Record<string, unknown> = {}) =>
  req('tools/call', { name, arguments: args });

/** Minimal JSON-RPC response shapes — enough to assert on, with no `any`. */
interface RpcResult extends Record<string, unknown> {
  content?: { text: string }[];
  isError?: boolean;
  tools?: { name: string; description: string }[];
  prompts?: { name: string; description: string }[];
  messages?: { content: { text: string } }[];
  serverInfo?: { name: string };
  capabilities?: Record<string, unknown>;
  protocolVersion?: string;
}

const ok = (r: unknown): RpcResult => (r as { result: RpcResult }).result;
const err = (r: unknown): { code: number } => (r as { error: { code: number } }).error;
const textOf = (r: unknown) => (ok(r).content ?? []).map((c) => c.text).join('\n');

describe('handshake', () => {
  it('reports a protocol version and its capabilities', async () => {
    const r = ok(await handle(req('initialize'), deps()));
    expect(r.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(r.capabilities).toHaveProperty('tools');
    expect(r.capabilities).toHaveProperty('prompts');
    expect(r.serverInfo?.name).toBe('engram');
  });

  it('returns nothing for a notification, which has no id', async () => {
    expect(await handle(req('notifications/initialized', undefined, null), deps())).toBeNull();
  });

  it('returns a JSON-RPC error for an unknown method rather than throwing', async () => {
    expect(err(await handle(req('does/not/exist'), deps())).code).toBe(-32601);
  });
});

describe('operations are tools', () => {
  it('exposes one tool per operation engram actually has', async () => {
    const names = (ok(await handle(req('tools/list'), deps())).tools ?? [])
      .map((t) => t.name.replace('engram_', ''))
      .sort();
    expect(names).toEqual([...OPERATIONS].sort());
  });

  it('every tool declares an input schema and a description', () => {
    for (const tool of TOOLS) {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it("format's description tells the agent engram does not infer relations", () => {
    expect(TOOLS.find((t) => t.name === 'engram_format')!.description).toMatch(/does not infer/i);
  });

  it('capture works and never rejects', async () => {
    expect(textOf(await handle(call('engram_capture', { content: '' }), deps()))).toMatch(
      /captured/,
    );
  });

  it('format writes a node with the structure supplied', async () => {
    const d = deps();
    const out = textOf(
      await handle(
        call('engram_format', { content: '# Raft', container: 'consensus', sources: ['paper'] }),
        d,
      ),
    );
    expect(out).toMatch(/raft -> \/consensus\/raft\.md \(2 relation\(s\)\)/);
    expect(await d.files.read('/consensus/raft.md')).toContain('part-of: [consensus]');
  });

  it('a rejected call comes back as isError, naming the rule', async () => {
    const r = await handle(call('engram_format', { content: '!!! ???' }), deps());
    expect(ok(r).isError).toBe(true);
    expect(textOf(r)).toMatch(/rejected \[id-required\]/);
  });

  it('guardrails apply to MCP calls, not only the CLI', async () => {
    const r = await handle(call('engram_format', { content: '# S', id: 'synthesis-x' }), deps());
    expect(ok(r).isError).toBe(true);
    expect(textOf(r)).toMatch(/require-sources/);
  });

  it('doctor is read-only over MCP too', async () => {
    const d = deps({
      '/a.md': '---\nokf_version: 0.2\nid: a\ntimestamp: 2026-01-01T00:00:00Z\n---\n# A',
    });
    const before = (await d.files.list()).sort();
    await handle(call('engram_doctor'), d);
    expect((await d.files.list()).sort()).toEqual(before);
  });

  it('an unknown tool is an error, not a crash', async () => {
    expect(ok(await handle(call('engram_rm_rf'), deps())).isError).toBe(true);
  });
});

/**
 * v2-overview §6: a skill is instructions, never code. Exposing one as a *tool*
 * would imply engram executes it. Prompts are what MCP calls instructions a client
 * follows, so that is what they are.
 */
describe('skills are prompts, not tools', () => {
  it('no skill appears in the tool list', async () => {
    const names = (ok(await handle(req('tools/list'), deps())).tools ?? []).map((t) => t.name);
    expect(names).not.toContain('connect-the-dots');
    expect(names.every((n) => n.startsWith('engram_'))).toBe(true);
  });

  it('lists the built-in skills as prompts', async () => {
    const prompts = ok(await handle(req('prompts/list'), deps())).prompts ?? [];
    expect(prompts.map((p) => p.name)).toContain('connect-the-dots');
  });

  it('says which operations a skill sequences, so the agent knows the bound', async () => {
    const prompts = ok(await handle(req('prompts/list'), deps())).prompts ?? [];
    expect(prompts.find((p) => p.name === 'connect-the-dots')?.description).toMatch(
      /uses: .*format/,
    );
  });

  it('returns the skill body as the prompt', async () => {
    const r = ok(await handle(req('prompts/get', { name: 'connect-the-dots' }), deps()));
    expect(r.messages?.[0]?.content.text).toMatch(/# Steps/);
  });

  it('a vault-local skill appears alongside the built-ins', async () => {
    const d = deps({
      '/.engram/skills/mine.md': [
        '---',
        'name: my-skill',
        'description: Mine.',
        'uses: [format]',
        '---',
        '',
        '# Do it',
      ].join('\n'),
    });
    const prompts = ok(await handle(req('prompts/list'), d)).prompts ?? [];
    expect(prompts.map((p) => p.name)).toContain('my-skill');
  });

  it('an unknown prompt is a JSON-RPC error', async () => {
    expect(err(await handle(req('prompts/get', { name: 'nope' }), deps())).code).toBe(-32602);
  });
});
