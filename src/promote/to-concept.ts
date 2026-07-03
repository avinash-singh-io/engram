import { serializeConcept } from '../format/serialize';
import type { MomentumArtifact } from './parse-momentum';

/**
 * Map a parsed momentum artifact to an OKF concept (frontmatter + body). The
 * mapping is total and defensive: every ERROR-path field (`description`, `tags`,
 * `timestamp`) is guaranteed non-empty/parseable so the downstream
 * `validateConcept` gate fails only on genuinely un-promotable input.
 */

export interface ToConceptOptions {
  /** Overrides `type` (default `Reference`). */
  type?: string;
  /** Overrides the derived one-sentence `description`. */
  description?: string;
  /** Extra tags merged ahead of the derived `momentum`/kind tags. */
  tags?: string[];
  /** Vault directory the concept will live in (drives relative-link rewrite). */
  targetDir: string;
  /** Original momentum file path — the provenance link target. */
  sourcePath: string;
  /** Injectable clock for deterministic timestamps. */
  now?: Date;
}

export interface RenderedConcept {
  frontmatter: Record<string, unknown>;
  body: string;
  /** Serialized concept file text (frontmatter + body). */
  text: string;
  title: string;
  description: string;
}

/** kebab-case slug for a tag or filename stem. */
function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'note'
  );
}

/** Strip inline markdown so a description is clean prose. */
function stripInline(s: string): string {
  return s
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, a, b) => (b ?? a) as string)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>|]/g, '')
    .trim();
}

/** First sentence of a block of text (cleaned), or '' when empty. */
function firstSentence(text: string): string {
  const plain = stripInline(text).replace(/\s+/g, ' ').trim();
  if (!plain) return '';
  const m = plain.match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : plain).trim();
}

/** Derive the load-bearing one-sentence description (ADR-0005/0006). */
function deriveDescription(artifact: MomentumArtifact, override?: string): string {
  const chosen = override?.trim() || firstSentence(artifact.decision ?? artifact.detail ?? '');
  return chosen || artifact.title.trim() || 'Promoted momentum artifact.';
}

/** Build a never-empty, deduped tag list: extra + topics + `momentum` + kind. */
function buildTags(artifact: MomentumArtifact, extra: string[] = []): string[] {
  const seeds = [...extra, ...artifact.topics, 'momentum', artifact.kind];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const seed of seeds) {
    const tag = slug(seed);
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }
  return out.length ? out : ['momentum', artifact.kind];
}

/** Map an ADR date (or now) to an ISO-8601 UTC timestamp. */
function toTimestamp(date: string | undefined, now: Date): string {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return `${date}T00:00:00Z`;
  if (date && !Number.isNaN(Date.parse(date))) return new Date(date).toISOString().replace(/\.\d{3}Z$/, 'Z');
  return now.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function splitFragment(target: string): [string, string] {
  const i = target.indexOf('#');
  return i === -1 ? [target, ''] : [target.slice(0, i), target.slice(i)];
}

/**
 * Rewrite links to OKF standard form (ADR-0003):
 * - wikilinks `[[T]]` / `[[T|Label]]` → `[Label](/slug.md)`;
 * - internal relative `.md` links → vault-relative `/targetDir/basename.md`
 *   (cross-ADR references resolve to promoted siblings; broken-link-tolerant,
 *   NFR-5);
 * external URLs and already-absolute links are left untouched.
 */
export function rewriteLinks(md: string, targetDir: string): string {
  const wikified = md.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_m, target: string, label?: string) => `[${(label ?? target).trim()}](/${slug(target.trim())}.md)`,
  );
  return wikified.replace(
    /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (match, text: string, target: string) => {
      if (/^[a-z]+:\/\//i.test(target)) return match; // external URL
      const [pathPart, fragment] = splitFragment(target);
      if (!pathPart.toLowerCase().endsWith('.md')) return match; // not an internal doc link
      if (pathPart.startsWith('/')) return match; // already absolute bundle-relative
      const base = pathPart.split('/').pop() ?? pathPart;
      return `[${text}](/${targetDir}/${base}${fragment})`;
    },
  );
}

/** Absolute-bundle-relative link for an absolute source path; else left as-is. */
function sourceLink(sourcePath: string): string {
  return sourcePath.startsWith('/') ? sourcePath : `/${sourcePath.replace(/^\.\//, '')}`;
}

/** Render the ADR sections (or learning detail) as a re-leveled `#` body. */
function renderBody(artifact: MomentumArtifact, targetDir: string): string {
  const blocks: string[] = [];
  if (artifact.kind === 'adr') {
    for (const section of artifact.sections) {
      const body = rewriteLinks(section.body, targetDir).trim();
      blocks.push(`# ${section.heading}\n\n${body}`.trim());
    }
  } else if (artifact.detail) {
    blocks.push(`# Detail\n\n${rewriteLinks(artifact.detail, targetDir).trim()}`);
  }
  if (blocks.length === 0) {
    blocks.push(`# Summary\n\n${rewriteLinks(artifact.title, targetDir)}`);
  }
  return blocks.join('\n\n');
}

/** Provenance block: a one-way, point-in-time link back to the momentum source. */
function sourceBlock(artifact: MomentumArtifact, sourcePath: string): string {
  const base = sourcePath.split('/').pop() ?? sourcePath;
  const link = sourceLink(sourcePath);
  const when = artifact.date ? ` (${artifact.date})` : '';
  return [
    '# Source',
    '',
    `Promoted from momentum ${artifact.sourceRef}${when} — [${base}](${link}).`,
    '',
    'One-way, point-in-time snapshot. Engram does not sync changes back to momentum;',
    're-run `engram promote` to refresh from the source.',
  ].join('\n');
}

/** Map a parsed artifact + options to a rendered, serialized OKF concept. */
export function toConcept(artifact: MomentumArtifact, opts: ToConceptOptions): RenderedConcept {
  const now = opts.now ?? new Date();
  const description = deriveDescription(artifact, opts.description);
  const frontmatter: Record<string, unknown> = {
    type: opts.type?.trim() || 'Reference',
    title: artifact.title,
    description,
    tags: buildTags(artifact, opts.tags),
    timestamp: toTimestamp(artifact.date, now),
  };
  const body = `${renderBody(artifact, opts.targetDir)}\n\n${sourceBlock(artifact, opts.sourcePath)}`;
  return {
    frontmatter,
    body,
    text: serializeConcept(frontmatter, body),
    title: artifact.title,
    description,
  };
}
