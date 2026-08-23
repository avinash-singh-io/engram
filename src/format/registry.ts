/**
 * Codec registry — detect `okf_version`, select the codec, normalise into
 * `core/model.ts` (ADR-0032).
 *
 * **Adding a spec version is adding a file.** Codecs register themselves here;
 * nothing in this module knows what any particular version looks like, and
 * nothing above it sees OKF-shaped data.
 */

import type { Edge, Node } from '../core/model.js';
import type { KeyError, SequenceStyle } from './subset.js';
import { OKF_V0_1 } from './okf-v0_1.js';
import { OKF_V0_2 } from './okf-v0_2.js';

export interface ParsedFrontmatter {
  /** Whether a `---` delimited block was present at all. */
  hasFrontmatter: boolean;
  /** The parsed mapping, or `null` when absent or unparseable. */
  frontmatter: Record<string, unknown> | null;
  /** Everything after the block. */
  body: string;
  /**
   * Set only when the block was **wholly** unreadable — an unterminated block, or
   * nothing parsed at all. A document with some readable keys reports those keys and
   * lists the rest in `keyErrors` (ADR-0047 §2).
   */
  yamlError?: string;
  /**
   * Keys that could not be read, each named.
   *
   * The unit of failure is the key. Before ADR-0047 a single unreadable line
   * discarded the whole mapping, so a formatting change Obsidian makes on its own
   * cost a note its `id` and dropped it to path-as-identity (BUG-011).
   */
  keyErrors: KeyError[];
  /**
   * How each sequence key was written, so a write can give back the same style.
   *
   * Without this engram rewrites block to flow and Obsidian re-normalises on the
   * next property edit — the two tools undoing each other forever in what is usually
   * also a git repository.
   */
  styles: Record<string, SequenceStyle>;
}

/** What a read produced, plus anything the codec could not faithfully represent. */
export interface ReadResult {
  node: Node;
  edges: Edge[];
  /** Lossy warnings — codec-level, never a reason to fail a read. */
  warnings: string[];
}

/** One serialization of the model. One file per spec version, additive. */
export interface Codec {
  /** The `okf_version` this codec speaks. */
  version: string;
  read(parsed: ParsedFrontmatter, path: string): ReadResult;
  write(node: Node, edges: Edge[]): { content: string; warnings: string[] };
}

const CODECS = new Map<string, Codec>();

/** Register a codec. Adding a version calls this and changes nothing else. */
export function registerCodec(codec: Codec): void {
  CODECS.set(codec.version, codec);
}

export function knownVersions(): string[] {
  return [...CODECS.keys()].sort();
}

registerCodec(OKF_V0_1);
registerCodec(OKF_V0_2);

/** The version assumed when a file declares none — the older, laxer one. */
export const DEFAULT_VERSION = OKF_V0_1.version;

/** The version written when nothing pins the vault to an older one. */
export const CURRENT_VERSION = OKF_V0_2.version;

const BOM = '﻿';
interface YamlResult {
  map: Record<string, unknown>;
  keyErrors: KeyError[];
  styles: Record<string, SequenceStyle>;
}

const DELIM = /^---[ \t]*$/;

