import { relative, sep } from 'node:path';
import { pathToConceptId } from '../format/concept-id';
import { enumerateConceptFiles } from '../vault/read';
import type { ReadLedger } from './reader';
import { tokenize } from './score';

/** A concept surfaced by a frontmatter scan — the one-line-per-concept payload. */
export interface FrontmatterMatch {
  id: string;
  /** Vault-relative path, posix, with `.md`. */
  path: string;
  link: string;
  title: string;
  description: string;
  tags: string[];
  type: string;
  /** Which frontmatter fields matched, e.g. `["tags", "description"]`. */
  matchedFields: string[];
  /** Count of matched signals (tags + term hits) — the grep rank. */
  hits: number;
}

export interface GrepOptions {
  tags?: string[];
  type?: string;
  terms?: string[];
  /** Max matches to RETURN (bounded output). Scan still reads all frontmatter. */
  cap?: number;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Shape a raw frontmatter mapping + path into a normalized record. */
export function toFrontmatterMatch(
  fm: Record<string, unknown> | null,
  vaultRelPath: string,
): Omit<FrontmatterMatch, 'matchedFields' | 'hits'> {
  return {
    id: pathToConceptId(vaultRelPath),
    path: vaultRelPath,
    link: `/${vaultRelPath}`,
    title: asString(fm?.title) || pathToConceptId(vaultRelPath),
    description: asString(fm?.description),
    tags: asStringArray(fm?.tags),
    type: asString(fm?.type),
  };
}

/**
 * Bounded frontmatter grep — the FALLBACK path, only run when index descent
 * under-localizes or a pure tag/type browse has no query terms. Reads each
 * concept's frontmatter (grep tier, never a body) and returns capped, ranked
 * matches. It touches many files but reads ZERO bodies, so M6 (never a
 * whole-vault body load) holds even here (see ADR-0010).
 */
export function grepFrontmatter(
  vaultRoot: string,
  ledger: ReadLedger,
  opts: GrepOptions,
): FrontmatterMatch[] {
  const wantTags = (opts.tags ?? []).map((t) => t.toLowerCase());
  const wantType = opts.type?.toLowerCase();
  const terms = opts.terms ?? [];
  const cap = opts.cap ?? 25;

  const matches: FrontmatterMatch[] = [];
  for (const abs of enumerateConceptFiles(vaultRoot)) {
    const rel = relative(vaultRoot, abs).split(sep).join('/');
    const fm = ledger.readFrontmatter(abs, 'grep');
    const base = toFrontmatterMatch(fm, rel);
    const tagsLower = base.tags.map((t) => t.toLowerCase());

    if (wantType && base.type.toLowerCase() !== wantType) continue;
    if (wantTags.length > 0 && !wantTags.some((t) => tagsLower.includes(t))) continue;

    const matchedFields = new Set<string>();
    let hits = 0;

    if (wantTags.length > 0) {
      matchedFields.add('tags');
      hits += wantTags.filter((t) => tagsLower.includes(t)).length;
    }
    if (wantType) {
      matchedFields.add('type');
      hits += 1;
    }

    if (terms.length > 0) {
      const titleTokens = new Set(tokenize(base.title));
      const descTokens = new Set(tokenize(base.description));
      const tagTokens = new Set(tokenize(base.tags.join(' ')));
      for (const term of terms) {
        if (titleTokens.has(term)) {
          matchedFields.add('title');
          hits += 2;
        }
        if (tagTokens.has(term)) {
          matchedFields.add('tags');
          hits += 2;
        }
        if (descTokens.has(term)) {
          matchedFields.add('description');
          hits += 1;
        }
      }
    }

    // With terms present, require at least one signal; a pure tag/type browse
    // (no terms) keeps every filter-passing concept.
    if (terms.length > 0 && hits === 0) continue;

    matches.push({ ...base, matchedFields: [...matchedFields], hits });
  }

  matches.sort((a, b) => b.hits - a.hits || a.path.localeCompare(b.path, 'en'));
  return matches.slice(0, cap);
}
