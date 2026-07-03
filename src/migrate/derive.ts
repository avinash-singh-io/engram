/** Deterministic, best-effort OKF frontmatter derivation for existing notes. */

export interface DeriveOptions {
  /** OKF type for migrated notes (default: Reference). */
  type?: string;
}

function humanizeFilename(relPath: string): string {
  const base = relPath.split('/').pop() ?? relPath;
  return base.replace(/\.md$/i, '').replace(/[-_]+/g, ' ').trim() || base;
}

function firstHeading(body: string): string | null {
  const m = body.match(/^#{1,6}\s+(.+?)\s*$/m);
  return m ? m[1].trim() : null;
}

/** First prose sentence, markdown stripped, capped to a single sentence. */
export function firstSentence(body: string): string {
  for (const raw of body.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line === '---' || line.startsWith('>')) continue;
    const text = line
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(
        /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
        (_m, t: string, a?: string) => a ?? t,
      )
      .replace(/[*_`#]/g, '')
      .trim();
    if (!text) continue;
    const sentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? text;
    let out = sentence.length > 160 ? `${sentence.slice(0, 157).trimEnd()}…` : sentence;
    if (!/[.!?…]$/.test(out)) out += '.';
    return out;
  }
  return 'Imported note.';
}

/** Directory path segments → deduped slug tags. */
export function tagsFromPath(relPath: string): string[] {
  const slugs = relPath
    .split('/')
    .slice(0, -1)
    .map((d) =>
      d
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter(Boolean);
  return [...new Set(slugs)];
}

/**
 * Derive an OKF frontmatter mapping for a note from its path + body + mtime:
 * title from the first heading (else filename), description from the first
 * sentence, tags from the folder path, timestamp from mtime.
 */
export function deriveFrontmatter(
  relPath: string,
  body: string,
  mtime: Date,
  opts: DeriveOptions = {},
): Record<string, unknown> {
  return {
    type: opts.type ?? 'Reference',
    title: firstHeading(body) ?? humanizeFilename(relPath),
    description: firstSentence(body),
    tags: tagsFromPath(relPath),
    timestamp: mtime.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
}
