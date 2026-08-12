/**
 * MCP transports. One server (`mcp.ts`), two ways to reach it.
 *
 * **stdio** preserves ADR-0034's structural guarantee exactly: the client spawns
 * engram as a subprocess and speaks over pipes. No socket, no port, nothing
 * listening, nothing reachable.
 *
 * **HTTP** does not, which is why ADR-0041 had to amend the trust boundary before
 * this file existed. Its three constraints are implemented here and asserted by
 * test: opt-in only, `127.0.0.1` by default, and a startup warning naming the exact
 * root being exposed.
 */

import { createServer, type Server } from 'node:http';
import { createInterface } from 'node:readline';
import { handle, type McpDeps } from './mcp.js';

/** Speak MCP over stdin/stdout. No socket; ADR-0034 holds untouched. */
export async function serveStdio(
  deps: McpDeps,
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
): Promise<void> {
  const lines = createInterface({ input, terminal: false });
  for await (const line of lines) {
    if (line.trim() === '') continue;
    let response: unknown | null;
    try {
      response = await handle(JSON.parse(line), deps);
    } catch (e) {
      response = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: `parse error: ${e instanceof Error ? e.message : String(e)}`,
        },
      };
    }
    if (response !== null) output.write(`${JSON.stringify(response)}\n`);
  }
}

export interface HttpOptions {
  /** ADR-0041 constraint 1: HTTP never starts implicitly. */
  enabled: boolean;
  port?: number;
  /** ADR-0041 constraint 2: loopback unless deliberately overridden. */
  host?: string;
}

export class HttpNotEnabledError extends Error {
  constructor() {
    super(
      'the MCP HTTP transport is opt-in and was not enabled. Pass --http explicitly. ' +
        'Engram listens on nothing by default (ADR-0034); enabling this opens a socket ' +
        'anything with local access can reach, with no authentication (ADR-0041).',
    );
    this.name = 'HttpNotEnabledError';
  }
}

/**
 * ADR-0041 constraint 3.
 *
 * ADR-0030's answer to keeping private records isolated is that they live in a
 * separate repository the working agent has no reason to be in. A server started in
 * the wrong directory reaches straight past that — and silently, unless something
 * says which root is now reachable. This is that something.
 */
export function exposureWarning(root: string, host: string, port: number): string {
  return [
    '',
    `⚠  MCP HTTP server on ${host}:${port}`,
    `   EXPOSING: ${root}`,
    '   Anything with local access can read and write this vault. No authentication.',
    '   Engram listens on nothing by default — this was enabled explicitly (ADR-0041).',
    '',
  ].join('\n');
}

/** Start the HTTP transport. Refuses unless explicitly enabled. */
export function serveHttp(
  deps: McpDeps,
  options: HttpOptions,
  warn: (message: string) => void = (m) => process.stderr.write(m),
): Server {
  if (!options.enabled) throw new HttpNotEnabledError();

  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 7777;

  const server = createServer((req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'POST only' } }),
      );
      return;
    }
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      void (async () => {
        let body: unknown;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              id: null,
              error: { code: -32700, message: 'parse error' },
            }),
          );
          return;
        }
        const response = await handle(body as never, deps);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(response === null ? '' : JSON.stringify(response));
      })();
    });
  });

  warn(exposureWarning(deps.root, host, port));
  server.listen(port, host);
  return server;
}
