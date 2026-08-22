/**
 * MCP server — the seven operations as typed tools, skills as prompts.
 *
 * **Tools are things engram does; prompts are instructions the client follows.**
 * Operations map to tools because engram executes them. Skills map to prompts
 * because engram does not (v2-overview §6) — exposing a skill as a callable tool
 * would mean either interpreting it or misrepresenting what the call does.
 *
 * This module is protocol only: it holds no logic that is not translation. Every
 * tool call routes to the same operation the CLI calls, which is the test that
 * ADR-0024's tiering is real rather than decorative.
 *
 * JSON-RPC 2.0 is implemented directly rather than via an SDK. The surface engram
 * needs is five methods, and engram carries zero runtime dependencies (TD-005) —
 * a property worth keeping for a tool whose pitch is that it depends on nothing.
 */

import type { Clock, Detector, FileStore } from '../core/ports.js';
import { capture } from '../ops/capture.js';
import { doctor, formatReport } from '../ops/doctor.js';
import { loadGuardrails } from '../policy/config.js';
import { format } from '../ops/format.js';
import { init } from '../ops/init.js';
import { link } from '../ops/link.js';
import { reindex } from '../ops/reindex.js';
import { discoverSkills } from '../policy/skills.js';
import { listProposals, showProposal } from '../ops/queue.js';

export const PROTOCOL_VERSION = '2025-06-18';

