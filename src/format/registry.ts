/**
 * Codec registry — detect `okf_version`, select the codec, normalise into
 * `core/model.ts` (ADR-0032).
 *
 * Adding a spec version is adding a file. Nothing above this module sees
 * OKF-shaped data.
 *
 * SIGNATURES ONLY — behaviour is written test-first in Group 3.
 */

const NOT_YET = 'format/registry: not implemented — Group 3 (TDD)';

export interface ParsedFrontmatter {
  /** Whether a `---` delimited block was present at all. */
  hasFrontmatter: boolean;
  /** The parsed mapping, or `null` when absent or unparseable. */
  frontmatter: Record<string, unknown> | null;
  /** Everything after the block. */
  body: string;
  /** Set when a block was present but its YAML did not parse. */
  yamlError?: string;
}

/**
 * Split a file into its frontmatter mapping and body.
 *
 * **Total by contract — never throws.** Malformed YAML yields
 * `frontmatter: null` plus `yamlError`; a missing block yields
 * `hasFrontmatter: false`. This is what makes ADR-0026's "capture never
 * rejects" honourable upstream: a parser that throws makes it impossible.
 * Tolerates CRLF and a leading BOM, both of which occur in real vaults and
 * neither of which is an error condition.
 */
export function parseFrontmatter(_raw: string): ParsedFrontmatter {
  throw new Error(NOT_YET);
}
