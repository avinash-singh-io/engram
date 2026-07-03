/**
 * Link extraction + classification, and CommonMark-safe target encoding.
 * See docs/okf-conformance.md §4 and the CommonMark spec §6.3 (a bare link
 * destination "does not include ASCII control characters or space").
 *
 * Invariant (BUG-001): in-memory link targets are always percent-DECODED
 * (filesystem-true, human-readable). Encoding happens only when a destination
 * is written into a markdown file or emitted to stdout — see encodeLinkTarget.
 */

export interface MarkdownLink {
  text: string;
  /** Destination, percent-DECODED for filesystem/link matching (see decodeLinkTarget). */
  target: string;
}

// [text](target) or [text](target "title") — a bare destination has no spaces.
const MD_LINK_RE = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const WIKILINK_RE = /\[\[[^\]]+\]\]/;
// Scheme-qualified URL (http://, https://, ftp://…). Left untouched by en/decode.
const EXTERNAL_URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i;

function splitFragment(target: string): [string, string | null] {
  const i = target.indexOf('#');
  return i === -1 ? [target, null] : [target.slice(0, i), target.slice(i + 1)];
}

function safeDecode(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part; // malformed escape (e.g. a literal '%') — leave verbatim
  }
}

/**
 * Percent-encode exactly the characters that break a bare CommonMark link
 * destination or a decodeURIComponent round-trip: `%` (so decoding is
 * well-defined), the `()` a bare destination must keep balanced, and ASCII
 * whitespace + C0 control chars + DEL. Everything else — unicode, `&`, `+`,
 * `—`, `,` — is left readable (encoding it is optional and hurts source
 * legibility). All targeted chars are single-byte ASCII.
 */
function encodeSegment(segment: string): string {
  let out = '';
  for (const ch of segment) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === '%' || ch === '(' || ch === ')' || code <= 0x20 || code === 0x7f) {
      out += `%${code.toString(16).toUpperCase().padStart(2, '0')}`;
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Percent-DECODE a link destination for filesystem/link matching. Each path
 * segment and any `#fragment` are decoded independently; malformed escapes are
 * left verbatim; external URLs pass through unchanged. Inverse of
 * {@link encodeLinkTarget}.
 */
export function decodeLinkTarget(target: string): string {
  if (EXTERNAL_URL_RE.test(target)) return target;
  const [path, fragment] = splitFragment(target);
  const decodedPath = path.split('/').map(safeDecode).join('/');
  return fragment === null ? decodedPath : `${decodedPath}#${safeDecode(fragment)}`;
}

/**
 * Percent-ENCODE a link destination so it is a valid CommonMark bare
 * destination (§6.3). Encodes each path segment independently so `/`
 * separators survive, and the `#fragment` separately from the path.
 * Idempotent: the target is decoded first, so an already-encoded input never
 * double-encodes (`%20` stays `%20`, never `%2520`). External URLs pass
 * through unchanged. Round-trips: decodeLinkTarget(encodeLinkTarget(p)) === p.
 */
export function encodeLinkTarget(target: string): string {
  if (EXTERNAL_URL_RE.test(target)) return target;
  const [path, fragment] = splitFragment(decodeLinkTarget(target));
  const encodedPath = path.split('/').map(encodeSegment).join('/');
  return fragment === null ? encodedPath : `${encodedPath}#${encodeSegment(fragment)}`;
}

/** All standard markdown links in a body. Targets are decoded (see the invariant). */
export function extractMarkdownLinks(body: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  for (const m of body.matchAll(MD_LINK_RE)) {
    links.push({ text: m[1] ?? '', target: decodeLinkTarget(m[2] ?? '') });
  }
  return links;
}

/** True if the body contains any `[[wikilink]]` syntax. */
export function containsWikilink(body: string): boolean {
  return WIKILINK_RE.test(body);
}

/** True for a link that points at an internal `.md` file (not an external URL). */
export function isInternalMarkdownLink(target: string): boolean {
  if (/^[a-z]+:\/\//i.test(target)) return false; // http(s):// etc.
  const pathPart = target.split('#')[0] ?? '';
  return pathPart.toLowerCase().endsWith('.md');
}
