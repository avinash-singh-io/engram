import { parse as parseYaml } from 'yaml';
import type { ParsedConcept } from './types';

// Opening `---`, non-greedy YAML, closing `---` line, optional body.
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---[ \t]*(?:\n([\s\S]*))?$/;

const BOM = 0xfeff;

/**
 * Split a file into its YAML frontmatter mapping and markdown body.
 * Tolerant of a BOM and CRLF line endings. Never throws — YAML errors are
 * surfaced via `frontmatter: null` + `yamlError`.
 */
export function parseFrontmatter(input: string): ParsedConcept {
  const withoutBom = input.charCodeAt(0) === BOM ? input.slice(1) : input;
  const text = withoutBom.replace(/\r\n/g, '\n');
  const match = FRONTMATTER_RE.exec(text);

  if (!match) {
    return { hasFrontmatter: false, frontmatter: null, body: text };
  }

  const yamlText = match[1] ?? '';
  const body = match[2] ?? '';

  try {
    const parsed: unknown = parseYaml(yamlText);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        hasFrontmatter: true,
        frontmatter: null,
        body,
        yamlError: 'Frontmatter is not a YAML mapping.',
      };
    }
    return { hasFrontmatter: true, frontmatter: parsed as Record<string, unknown>, body };
  } catch (err) {
    return {
      hasFrontmatter: true,
      frontmatter: null,
      body,
      yamlError: err instanceof Error ? err.message : String(err),
    };
  }
}
