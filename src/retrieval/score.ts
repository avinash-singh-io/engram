/**
 * Deterministic lexical scoring — the whole query-matching engine. No
 * embeddings, no network, no state: reaffirms the ADR-0005 structural-first
 * boundary (semantic escalation is Phase 5). Same inputs → same score + trail.
 */

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'of',
  'to',
  'in',
  'for',
  'and',
  'or',
  'is',
  'are',
  'be',
  'on',
  'with',
  'how',
  'what',
  'why',
  'when',
  'which',
  'that',
  'this',
  'it',
  'vs',
  'via',
  'using',
  'use',
  'do',
  'does',
  'my',
  'your',
]);

/** Lowercase, split on non-alphanumerics, drop stopwords and 1-char tokens. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (t) => t.length >= 2 && !STOPWORDS.has(t),
  );
}

/** The scorable surfaces of a candidate. All optional (index bullets lack tags). */
export interface ScoreFields {
  title?: string;
  description?: string;
  tags?: string[];
  headings?: string[];
  /** The index `## heading` the bullet sat under. */
  section?: string;
}

export interface ScoreResult {
  score: number;
  /** Human-readable match trail, e.g. `["title~temporal"]`. Stable order. */
  why: string[];
}

const WEIGHTS: Record<keyof ScoreFields, number> = {
  title: 3,
  tags: 2.5,
  section: 2,
  headings: 1.5,
  description: 1,
};

const FIELD_ORDER: (keyof ScoreFields)[] = ['title', 'tags', 'section', 'headings', 'description'];

function fieldText(fields: ScoreFields, field: keyof ScoreFields): string {
  const value = fields[field];
  if (value === undefined) return '';
  return Array.isArray(value) ? value.join(' ') : value;
}

/**
 * Score query `terms` against a candidate's fields. Exact token hits earn the
 * field weight; substring hits (e.g. `temporal` in `temporality`) earn half.
 * A term counts at most once per field. Deterministic and explainable.
 */
export function scoreCandidate(terms: string[], fields: ScoreFields): ScoreResult {
  const why: string[] = [];
  let score = 0;

  for (const field of FIELD_ORDER) {
    const text = fieldText(fields, field);
    if (!text) continue;
    const tokenSet = new Set(tokenize(text));
    const lowered = text.toLowerCase();
    const weight = WEIGHTS[field];

    for (const term of terms) {
      if (tokenSet.has(term)) {
        score += weight;
        why.push(`${field}~${term}`);
      } else if (term.length >= 4 && lowered.includes(term)) {
        score += weight * 0.5;
        why.push(`${field}~${term}`);
      }
    }
  }

  return { score, why };
}
