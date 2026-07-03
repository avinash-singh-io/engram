/** Convert Obsidian `[[wikilinks]]` to standard, absolute markdown links. */

export interface WikilinkConversion {
  from: string;
  to: string;
  /** True if the target resolved to a real concept; false = best-guess path. */
  resolved: boolean;
}

/** Resolve a wikilink target to an absolute-bundle-relative path, or null. */
export type LinkResolver = (target: string) => string | null;

// [[Target]] | [[Target#heading]] | [[Target|Alias]]
const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;

function slugPath(target: string): string {
  const slug = target
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `/${slug}.md`;
}

export function convertWikilinks(
  body: string,
  resolve: LinkResolver,
): { body: string; conversions: WikilinkConversion[] } {
  const conversions: WikilinkConversion[] = [];
  const out = body.replace(WIKILINK_RE, (match, rawTarget: string, alias?: string) => {
    const target = rawTarget.trim();
    const label = (alias ?? target).trim();
    const resolvedPath = resolve(target);
    const link = resolvedPath ?? slugPath(target);
    const md = `[${label}](${link})`;
    conversions.push({ from: match, to: md, resolved: resolvedPath !== null });
    return md;
  });
  return { body: out, conversions };
}
