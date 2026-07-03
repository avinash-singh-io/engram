/** Pure index.md rendering. See docs/okf-conformance.md §5 + ADR-0006. */

export interface IndexConcept {
  title: string;
  /** Absolute-bundle-relative link, e.g. /system-design/x.md */
  path: string;
  description: string;
  id: string;
}

export interface IndexChild {
  name: string;
  /** Absolute-bundle-relative link to the child directory's index.md */
  link: string;
  count: number;
}

export interface GenerateIndexInput {
  concepts: IndexConcept[];
  children: IndexChild[];
  isRoot: boolean;
  okfVersion?: string;
  dirLabel: string;
}

function byTitleThenId(a: IndexConcept, b: IndexConcept): number {
  const t = a.title.localeCompare(b.title, 'en');
  return t !== 0 ? t : a.id.localeCompare(b.id, 'en');
}

const oneLine = (s: string): string => s.replace(/\s+/g, ' ').trim();

/**
 * Render one directory's index.md deterministically. Root carries an
 * `okf_version` frontmatter; every directory links its child-directory indexes
 * (the descent edges Phase 2 navigation relies on). Idempotent: same input →
 * byte-identical output (LF, stable sort, single trailing newline).
 */
export function generateIndex(input: GenerateIndexInput): string {
  const { concepts, children, isRoot, okfVersion, dirLabel } = input;
  const lines: string[] = [];

  if (isRoot && okfVersion) {
    lines.push('---', `okf_version: ${okfVersion}`, '---', '');
  }
  lines.push(`# ${oneLine(dirLabel)}`, '');

  const sortedConcepts = [...concepts].sort(byTitleThenId);
  if (sortedConcepts.length > 0) {
    lines.push('## Concepts', '');
    for (const c of sortedConcepts) {
      lines.push(`* [${oneLine(c.title)}](${c.path}) - ${oneLine(c.description)}`);
    }
    lines.push('');
  }

  const sortedChildren = [...children].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  if (sortedChildren.length > 0) {
    lines.push('## Sections', '');
    for (const k of sortedChildren) {
      lines.push(`* [${k.name}/](${k.link}) - ${k.count} concept${k.count === 1 ? '' : 's'}`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}
