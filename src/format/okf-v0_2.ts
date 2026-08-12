/**
 * OKF v0.2 codec — the current format (ADR-0020).
 *
 * Adds what the intelligence layer and the validity filter need: time bounds,
 * provenance, and the closed relation set carried in frontmatter (ADR-0022).
 */
import { makeEdge, makeNode, type Edge, type Node } from '../core/model.js';
import type { Codec, ParsedFrontmatter, ReadResult } from './registry.js';

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/** The closed set this codec serializes. Semantics live in core/relations.ts. */
const RELATION_KEYS = ['supersedes', 'sources'] as const;

export const OKF_V0_2: Codec = {
  version: '0.2',

  read(parsed: ParsedFrontmatter, path: string): ReadResult {
    const fm = parsed.frontmatter ?? {};
    const warnings: string[] = [];
    const id = str(fm.id);
    if (id === null && parsed.hasFrontmatter) {
      // ADR-0021: a missing slug is a warning and a fallback, never an error.
      warnings.push(`no id; falling back to path-as-identity for ${path}`);
    }
    const stamp = {
      by: str(fm.author) ?? 'unknown',
      at: str(fm.timestamp) ?? '1970-01-01T00:00:00.000Z',
      until: str(fm.stale_after),
    };
    const node = makeNode({
      id: id ?? path,
      path,
      stamp,
      body: parsed.body === '' ? null : parsed.body,
      aliases: list(fm.aliases),
    });

    const edges: Edge[] = [];
    for (const kind of RELATION_KEYS) {
      const raw = fm[kind];
      const targets = typeof raw === 'string' ? [raw] : list(raw);
      for (const to of targets) edges.push(makeEdge({ from: node.id, to, kind, stamp }));
    }
    return { node, edges, warnings };
  },

  write(node: Node, edges: Edge[]) {
    const warnings: string[] = [];
    const lines = [
      '---',
      'okf_version: 0.2',
      `id: ${node.id}`,
      `timestamp: ${node.stamp.at}`,
      `author: ${node.stamp.by}`,
    ];
    if (node.stamp.until !== null) lines.push(`stale_after: ${node.stamp.until}`);
    if (node.aliases.length > 0) lines.push(`aliases: [${node.aliases.join(', ')}]`);

    for (const kind of RELATION_KEYS) {
      const targets = edges.filter((e) => e.kind === kind).map((e) => e.to);
      if (targets.length > 0) lines.push(`${kind}: [${targets.join(', ')}]`);
    }
    const unknown = edges.filter((e) => !RELATION_KEYS.includes(e.kind as never));
    if (unknown.length > 0) {
      warnings.push(
        `okf 0.2 has no field for relation kind(s): ${[...new Set(unknown.map((e) => e.kind))].join(', ')}`,
      );
    }
    lines.push('---');
    return { content: `${lines.join('\n')}\n${node.body ?? ''}`, warnings };
  },
};
