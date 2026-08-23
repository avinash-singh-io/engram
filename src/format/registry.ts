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

  try {
    const parsed = parseSimpleYaml(yaml);
    return { hasFrontmatter: true, frontmatter: parsed, body, keyErrors: [], styles: {} };
  } catch (e) {
    return {
      hasFrontmatter: true,
      frontmatter: null,
      body,
      yamlError: e instanceof Error ? e.message : String(e),
      keyErrors: [],
      styles: {},
    };
  }
}

/**
 * A deliberately small YAML subset: scalars, inline lists, and inline maps.
 *
 * OKF frontmatter is flat by design (ADR-0020), so a full YAML engine would be a
 * dependency carrying far more surface than the format uses. Anything outside
 * the subset raises, and `parseFrontmatter` turns that into a `yamlError` rather
 * than letting it escape.
 */
function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  const meaningful = (l: string): boolean => l.trim() !== '' && !l.trimStart().startsWith('#');

  /** The nested map currently open, or null when the last key was a scalar. */
  let nested: Record<string, unknown> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!meaningful(line)) continue;

    const at = line.indexOf(':');
    if (at === -1) throw new Error(`not a key: value pair: ${line}`);
    const key = line.slice(0, at).trim();
    const value = line.slice(at + 1).trim();

    if (/^\s/.test(line)) {
      // An indented pair used to be flattened into the top level, so
      // `metadata:` followed by indented keys silently produced top-level keys
      // and a null `metadata`. Skills need one level of nesting — the Agent
      // Skills standard puts every tool-specific field under `metadata` — and
      // reading it wrong is worse than refusing it.
      if (nested === null) throw new Error(`indented key with no parent: ${line.trim()}`);
      nested[key] = parseScalar(value);
      continue;
    }

    if (value !== '') {
      nested = null;
      out[key] = parseScalar(value);
      continue;
    }

    // `key:` with nothing after it is either an empty scalar or the head of a
    // nested block, and only the next meaningful line can say which. Looking
    // ahead keeps `aliases:` reading as null exactly as it always has —
    // this extension is a strict superset for any flat document.
    const next = lines.slice(i + 1).find(meaningful);
    if (next !== undefined && /^\s/.test(next)) {
      nested = {};
      out[key] = nested;
    } else {
      nested = null;
      out[key] = null;
    }
  }
  return out;
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
