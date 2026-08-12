/**
 * Markdown link targets — encoding, decoding, extraction.
 *
 * Lives in `format/` because it is a serialization concern: the internal model
 * holds a filesystem-true path, and only the written markdown needs a
 * CommonMark-safe destination (ADR-0003, ADR-0032).
 *
 * Behaviour is BUG-001's, shipped in v0.6.5 and rescued into
 * `tests/format/links.test.ts` during the Phase 8 sweep.
 */

export interface MarkdownLink {
  /** Link text as authored. */
  text: string;
  /** Filesystem-true (decoded) destination. */
  target: string;
}

/**
 * Characters that actually break a bare CommonMark destination (§6.3).
 *
 * Deliberately minimal. `&`, `+`, `—` and friends parse fine and stay readable —
 * a destination a human cannot read is its own defect, so blanket
 * `encodeURIComponent` is the wrong tool here.
 */
const MUST_ENCODE = new Set([' ', '(', ')', '<', '>']);

/** Anything with a URI scheme belongs to the wider web, not to the vault. */
const EXTERNAL = /^[a-z][a-z0-9+.-]*:/i;

const isHex = (c: string | undefined): boolean => c !== undefined && /^[0-9A-Fa-f]$/.test(c);

const hex = (ch: string): string =>
  [...Buffer.from(ch, 'utf8')]
    .map((b) => `%${b.toString(16).toUpperCase().padStart(2, '0')}`)
    .join('');

/**
 * Percent-encode a link destination so it is a legal bare CommonMark
 * destination, while leaving characters that do not break parsing readable.
 *
 * Idempotent: an existing well-formed `%XX` escape is passed through untouched,
 * so `encode(encode(x)) === encode(x)`. A lone `%` that does not begin a valid
 * escape *is* encoded, which is what makes decoding well-defined.
 *
 * `/` is never encoded, so this is per-segment by construction. The path and any
 * `#fragment` are encoded independently.
 */
export function encodeLinkTarget(raw: string): string {
  if (EXTERNAL.test(raw)) return raw;

  const hashAt = raw.indexOf('#');
  if (hashAt !== -1) {
    return `${encodeLinkTarget(raw.slice(0, hashAt))}#${encodeLinkTarget(raw.slice(hashAt + 1))}`;
  }

  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch === '%') {
      // Already a well-formed escape — pass it through rather than double-encode.
      if (isHex(raw[i + 1]) && isHex(raw[i + 2])) {
        out += raw.slice(i, i + 3);
        i += 2;
      } else {
        out += '%25';
      }
      continue;
    }
    const code = ch.codePointAt(0)!;
    out += MUST_ENCODE.has(ch) || code < 0x20 || code === 0x7f ? hex(ch) : ch;
  }
  return out;
}

/**
 * Inverse of {@link encodeLinkTarget}.
 *
 * Total: a malformed percent-escape is returned verbatim rather than throwing,
 * because a link someone hand-edited badly should still render, not crash a read.
 */
export function decodeLinkTarget(target: string): string {
  if (EXTERNAL.test(target)) return target;

  const bytes: number[] = [];
  for (let i = 0; i < target.length; i++) {
    const ch = target[i]!;
    if (ch === '%' && isHex(target[i + 1]) && isHex(target[i + 2])) {
      bytes.push(parseInt(target.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(...Buffer.from(ch, 'utf8'));
    }
  }
  return Buffer.from(bytes).toString('utf8');
}

/** `[text](target)`, with targets decoded to their filesystem-true form. */
export function extractMarkdownLinks(markdown: string): MarkdownLink[] {
  const out: MarkdownLink[] = [];
  const pattern = /\[([^\]]*)\]\(([^)\s]*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(markdown)) !== null) {
    out.push({ text: m[1]!, target: decodeLinkTarget(m[2]!) });
  }
  return out;
}
