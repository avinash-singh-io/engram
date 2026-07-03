import { Document, isSeq } from 'yaml';

/**
 * Serialize a frontmatter mapping to YAML text — the inverse of the parse in
 * `parseFrontmatter`. `tags` is rendered flow-style (`tags: [a, b]`) to match
 * the OKF fixture/Obsidian convention; long values are not line-wrapped so a
 * one-sentence `description` stays on one line.
 */
export function serializeFrontmatter(frontmatter: Record<string, unknown>): string {
  const doc = new Document(frontmatter);
  const tags = doc.get('tags', true);
  if (isSeq(tags)) tags.flow = true;
  // yaml renders flow seqs padded (`[ a, b ]`); normalize to the OKF fixture
  // convention (`[a, b]`). Tags are slugs with no internal `[`/`]`, so safe.
  return doc
    .toString({ lineWidth: 0 })
    .trimEnd()
    .replace(/^(tags:) \[ (.*) \]$/m, '$1 [$2]');
}

/**
 * Serialize a full concept file: `---` + frontmatter + `---` + body. Round-trips
 * with `parseFrontmatter` (frontmatter deep-equal; body equal after trim).
 */
export function serializeConcept(frontmatter: Record<string, unknown>, body = ''): string {
  const fm = serializeFrontmatter(frontmatter);
  const trimmed = (body ?? '').trim();
  return trimmed ? `---\n${fm}\n---\n\n${trimmed}\n` : `---\n${fm}\n---\n`;
}
