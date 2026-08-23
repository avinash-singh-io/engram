/**
 * read → write → read, in the style the file arrived in (ADR-0047 §5).
 *
 * The churn loop this closes: engram rewrites block sequences to flow, Obsidian
 * re-normalises them to block on the next property edit, and the two tools sit there
 * undoing each other in what is usually also a git repository.
 */

import { describe, expect, it } from 'vitest';
import { parseFrontmatter, readNode, writeNode } from '../../src/format/registry.js';
import { SUBSET } from '../../src/format/subset.js';

const PATH = '/n.md';
const doc = (yaml: string) => `---\nokf_version: 0.2\nid: n\n${yaml}\n---\n\nbody`;

describe('style survives a round trip', () => {
  it.each([
    ['flow', 'part-of: [a, b]'],
    ['block', 'part-of:\n  - a\n  - b'],
  ])('a %s sequence is written back as %s', (style, yaml) => {
    const { node, edges, styles } = readNode(doc(yaml), PATH);
    const { content } = writeNode(node, edges, undefined, styles);
    expect(parseFrontmatter(content).styles['part-of']).toBe(style);
  });

  it('a block sequence stays byte-identical through two cycles', () => {
    const first = readNode(doc('part-of:\n  - a\n  - b'), PATH);
    const once = writeNode(first.node, first.edges, undefined, first.styles).content;
    const second = readNode(once, PATH);
    const twice = writeNode(second.node, second.edges, undefined, second.styles).content;
    expect(twice).toBe(once);
  });

  it('preserves each key’s own style in a mixed document', () => {
    const { node, edges, styles } = readNode(doc('part-of:\n  - a\nsources: [b]'), PATH);
    const { content } = writeNode(node, edges, undefined, styles);
    const back = parseFrontmatter(content).styles;
    expect(back).toMatchObject({ 'part-of': 'block', sources: 'flow' });
  });

  it('defaults to flow for a note engram creates', () => {
    // Passing no styles is the "new note" case. Unchanged from before this phase.
    const { node, edges } = readNode(doc('part-of: [a]'), PATH);
    expect(writeNode(node, edges).content).toContain('part-of: [a]');
  });

  it('round-trips every value in the subset without loss', () => {
    for (const entry of SUBSET) {
      const parsed = parseFrontmatter(`---\n${entry.yaml}\n---\nbody`);
      expect(parsed.keyErrors, entry.name).toEqual([]);
      for (const [key, value] of Object.entries(entry.expect)) {
        expect(parsed.frontmatter?.[key], entry.name).toEqual(value);
      }
    }
  });
});
