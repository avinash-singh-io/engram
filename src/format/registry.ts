/**
 * Codec registry — detect `okf_version`, select the codec, normalise into
 * `core/model.ts` (ADR-0032).
 *
 * **Adding a spec version is adding a file.** Codecs register themselves here;
 * nothing in this module knows what any particular version looks like, and
 * nothing above it sees OKF-shaped data.
 */

import type { Edge, Node } from '../core/model.js';
import { OKF_V0_1 } from './okf-v0_1.js';
import { OKF_V0_2 } from './okf-v0_2.js';

export interface ParsedFrontmatter {
  /** Whether a `---` delimited block was present at all. */
  hasFrontmatter: boolean;
  /** The parsed mapping, or `null` when absent or unparseable. */
  frontmatter: Record<string, unknown> | null;
  /** Everything after the block. */
  body: string;
  /** Set when a block was present but its YAML did not parse. */
  yamlError?: string;
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
    return { hasFrontmatter: false, frontmatter: null, body: text };
  }

  const close = lines.findIndex((l, i) => i > 0 && DELIM.test(l));
  if (close === -1) {
    // An unterminated block is malformed, not absent — say so rather than throw.
    return {
      hasFrontmatter: true,
      frontmatter: null,
      body: '',
      yamlError: 'unterminated frontmatter block',
    };
  }

  const yaml = lines.slice(1, close).join('\n');
  const body = lines.slice(close + 1).join('\n');

  try {
    const parsed = parseSimpleYaml(yaml);
    return { hasFrontmatter: true, frontmatter: parsed, body };
  } catch (e) {
    return {
      hasFrontmatter: true,
      frontmatter: null,
      body,
      yamlError: e instanceof Error ? e.message : String(e),
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
  for (const line of yaml.split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    const at = line.indexOf(':');
    if (at === -1) throw new Error(`not a key: value pair: ${line}`);
    const key = line.slice(0, at).trim();
    out[key] = parseScalar(line.slice(at + 1).trim());
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
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length > 1) ||
    (v.startsWith("'") && v.endsWith("'") && v.length > 1)
  ) {
    return v.slice(1, -1);
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  return v;
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