export interface McpDeps {
  files: FileStore;
  clock: Clock;
  detect: Detector;
  by: string;
  root: string;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

const S = (description: string) => ({ type: 'string', description });

/** The operations, as typed tools. One entry per thing engram can actually do. */
export const TOOLS = [
  {
    name: 'engram_capture',
    description: 'Persist raw content to raw/. Never validates, never fails.',
    inputSchema: {
      type: 'object',
      properties: { content: S('Anything at all. Nothing is rejected.') },
      required: ['content'],
    },
  },
  {
    name: 'engram_format',
    description:
      'Turn content plus the structure YOU decided into a validated node. Engram does not infer relations — supply them.',
    inputSchema: {
      type: 'object',
      properties: {
        content: S('The note body.'),
        title: S('Title; the slug is derived from it.'),
        id: S('Explicit slug, wins over the title.'),
        container: S('Files it there and records a part-of edge.'),
        supersedes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Node ids this replaces.',
        },
        sources: {
          type: 'array',
          items: { type: 'string' },
          description: 'Node ids this draws on.',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'engram_link',
    description: 'Assert one typed relation: supersedes, sources or part-of.',
    inputSchema: {
      type: 'object',
      properties: { file: S('Vault path.'), to: S('Target node id.'), kind: S('Relation kind.') },
      required: ['file', 'to', 'kind'],
    },
  },
  {
    name: 'engram_reindex',
    description: 'Regenerate derived state (index.md, views/, AGENTS.md). Idempotent.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'engram_doctor',
    description: 'Health and integrity report. Read-only; writes nothing.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'engram_init',
    description: 'Scaffold a vault. Non-destructive; never overwrites.',
    inputSchema: { type: 'object', properties: {} },
  },
  /**
   * The queue is **readable** here and nowhere near approvable (ADR-0042).
   *
   * Reading matters: an agent that cannot see its own pending proposal retries the
   * write and queues a duplicate. Acting does not belong here at all — approval is
   * the human's half of a deferral addressed to them, so it exists only on the CLI
   * and in the Obsidian panel.
   */
  {
    name: 'engram_queue_list',
    description:
      'Proposals awaiting human review. Read-only. You cannot approve or reject — that is the human half of a propose-only deferral, and no tool for it exists.',
    inputSchema: {
      type: 'object',
      properties: { all: { type: 'boolean', description: 'Include resolved proposals.' } },
    },
  },
  {
    name: 'engram_queue_show',
    description: 'One pending proposal in full, including what it would write. Read-only.',
    inputSchema: {
      type: 'object',
      properties: { id: S('Proposal id, from engram_queue_list.') },
      required: ['id'],
    },
  },
] as const;

/**
 * The verbs that must never appear as tools. Asserted by test over the real tool
 * list — the cheapest way to lose ADR-0042's guarantee is for someone to add the
 * obvious missing tool in six months, and a name check catches that where a
 * design document does not.
 */
export const HUMAN_ONLY_ACTIONS = ['approve', 'reject'] as const;

const text = (s: string) => ({ content: [{ type: 'text', text: s }] });

/**
 * A deferred write, reported to the agent that attempted it (ADR-0042).
 *
 * `isError: true` is deliberate and is the conservative reading. The call did not
 * do what was asked — nothing was written — and an agent that treats a deferral as
 * a success reports "done" to a human for a change still sitting unreviewed. The
 * text carries the correction, including the part the agent cannot act on: **it
 * cannot approve this itself.** No tool for that exists, and saying so here saves
 * it from hunting for one.
 */
const queued = (rule: string, reason: string) => ({
  ...text(
    `queued [${rule}]: ${reason}\n` +
      'NOT written. It is held for human review — engram_queue_list and ' +
      'engram_queue_show will report it. Approving is a human action, on the CLI ' +
      'or in Obsidian; there is no tool for it and you should not look for one.',
  ),
  isError: true,
});

async function callTool(
  name: string,
  args: Record<string, unknown>,
  deps: McpDeps,
): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  const { files, clock, detect, by } = deps;
  const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

  switch (name) {
    case 'engram_capture': {
      const { path, bytes } = await capture(str(args.content) ?? '', { files, clock });
      return text(`captured ${bytes} bytes -> ${path}`);
    }
    case 'engram_format': {
      const r = await format(
        str(args.content) ?? '',
        {
          by,
          title: str(args.title),
          id: str(args.id),
          container: str(args.container),
          supersedes: arr(args.supersedes),
          sources: arr(args.sources),
          generated: true,
        },
        { files, clock, guardrails: (await loadGuardrails(files)).config },
      );
      if (r.outcome === 'rejected') {
        return { ...text(`rejected [${r.rule}]: ${r.reason}`), isError: true };
      }
      if (r.outcome === 'queued') return queued(r.rule, r.reason);
      return text(`${r.node.id} -> ${r.node.path} (${r.edges.length} relation(s))`);
    }
    case 'engram_link': {
      const r = await link(str(args.file) ?? '', str(args.to) ?? '', str(args.kind) ?? '', {
        files,
        clock,
        by,
      });
      if (r.outcome === 'rejected') {
        return { ...text(`rejected [${r.rule}]: ${r.reason}`), isError: true };
      }
      if (r.outcome === 'queued') return queued(r.rule, r.reason);
      return text(`${r.edge.from} --${r.edge.kind}--> ${r.edge.to}`);
    }
    case 'engram_reindex': {
      const { written, counts } = await reindex(files, clock);
      return text(
        `${counts.nodes} node(s), ${counts.edges} edge(s) -> ${written.length} derived file(s)`,
      );
    }
    case 'engram_queue_list': {
      const proposals = await listProposals(files, { all: args.all === true });
      return text(
        proposals.length === 0
          ? 'nothing pending'
          : proposals
              .map((p) => `${p.id}  ${p.target}  [${p.status}]  held by ${p.rule}: ${p.reason}`)
              .join('\n'),
      );
    }
    case 'engram_queue_show': {
      const p = await showProposal(files, str(args.id) ?? '');
      return p === null
        ? { ...text(`no such proposal: ${str(args.id) ?? ''}`), isError: true }
        : text(
            `${p.id}\ntarget: ${p.target}\nheld by: ${p.rule} — ${p.reason}\n` +
              `status: ${p.status}\nby: ${p.by} at ${p.at}\n\n${p.content}`,
          );
    }
    case 'engram_doctor':
      return text(formatReport(await doctor(files, detect)));
    case 'engram_init': {
      const { created, reindexed } = await init(files, clock);
      return text(`created ${created.length} file(s), regenerated ${reindexed.length}`);
    }
    default:
      return { ...text(`unknown tool: ${name}`), isError: true };
  }
}

/**
 * Handle one JSON-RPC request. Pure over `deps` — no transport, no I/O of its own,
 * which is what lets stdio and HTTP share exactly one implementation.
 */
export async function handle(req: JsonRpcRequest, deps: McpDeps): Promise<unknown | null> {
  const reply = (result: unknown) => ({ jsonrpc: '2.0' as const, id: req.id ?? null, result });

  switch (req.method) {
    case 'initialize':
      return reply({
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {}, prompts: {} },
        serverInfo: { name: 'engram', version: '0.10.0' },
      });

    case 'notifications/initialized':
      return null; // a notification has no id and takes no response

    case 'tools/list':
      return reply({ tools: TOOLS });

    case 'tools/call': {
      const params = req.params ?? {};
      const name = typeof params.name === 'string' ? params.name : '';
      const args = (params.arguments as Record<string, unknown>) ?? {};
      return reply(await callTool(name, args, deps));
    }

    case 'prompts/list': {
      const { skills } = await discoverSkills(deps.files);
      return reply({
        prompts: skills.map((s) => ({
          name: s.name,
          description: `${s.description} (uses: ${s.uses.join(', ')})`,
        })),
      });
    }

    case 'prompts/get': {
      const { skills } = await discoverSkills(deps.files);
      const wanted = typeof req.params?.name === 'string' ? req.params.name : '';
      const found = skills.find((s) => s.name === wanted);
      if (found === undefined) {
        return {
          jsonrpc: '2.0' as const,
          id: req.id ?? null,
          error: { code: -32602, message: `no such skill: ${wanted}` },
        };
      }
      return reply({
        description: found.description,
        messages: [{ role: 'user', content: { type: 'text', text: found.body } }],
      });
    }

    default:
      return {
        jsonrpc: '2.0' as const,
        id: req.id ?? null,
        error: { code: -32601, message: `method not found: ${req.method}` },
      };
  }
}
