/**
 * TIER 1 — the frontmatter subset engram guarantees to read (ADR-0047).
 *
 * **This file is the promise, and the tests iterate it.** A construct cannot be
 * claimed without a test and cannot be tested without being claimed, which is the
 * gap that let BUG-011 live for ten releases: the subset was implicit, so nothing
 * could be checked against it and a missing construct was invisible until a user's
 * editor produced one.
 *
 * `registry.ts` even cited ADR-0020 for "OKF frontmatter is flat by design" and
 * ADR-0020 says nothing of the kind. The parser was built around an unwritten rule
 * and then diverged from it unobserved. Writing the rule down is the actual fix; the
 * missing constructs were a symptom.
 */

/** How a sequence was written. Recorded on read so a write can give it back. */
export type SequenceStyle = 'flow' | 'block';

/**
 * One key that could not be read, and why.
 *
 * The unit of failure is the **key**, never the document (ADR-0047 §2). A parser
 * that fails wholesale turns a formatting variation into an identity event.
 */
export interface KeyError {
  /** The key that failed, or the raw line when even the key was unreadable. */
  key: string;
  /** 1-based line within the frontmatter block, for a message a human can act on. */
  line: number;
  reason: string;
}

/** A construct engram guarantees to read. */
export interface SubsetEntry {
  /** What it is called — in docs, in warnings, and in test output. */
  name: string;
  /** A minimal frontmatter body exercising it. */
  yaml: string;
  /** What parsing it must produce. */
  expect: Record<string, unknown>;
  /** Sequence styles this document must report, when it has sequences. */
  styles?: Record<string, SequenceStyle>;
}

/** A construct engram does **not** read, and the warning it must produce. */
export interface ExcludedEntry {
  name: string;
  yaml: string;
  /** A fragment the warning must contain, so the message names the construct. */
  warns: string;
  /** Keys that must survive anyway — exclusion is per key, never per document. */
  survives: Record<string, unknown>;
}

/**
 * Every construct engram promises to read.
 *
 * Ordered roughly as a reader would meet them: scalars, then sequences, then the
 * shapes Obsidian and the Agent Skills standard actually emit.
 */