/**
 * Split a file into its frontmatter mapping and body.
 *
 * **Total by contract — never throws.** Malformed YAML yields
 * `frontmatter: null` plus `yamlError`; a missing block yields
 * `hasFrontmatter: false`. This is what makes ADR-0026's "capture never
 * rejects" honourable upstream: a parser that throws makes it impossible.
 * Tolerates CRLF and a leading BOM, both of which occur in real vaults and
 * neither of which is an error condition.
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const text = (raw.startsWith(BOM) ? raw.slice(BOM.length) : raw).replace(/\r\n/g, '\n');
  const lines = text.split('\n');

  if (lines[0] === undefined || !DELIM.test(lines[0])) {
    return {
      hasFrontmatter: false,
      frontmatter: null,
      body: withoutTrailingNewline(text),
      keyErrors: [],
      styles: {},
    };
  }

  const close = lines.findIndex((l, i) => i > 0 && DELIM.test(l));
  if (close === -1) {
    // An unterminated block is malformed, not absent — say so rather than throw.
    return {
      hasFrontmatter: true,
      frontmatter: null,
      body: '',
      yamlError: 'unterminated frontmatter block',
      keyErrors: [],
      styles: {},
    };
  }

  const yaml = lines.slice(1, close).join('\n');
  const body = withoutTrailingNewline(lines.slice(close + 1).join('\n'));

  const { map, keyErrors, styles } = parseSimpleYaml(yaml);

  // A null mapping now means **wholly** unreadable — nothing parsed at all. A
  // document with even one readable key returns that key, because the alternative
  // is what BUG-011 was: one bad line costing a note its identity.
  if (Object.keys(map).length === 0 && keyErrors.length > 0) {
    return {
      hasFrontmatter: true,
      frontmatter: null,
      body,
      yamlError: keyErrors.map((k) => k.reason).join('; '),
      keyErrors,
      styles,
    };
  }

  return { hasFrontmatter: true, frontmatter: map, body, keyErrors, styles };
}

/**
 * A deliberately small YAML subset — stated in `subset.ts`, not implied here.
 *
 * **Never throws, and never fails a whole document for one bad line** (ADR-0047 §2).
 * A key it cannot read is omitted and recorded in `keyErrors`; every other key on
 * every other line is returned exactly as if the bad line were not there.
 *
 * That asymmetry is the whole point. Before this, one unreadable line returned
 * `null` for the entire mapping, both codecs opened with `parsed.frontmatter ?? {}`,
 * and a note lost its `id` — falling back to path-as-identity, so moving the file
 * broke every relation pointing at it (BUG-011). The trigger was Obsidian rewriting
 * `part-of: [a]` into a block sequence when its owner edited an unrelated property.
 * Losing identity must never be the default response to a formatting variation.
 */
