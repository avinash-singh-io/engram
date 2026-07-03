/** Link extraction + classification. See docs/okf-conformance.md §4. */

export interface MarkdownLink {
  text: string;
  target: string;
}

// [text](target) or [text](target "title") — target has no spaces.
const MD_LINK_RE = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const WIKILINK_RE = /\[\[[^\]]+\]\]/;

/** All standard markdown links in a body. */
export function extractMarkdownLinks(body: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  for (const m of body.matchAll(MD_LINK_RE)) {
    links.push({ text: m[1] ?? '', target: m[2] ?? '' });
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
