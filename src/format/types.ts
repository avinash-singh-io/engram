/** Format-core shared types. See docs/okf-conformance.md for the contract. */

export type IssueSeverity = 'error' | 'warning';

/** A single conformance finding. `code` is stable and locked (Rule 11). */
export interface Issue {
  code: string;
  message: string;
  field?: string;
}

/** Result of validating one concept file. `ok` is false iff any error exists. */
export interface ValidationResult {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
}

/** Result of splitting a file into frontmatter + body. */
export interface ParsedConcept {
  /** True when a delimited `---` frontmatter block was found. */
  hasFrontmatter: boolean;
  /** Parsed mapping, or null when the block is absent or not valid YAML. */
  frontmatter: Record<string, unknown> | null;
  /** Everything after the closing `---`. */
  body: string;
  /** Set when frontmatter was present but could not be parsed as a mapping. */
  yamlError?: string;
}