function parseSimpleYaml(yaml: string): YamlResult {
  const out: Record<string, unknown> = {};
  const keyErrors: KeyError[] = [];
  const styles: Record<string, SequenceStyle> = {};
  const lines = yaml.split('\n');
  const meaningful = (l: string): boolean => l.trim() !== '' && !l.trimStart().startsWith('#');

  /** The nested map currently open, and the key that opened it. */
  let nested: Record<string, unknown> | null = null;
  let nestedKey: string | null = null;
  /** The indent of the open nested block, so a deeper one can be refused. */
  let nestedIndent = -1;
  /** True between the two halves of a complex key. */
  let complexKeyOpen = false;
  /** Keys whose nested block had a failure, so an empty husk is not left behind. */
  const spoiled = new Set<string>();

  const fail = (key: string, i: number, reason: string): void => {
    keyErrors.push({ key, line: i + 1, reason });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!meaningful(line)) continue;

    const indented = /^\s/.test(line);
    const at = line.indexOf(':');

    // A complex key (`? [a, b]` / `: c`) spans two lines. Reporting only the first
    // left the second to parse as a key of `''`, putting a garbage entry in the
    // mapping — a silent wrong answer beside a loud one.
    if (/^\?(\s|$)/.test(line.trim())) {
      fail(line.trim(), i, 'engram does not read a YAML complex key; this entry was skipped');
      complexKeyOpen = true;
      continue;
    }
    if (complexKeyOpen && /^:(\s|$)/.test(line.trim())) {
      complexKeyOpen = false;
      continue;
    }
    complexKeyOpen = false;

    if (at === -1) {
      // Attribute it to the block it belongs to when there is one, so the warning
      // names a key the reader recognises rather than a fragment of a line.
      const owner = indented && nestedKey !== null ? nestedKey : line.trim();
      if (indented && nestedKey !== null) spoiled.add(nestedKey);
      fail(owner, i, `not a key: value pair: ${line.trim()}`);
      continue;
    }

    const key = line.slice(0, at).trim();
    const value = line.slice(at + 1).trim();

    if (indented) {
      if (nested === null) {
        fail(key, i, `indented key with no parent: ${line.trim()}`);
        continue;
      }
      // Deeper than the block that is open means a second level of nesting. It used
      // to be **flattened into the first**, producing a plausible and wrong mapping
      // — the same silent-hoist the Phase 17 look-ahead was added to stop, one level
      // further down. A wrong answer nobody is told about is the worst outcome here.
      if (indentOf(line) > nestedIndent) {
        spoiled.add(nestedKey!);
        fail(
          nestedKey ?? key,
          i,
          `engram reads one level of nesting; \`${key}\` is deeper and was skipped`,
        );
        continue;
      }
      const scalar = scalarOrError(value);
      if (typeof scalar === 'string') {
        spoiled.add(nestedKey!);
        fail(nestedKey ?? key, i, scalar);
        continue;
      }
      nested[key] = scalar.value;
      continue;
    }

    if (value !== '') {
      nested = null;
      nestedKey = null;

      // `key: |` and `key: >` open a multi-line scalar, so the value is on the lines
      // that follow rather than this one.
      if (/^[|>][-+]?\d*$/.test(value)) {
        const blk = readBlockScalar(lines, i + 1, value, indentOf(line));
        out[key] = blk.text;
        i = blk.next - 1;
        continue;
      }

      const excluded = excludedConstruct(value);
      if (excluded !== null) {
        fail(key, i, `engram does not read a YAML ${excluded}; this key was skipped`);
        continue;
      }

      const scalar = scalarOrError(value);
      if (typeof scalar === 'string') {
        fail(key, i, scalar);
        continue;
      }
      out[key] = scalar.value;
      if (value.startsWith('[')) styles[key] = 'flow';
      continue;
    }

    // `key:` with nothing after it is either an empty scalar or the head of a
    // nested block, and only the next meaningful line can say which. Looking
    // ahead keeps `aliases:` reading as null exactly as it always has.
    const next = lines.slice(i + 1).find(meaningful);

    // Sequence is checked **first**. Before ADR-0047 this branch saw an indented
    // next line and committed to a nested map, so the sequence item under it then
    // failed the key:value check — that is the precise shape of BUG-011, and it is
    // why the check order matters rather than being incidental.
    if (next !== undefined && isSequenceItem(next)) {
      const seq = readBlockSequence(lines, i + 1, meaningful);
      nested = null;
      nestedKey = null;
      for (const bad of seq.errors) fail(key, bad.line - 1, bad.reason);
      if (seq.items.length > 0 || seq.errors.length === 0) {
        out[key] = seq.items;
        styles[key] = 'block';
      }
      i = seq.next - 1;
      continue;
    }

    if (next !== undefined && /^\s/.test(next)) {
      nested = {};
      nestedKey = key;
      nestedIndent = indentOf(next);
      out[key] = nested;
    } else {
      nested = null;
      nestedKey = null;
      out[key] = null;
    }
  }

  // A nested block that failed is dropped whole, not left partially filled.
  //
  // `a: {}` reads as "declared and empty", and `a: { b: null }` — where `b` had
  // content engram could not read — reads as "b is empty". Both are quieter lies
  // than "could not be read", because they look complete and warn about nothing
  // downstream. The `keyError` says what happened; the mapping must not contradict
  // it. Sequences are different and keep their readable items, because there the
  // items are independent of each other.
  for (const key of spoiled) delete out[key];

  return { map: out, keyErrors, styles };
}

/**
 * The YAML constructs engram does not implement, recognised so they can be **named**
 * rather than silently misread (ADR-0047 §1, `EXCLUDED`).
 *
 * An anchor read as the literal string `"&anchor value"` is worse than a refusal: it
 * parses, so nothing warns, and the value is quietly wrong. Naming them costs one
 * regex and converts a silent corruption into a message.
 */
function excludedConstruct(v: string): string | null {
  if (v.startsWith('&')) return 'anchor';
  if (v.startsWith('*')) return 'alias';
  if (v.startsWith('!')) return 'tag';
  return null;
}

/** A line that opens or continues a block sequence: `- a`, or a bare `-`. */
function isSequenceItem(line: string): boolean {
  return /^-(\s|$)/.test(line.trim());
}

