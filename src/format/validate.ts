import { parseFrontmatter } from './frontmatter';
import { isReservedFile } from './concept-id';
import { containsWikilink, extractMarkdownLinks, isInternalMarkdownLink } from './links';
import type { Issue, ValidationResult } from './types';

const REQUIRED_FIELDS = ['type', 'title', 'description', 'tags', 'timestamp'] as const;
const DESCRIPTION_MAX_LENGTH = 200;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isParseableTimestamp(value: unknown): boolean {
  const text = value instanceof Date ? value.toISOString() : value;
  if (typeof text !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}/.test(text)) return false;
  return !Number.isNaN(new Date(text).getTime());
}

/**
 * Heuristic: is `description` a single sentence? Counts sentence-terminators
 * that are followed by whitespace + an uppercase letter, or end-of-string.
 * Common abbreviations (e.g., i.e.) are stripped first to reduce false hits.
 */
function isLikelyOneSentence(description: string): boolean {
  const cleaned = description
    .trim()
    .replace(/\b(?:e\.g|i\.e|etc|vs|approx|Dr|Mr|Mrs|Ms|Inc|Ltd)\./gi, '');
  const boundaries = cleaned.match(/[.!?]+(?=\s+\p{Lu}|\s*$)/gu) ?? [];
  return boundaries.length <= 1;
}

/**
 * Validate one file against the Engram OKF profile (docs/okf-conformance.md).
 * Reserved files (index.md, log.md, AGENTS.md) always pass. `ok` is false iff
 * any error is present; warnings never affect `ok`.
 */
export function validateConcept(text: string, path: string): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  if (isReservedFile(path)) {
    return { ok: true, errors, warnings };
  }

  const parsed = parseFrontmatter(text);

  if (!parsed.hasFrontmatter) {
    errors.push({
      code: 'missing-frontmatter',
      message: 'File must begin with a YAML frontmatter block delimited by "---".',
    });
    return { ok: false, errors, warnings };
  }

  if (parsed.frontmatter === null) {
    errors.push({
      code: 'invalid-yaml',
      message: parsed.yamlError ?? 'Frontmatter is not valid YAML.',
    });
    return { ok: false, errors, warnings };
  }

  const fm = parsed.frontmatter;
  const has = (field: string): boolean =>
    field in fm && fm[field] !== null && fm[field] !== undefined;

  for (const field of REQUIRED_FIELDS) {
    if (!has(field)) {
      errors.push({
        code: `missing-field:${field}`,
        message: `Required field "${field}" is missing.`,
        field,
      });
    }
  }

  if (has('type') && !isNonEmptyString(fm.type)) {
    errors.push({
      code: 'type-not-string',
      message: '"type" must be a non-empty string.',
      field: 'type',
    });
  }

  if (has('title') && !isNonEmptyString(fm.title)) {
    errors.push({
      code: 'title-not-string',
      message: '"title" must be a non-empty string.',
      field: 'title',
    });
  }

  if (has('description')) {
    if (!isNonEmptyString(fm.description)) {
      errors.push({
        code: 'description-empty',
        message: '"description" must be a non-empty string.',
        field: 'description',
      });
    } else {
      const description = fm.description as string;
      if (description.length > DESCRIPTION_MAX_LENGTH) {
        warnings.push({
          code: 'description-too-long',
          message: `"description" is ${description.length} chars; keep it under ${DESCRIPTION_MAX_LENGTH}.`,
          field: 'description',
        });
      }
      if (!isLikelyOneSentence(description)) {
        warnings.push({
          code: 'description-not-one-sentence',
          message: '"description" should be a single sentence.',
          field: 'description',
        });
      }
    }
  }

  if (has('tags')) {
    if (!isStringArray(fm.tags)) {
      errors.push({
        code: 'tags-not-string-array',
        message: '"tags" must be an array of strings.',
        field: 'tags',
      });
    } else if (fm.tags.length === 0) {
      warnings.push({
        code: 'tags-empty',
        message: '"tags" is empty; add at least one tag.',
        field: 'tags',
      });
    }
  }

  if (has('timestamp') && !isParseableTimestamp(fm.timestamp)) {
    errors.push({
      code: 'timestamp-unparseable',
      message: '"timestamp" must be an ISO-8601 date-time.',
      field: 'timestamp',
    });
  }

  const { body } = parsed;

  if (!/^#{1,6}\s/m.test(body)) {
    warnings.push({
      code: 'body-no-headings',
      message: 'Concept body has no headings; prefer structural markdown.',
    });
  }

  if (containsWikilink(body)) {
    warnings.push({
      code: 'link-wikilink',
      message: 'Use standard markdown links, not [[wikilinks]] (ADR-0003).',
    });
  }

  for (const link of extractMarkdownLinks(body)) {
    if (isInternalMarkdownLink(link.target) && !link.target.startsWith('/')) {
      warnings.push({
        code: 'link-not-absolute',
        message: `Link to "${link.target}" should be absolute bundle-relative (start with "/").`,
      });
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
