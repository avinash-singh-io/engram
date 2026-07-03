/**
 * Parse an OKF `index.md` (docs/okf-conformance.md §5 + ADR-0006) into sections
 * of bullets. Pure — no filesystem access. Tolerant of a flat or malformed
 * index: bullets outside any `## heading` land in the `''` section, non-bullet
 * lines are ignored.
 */

/** One bullet: `* [Title](/abs/target.md) - one-line description`. */
export interface IndexEntry {
  title: string;
  /** Link target as written (absolute bundle-relative, e.g. `/dir/x.md`). */
  target: string;
  description: string;
  /** The `## heading` this bullet appeared under (`''` if none). */
  section: string;
  /** `descent` links a child `index.md`/`_moc.md`; `concept` links a leaf. */
  kind: 'concept' | 'descent';
}

export interface ParsedIndex {
  /** `## ` heading texts in document order. */
  headings: string[];
  entries: IndexEntry[];
  concepts: IndexEntry[];
  descents: IndexEntry[];
}

// `* [text](target) - description` — target has no spaces; description optional.
const BULLET_RE = /^\s*[*-]\s+\[([^\]]*)\]\(([^)\s]+)\)(?:\s*[-–]\s*(.*))?\s*$/;
const HEADING_RE = /^\s*#{2,6}\s+(.*?)\s*$/;

/** True when a link target points at a child directory index or MOC. */
export function isDescentTarget(target: string): boolean {
  const path = (target.split('#')[0] ?? '').toLowerCase();
  return path.endsWith('/index.md') || path.endsWith('/_moc.md');
}

export function parseIndex(content: string): ParsedIndex {
  const headings: string[] = [];
  const entries: IndexEntry[] = [];
  let section = '';

  for (const rawLine of content.split('\n')) {
    const heading = HEADING_RE.exec(rawLine);
    if (heading) {
      section = (heading[1] ?? '').trim();
      headings.push(section);
      continue;
    }
    const bullet = BULLET_RE.exec(rawLine);
    if (!bullet) continue;
    const title = (bullet[1] ?? '').trim();
    const target = (bullet[2] ?? '').trim();
    const description = (bullet[3] ?? '').trim();
    entries.push({
      title,
      target,
      description,
      section,
      kind: isDescentTarget(target) ? 'descent' : 'concept',
    });
  }

  return {
    headings,
    entries,
    concepts: entries.filter((e) => e.kind === 'concept'),
    descents: entries.filter((e) => e.kind === 'descent'),
  };
}