export const SUBSET: readonly SubsetEntry[] = [
  { name: 'plain scalar', yaml: 'id: finance-glossary', expect: { id: 'finance-glossary' } },
  {
    name: 'plain scalar containing a colon',
    yaml: 'title: Runway: 7-9 months',
    expect: { title: 'Runway: 7-9 months' },
  },
  {
    name: 'double-quoted scalar containing a colon',
    yaml: 'title: "Runway: 7-9 months"',
    expect: { title: 'Runway: 7-9 months' },
  },
  { name: 'single-quoted scalar', yaml: "title: 'a note'", expect: { title: 'a note' } },
  { name: 'boolean', yaml: 'pinned: true', expect: { pinned: true } },
  { name: 'null via empty value', yaml: 'aliases:', expect: { aliases: null } },
  { name: 'null via tilde', yaml: 'aliases: ~', expect: { aliases: null } },
  {
    name: 'date, read as a string',
    yaml: 'created: 2026-08-23',
    expect: { created: '2026-08-23' },
  },
  {
    name: 'flow sequence',
    yaml: 'part-of: [a, b]',
    expect: { 'part-of': ['a', 'b'] },
    styles: { 'part-of': 'flow' },
  },
  {
    name: 'empty flow sequence',
    yaml: 'part-of: []',
    expect: { 'part-of': [] },
    styles: { 'part-of': 'flow' },
  },
  {
    // The construct BUG-011 was about. Obsidian's Properties panel emits this.
    name: 'block sequence, indented',
    yaml: 'part-of:\n  - a\n  - b',
    expect: { 'part-of': ['a', 'b'] },
    styles: { 'part-of': 'block' },
  },
  {
    // Valid YAML and equally common — a sequence may sit at the parent's indent.
    name: 'block sequence, unindented',
    yaml: 'part-of:\n- a\n- b',
    expect: { 'part-of': ['a', 'b'] },
    styles: { 'part-of': 'block' },
  },
  {
    name: 'block sequence, single item',
    yaml: 'part-of:\n  - a',
    expect: { 'part-of': ['a'] },
    styles: { 'part-of': 'block' },
  },
  {
    name: 'block sequence followed by a scalar',
    yaml: 'part-of:\n  - a\nauthor: me',
    expect: { 'part-of': ['a'], author: 'me' },
    styles: { 'part-of': 'block' },
  },
  {
    name: 'two block sequences in one document',
    yaml: 'part-of:\n  - a\nsources:\n  - b\n  - c',
    expect: { 'part-of': ['a'], sources: ['b', 'c'] },
    styles: { 'part-of': 'block', sources: 'block' },
  },
  {
    name: 'mixed styles in one document',
    yaml: 'part-of:\n  - a\nsources: [b, c]',
    expect: { 'part-of': ['a'], sources: ['b', 'c'] },
    styles: { 'part-of': 'block', sources: 'flow' },
  },
  {
    name: 'quoted item in a block sequence',
    yaml: 'part-of:\n  - "a: b"',
    expect: { 'part-of': ['a: b'] },
    styles: { 'part-of': 'block' },
  },
  {
    name: 'literal block scalar',
    yaml: 'note: |\n  line one\n  line two',
    expect: { note: 'line one\nline two' },
  },
  {
    name: 'folded block scalar',
    yaml: 'note: >\n  wrapped\n  text',
    expect: { note: 'wrapped text' },
  },
  {
    name: 'literal block scalar, strip chomping',
    yaml: 'note: |-\n  line one',
    expect: { note: 'line one' },
  },
  {
    name: 'flow map',
    yaml: 'emits: { type: Synthesis }',
    expect: { emits: { type: 'Synthesis' } },
  },
  {
    // The Agent Skills standard puts every tool-specific field under `metadata`.
    name: 'nested map, one level',
    yaml: 'metadata:\n  engram-uses: capture',
    expect: { metadata: { 'engram-uses': 'capture' } },
  },
  { name: 'comment line', yaml: '# a comment\nid: x', expect: { id: 'x' } },
  { name: 'blank line', yaml: 'id: x\n\nauthor: me', expect: { id: 'x', author: 'me' } },
];

/**
 * Constructs engram does not read.
 *
 * Named exclusions rather than surprises. Each must warn by name **and** leave the
 * rest of the document intact — the exclusion is per key, exactly like a parse
 * failure, because a construct engram has not implemented is not a reason to cost a
 * note its identity either.
 */
export const EXCLUDED: readonly ExcludedEntry[] = [
  {
    name: 'anchor',
    yaml: 'id: x\nbase: &anchor value',
    warns: 'anchor',
    survives: { id: 'x' },
  },
  {
    name: 'alias',
    yaml: 'id: x\nref: *anchor',
    warns: 'alias',
    survives: { id: 'x' },
  },
  {
    name: 'explicit tag',
    yaml: 'id: x\nwhen: !!timestamp 2026-08-23',
    warns: 'tag',
    survives: { id: 'x' },
  },
  {
    name: 'complex key',
    yaml: 'id: x\n? [a, b]\n: c',
    warns: 'complex key',
    survives: { id: 'x' },
  },
  {
    name: 'nesting beyond one level',
    yaml: 'id: x\na:\n  b:\n    c: d',
    warns: 'nesting',
    survives: { id: 'x' },
  },
];

/** Every construct name engram claims, for docs and for `doctor`'s remedy text. */
export function subsetNames(): string[] {
  return SUBSET.map((s) => s.name);
}

/** Every construct name engram explicitly refuses. */
export function excludedNames(): string[] {
  return EXCLUDED.map((s) => s.name);
}
