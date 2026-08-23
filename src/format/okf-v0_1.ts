/**
 * OKF v0.1 codec — the v1 format (ADR-0002), still readable because vaults in
 * the wild are on it.
 *
 * v0.1 has no `status`, `stale_after`, `generated`, `verified`, `sources` or
 * `supersedes`. Writing a model that carries those through this codec is
 * therefore lossy, and says so — a codec-level warning, never a core change.
 */
import { makeNode, type Edge, type Node } from '../core/model.js';
import {
  withTrailingNewline,
  type Codec,
  type ParsedFrontmatter,
  type ReadResult,
} from './registry.js';

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

export const OKF_V0_1: Codec = {
  version: '0.1',

  read(parsed: ParsedFrontmatter, path: string): ReadResult {
    const fm = parsed.frontmatter ?? {};
    const stamp = {
      by: str(fm.author) ?? 'unknown',
      at: str(fm.timestamp) ?? '1970-01-01T00:00:00.000Z',
      until: null,
    };
    const node = makeNode({
      id: str(fm.id) ?? path,
      path,
      stamp,
      body: parsed.body === '' ? null : parsed.body,
      aliases: [],
    });
    // v0.1 has no closed relations at all — its links are untyped and live in
    // the body, so a read produces a node and no edges by construction.
    return { node, edges: [], warnings: [], styles: {} };
  },

  write(node: Node, edges: Edge[]) {
    const warnings: string[] = [];
    if (edges.length > 0) {
      warnings.push(
        `okf 0.1 cannot express ${edges.length} typed relation(s); they were dropped on write`,
      );
    }
    if (node.aliases.length > 0) {
      warnings.push(`okf 0.1 has no aliases field; ${node.aliases.length} dropped on write`);
    }
    if (node.stamp.until !== null) {
      warnings.push('okf 0.1 cannot express an assertion end date; `until` dropped on write');
    }
    const fm = [
      '---',
      `okf_version: 0.1`,
      `id: ${node.id}`,
      `timestamp: ${node.stamp.at}`,
      `author: ${node.stamp.by}`,
      '---',
    ].join('\n');
    return { content: withTrailingNewline(`${fm}\n${node.body ?? ''}`), warnings };
  },
};