/** How far a line is indented, in characters. Tabs count as one, as YAML forbids them. */
function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

interface BlockSequence {
  items: unknown[];
  errors: { line: number; reason: string }[];
  /** Index of the first line after the sequence. */
  next: number;
}

/**
 * Read a block sequence starting at `from`.
 *
 * Accepts both the indented form Obsidian writes and the unindented form YAML also
 * permits, because a vault contains files written by more than one tool and refusing
 * either is how BUG-011 happened.
 */
function readBlockSequence(
  lines: string[],
  from: number,
  meaningful: (l: string) => boolean,
): BlockSequence {
  const items: unknown[] = [];
  const errors: { line: number; reason: string }[] = [];
  let i = from;

  for (; i < lines.length; i++) {
    const line = lines[i]!;
    if (!meaningful(line)) continue;
    if (!isSequenceItem(line)) break;

    const raw = line.trim().replace(/^-\s*/, '');
    if (raw === '') {
      // `-` with nothing after it is a null item, not an error.
      items.push(null);
      continue;
    }
    const scalar = scalarOrError(raw);
    if (typeof scalar === 'string') errors.push({ line: i + 1, reason: scalar });
    else items.push(scalar.value);
  }

  return { items, errors, next: i };
}

interface BlockScalar {
  text: string;
  next: number;
}

/**
 * Read a `|` or `>` block scalar.
 *
 * Deliberately partial, and ADR-0047 says so: engram clips trailing newlines in every
 * case, so `|` and `|-` agree. OKF has no field where a trailing blank line carries
 * meaning, and pretending to implement chomping precisely would be a worse promise
 * than a stated simplification.
 *
 * Blank lines and `#` are **content** inside a block scalar, never comments — which
 * is why this does its own scanning rather than reusing the caller's `meaningful`.
 */
function readBlockScalar(
  lines: string[],
  from: number,
  header: string,
  keyIndent: number,
): BlockScalar {
  const folded = header.startsWith('>');
  const collected: string[] = [];
  let i = from;

  for (; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === '') {
      collected.push('');
      continue;
    }
    if (indentOf(line) <= keyIndent) break;
    collected.push(line);
  }

  while (collected.length > 0 && collected[collected.length - 1] === '') collected.pop();

  const indents = collected.filter((l) => l.trim() !== '').map(indentOf);
  const strip = indents.length === 0 ? 0 : Math.min(...indents);
  const dedented = collected.map((l) => (l.trim() === '' ? '' : l.slice(strip)));

  return { text: folded ? foldLines(dedented) : dedented.join('\n'), next: i };
}

/** Folded style joins on spaces; a blank line is a real paragraph break. */
function foldLines(lines: string[]): string {
  const paragraphs: string[][] = [[]];
  for (const l of lines) {
    if (l === '') paragraphs.push([]);
    else paragraphs[paragraphs.length - 1]!.push(l);
  }
  return paragraphs
    .filter((p) => p.length > 0)
    .map((p) => p.join(' '))
    .join('\n\n');
}

