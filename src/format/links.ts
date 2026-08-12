/**
 * Markdown link targets — encoding, decoding, extraction.
 *
 * Lives in `format/` because it is a serialization concern: the internal model
 * holds a filesystem-true path, and only the written markdown needs a
 * CommonMark-safe destination (ADR-0003, ADR-0032).
 *
 * SIGNATURES ONLY — behaviour is written test-first in Group 3 against the
 * rescued BUG-001 matrix in `tests/format/links.test.ts`.
 */

const NOT_YET = 'format/links: not implemented — Group 3 (TDD)';

export interface MarkdownLink {
  /** Link text as authored. */
  text: string;
  /** Filesystem-true (decoded) destination. */
  target: string;
}

/**
 * Percent-encode a link destination so it is a legal bare CommonMark
 * destination, while leaving characters that do not break parsing readable.
 * Idempotent: encoding an already-encoded target is a no-op.
 */
export function encodeLinkTarget(_raw: string): string {
  throw new Error(NOT_YET);
}

/**
 * Inverse of {@link encodeLinkTarget}. Total: a malformed percent-escape is
 * returned verbatim rather than throwing.
 */
export function decodeLinkTarget(_target: string): string {
  throw new Error(NOT_YET);
}

/** Extract markdown links, returning filesystem-true (decoded) targets. */
export function extractMarkdownLinks(_markdown: string): MarkdownLink[] {
  throw new Error(NOT_YET);
}