/** `parseScalar`, with its throws turned into a reason string. */
function scalarOrError(v: string): { value: unknown } | string {
  try {
    return { value: parseScalar(v) };
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

function parseScalar(v: string): unknown {
  if (v === '') return null;
  if (v.startsWith('[')) {
    if (!v.endsWith(']')) throw new Error(`unclosed list: ${v}`);
    const inner = v.slice(1, -1).trim();
    return inner === '' ? [] : inner.split(',').map((s) => parseScalar(s.trim()));
  }
  if (v.startsWith('{')) {
    if (!v.endsWith('}')) throw new Error(`unclosed map: ${v}`);
    const inner = v.slice(1, -1).trim();
    if (inner === '') return {};
    const map: Record<string, unknown> = {};
    for (const pair of inner.split(',')) {
      const at = pair.indexOf(':');
      if (at === -1) throw new Error(`not a key: value pair: ${pair}`);
      map[pair.slice(0, at).trim()] = parseScalar(pair.slice(at + 1).trim());
    }
    return map;
  }
  if (v.startsWith('"') && v.endsWith('"') && v.length > 1) {
    // Unescape, so `yamlScalar` round-trips exactly. Without this a description
    // containing a quote comes back with the backslashes still in it.
    return v.slice(1, -1).replace(/\\(["\\])/g, '$1');
  }
  if (v.startsWith("'") && v.endsWith("'") && v.length > 1) {
    return v.slice(1, -1).replace(/''/g, "'");
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  return v;
}

/**
 * Serialize a scalar so a **real** YAML parser reads back what was written.
 *
 * OKF files are read only by engram, whose subset splits on the first colon and
 * therefore tolerates unquoted prose. A `SKILL.md` is read by Claude Code, the Gemini
 * CLI and anything else implementing the standard, so the same tolerance would be a
 * file that engram can read and nobody else can. Quotes only when it has to, because
 * an unquoted description is the one a human wants to edit.
 */
export function yamlScalar(value: string): string {
  const needsQuoting =
    value === '' ||
    value !== value.trim() ||
    /[:#\n\r\t]/.test(value) ||
    /^[-?*&!|>%@`[\]{},"']/.test(value) ||
    ['true', 'false', 'null', '~', 'yes', 'no', 'on', 'off'].includes(value.toLowerCase()) ||
    (value !== '' && Number.isFinite(Number(value)));
  if (!needsQuoting) return value;
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
}

/**
 * Every serialized file ends with exactly one newline.
 *
 * POSIX text files end with one, git reports "\ No newline at end of file" without
 * it, and an editor appending one turns a no-op into a diff. Centralised here so no
 * codec can forget.
 */
export function withTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`;
}

/**
 * Strip the single trailing newline the writer adds.
 *
 * The invariant: a body is held **without** a trailing newline, the writer appends
 * exactly one, and the reader removes exactly one. Without this, `read(write(x))`
 * grows a newline per cycle and the round-trip is no longer exact — which would
 * make every reindex a diff.
 */
function withoutTrailingNewline(body: string): string {
  return body.endsWith('\n') ? body.slice(0, -1) : body;
}

/** Which codec speaks for this file. Unknown or absent falls back, never throws. */
export function detectVersion(frontmatter: Record<string, unknown> | null): string {
  const declared = frontmatter?.okf_version;
  if (typeof declared === 'string' && CODECS.has(declared)) return declared;
  return DEFAULT_VERSION;
}

/**
 * Read a file into the internal model.
 *
 * Total: a file with no frontmatter, or unparseable frontmatter, still yields a
 * Node — an empty one if there is nothing else to say. Capture never rejects
 * (ADR-0026), and a read that throws would make that promise unkeepable.
 */
export function readNode(raw: string, path: string): ReadResult {
  const parsed = parseFrontmatter(raw);
  const codec = CODECS.get(detectVersion(parsed.frontmatter))!;
  const result = codec.read(parsed, path);
  if (parsed.yamlError !== undefined) {
    result.warnings.push(`frontmatter did not parse: ${parsed.yamlError}`);
  }
  // One warning per key, naming it. A single summary line was what made BUG-011 read
  // as a formatting nit: it said the frontmatter "did not parse" without saying which
  // key was lost or that identity had just been traded for a path.
  for (const e of parsed.keyErrors) {
    result.warnings.push(`frontmatter line ${e.line}, key \`${e.key}\`: ${e.reason}`);
  }
  return result;
}

/**
 * Write the model back out through a specific codec.
 *
 * Anything the target version cannot express is returned as a warning. A lossy
 * write is a codec-level fact, never a change to the core (ADR-0032).
 */
export function writeNode(
  node: Node,
  edges: Edge[],
  version: string = CURRENT_VERSION,
): { content: string; warnings: string[] } {
  const codec = CODECS.get(version);
  if (codec === undefined) {
    throw new Error(`no codec for okf_version ${version} — known: ${knownVersions().join(', ')}`);
  }
  return codec.write(node, edges);
}
