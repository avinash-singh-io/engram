import { join } from 'node:path';
import { pathToConceptId } from '../format/concept-id';
import { extractMarkdownLinks, isInternalMarkdownLink } from '../format/links';
import { linkToFsPath } from '../vault/paths';
import { parseIndex } from './index-parse';
import { ReadLedger } from './reader';
import { grepFrontmatter, toFrontmatterMatch } from './scan';
import { scoreCandidate, tokenize } from './score';
import type { MatchedSection, RecallReference, RecallResult, RecallVia } from './types';
import { countConcepts, rootIndexPath } from './vault-root';

export interface NavigateOptions {
  tags?: string[];
  type?: string;
  /** Max references in the minimal set. Default 5. */
  max?: number;
  /** One-hop link expansion from the top reference when >= 1. Default 0. */
  hops?: number;
  /** Extract matched headings (reads bodies, bounded). Default false. */
  sections?: boolean;
  /** Descent depth guard. Default 12 (the tree is the real bound). */
  maxDepth?: number;
  /** Hard body-read budget — never exceeded. Default max(max, 8). */
  maxBodyReads?: number;
}

type Candidate = RecallReference;

const DEFAULT_MAX = 5;

function refFromConceptBullet(
  target: string,
  title: string,
  description: string,
  score: number,
  why: string[],
  via: RecallVia,
): Candidate {
  const path = target.replace(/^\//, '').split('#')[0] ?? '';
  return {
    id: pathToConceptId(path),
    path,
    link: `/${path}`,
    title,
    description,
    score,
    why,
    via,
  };
}

/** Extract headings whose text shares a query term (bounded body parse). */
function matchedSections(body: string, terms: string[]): MatchedSection[] {
  const out: MatchedSection[] = [];
  for (const line of body.split('\n')) {
    const m = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
    if (!m) continue;
    const heading = (m[2] ?? '').trim();
    if (!heading) continue;
    const tokens = new Set(tokenize(heading));
    if (terms.some((t) => tokens.has(t) || heading.toLowerCase().includes(t))) {
      out.push({ heading, level: (m[1] ?? '').length });
    }
  }
  return out;
}

/**
 * The three-level structural navigator (ADR-0005). Descends root `index.md` →
 * child indexes (following the section descent-links) → concept bullets,
 * scoring deterministically against the index map, then returns the minimal
 * ranked reference set — reading the MAP (index tier), not concept bodies.
 * Bodies are read only for `--sections` / `--hops`, always within a hard budget.
 * Every filesystem read flows through the ReadLedger, so the ReadReport is
 * trustworthy (M3/M6).
 */
export function navigate(
  vaultRoot: string,
  query: string,
  opts: NavigateOptions = {},
): RecallResult {
  const max = opts.max ?? DEFAULT_MAX;
  const hops = opts.hops ?? 0;
  const maxDepth = opts.maxDepth ?? 12;
  const maxBodyReads = opts.maxBodyReads ?? Math.max(max, 8);

  const conceptCount = countConcepts(vaultRoot);
  const ledger = new ReadLedger(vaultRoot);
  const terms = tokenize(query);

  const byLink = new Map<string, Candidate>();
  let results: Candidate[] = [];

  const browseOnly = terms.length === 0 && ((opts.tags?.length ?? 0) > 0 || Boolean(opts.type));

  if (browseOnly) {
    // Pure tag/type browse — no query terms to rank on: go straight to grep.
    for (const m of grepFrontmatter(vaultRoot, ledger, {
      tags: opts.tags,
      type: opts.type,
      cap: max,
    })) {
      byLink.set(m.link, {
        id: m.id,
        path: m.path,
        link: m.link,
        title: m.title,
        description: m.description,
        tags: m.tags,
        score: m.hits,
        why: m.matchedFields.map((f) => `${f}~browse`),
        via: 'grep',
      });
    }
    results = [...byLink.values()];
  } else {
    // Three-level descent: BFS the index tree via section descent-links.
    const rootAbs = rootIndexPath(vaultRoot);
    const visited = new Set<string>();
    const queue: { abs: string; depth: number }[] = [{ abs: rootAbs, depth: 0 }];

    while (queue.length > 0) {
      const frame = queue.shift();
      if (!frame || visited.has(frame.abs)) continue;
      visited.add(frame.abs);

      const content = ledger.readIndexIfExists(frame.abs);
      if (content === null) continue;
      const parsed = parseIndex(content);

      for (const bullet of parsed.concepts) {
        const { score, why } = scoreCandidate(terms, {
          title: bullet.title,
          description: bullet.description,
          section: bullet.section,
        });
        if (score <= 0) continue;
        const ref = refFromConceptBullet(
          bullet.target,
          bullet.title,
          bullet.description,
          score,
          why,
          'index',
        );
        const prev = byLink.get(ref.link);
        if (!prev || ref.score > prev.score) byLink.set(ref.link, ref);
      }

      if (frame.depth < maxDepth) {
        for (const d of parsed.descents) {
          const childAbs = linkToFsPath(vaultRoot, d.target);
          if (!visited.has(childAbs)) queue.push({ abs: childAbs, depth: frame.depth + 1 });
        }
      }
    }

    results = [...byLink.values()];

    // Tag/type refinement: confirm the top window's frontmatter (bounded reads).
    if ((opts.tags?.length ?? 0) > 0 || opts.type) {
      const wantTags = (opts.tags ?? []).map((t) => t.toLowerCase());
      const wantType = opts.type?.toLowerCase();
      const window = rank(results).slice(0, max * 3);
      const kept: Candidate[] = [];
      for (const ref of window) {
        const fm = ledger.readFrontmatter(join(vaultRoot, ref.path), 'frontmatter');
        const shaped = toFrontmatterMatch(fm, ref.path);
        const tagsLower = shaped.tags.map((t) => t.toLowerCase());
        if (wantType && shaped.type.toLowerCase() !== wantType) continue;
        if (wantTags.length > 0 && !wantTags.some((t) => tagsLower.includes(t))) continue;
        kept.push({ ...ref, tags: shaped.tags });
      }
      results = kept;
    }

    // Fallback: index descent under-localized — bounded frontmatter grep.
    if (results.length === 0) {
      for (const m of grepFrontmatter(vaultRoot, ledger, {
        tags: opts.tags,
        type: opts.type,
        terms,
        cap: max,
      })) {
        results.push({
          id: m.id,
          path: m.path,
          link: m.link,
          title: m.title,
          description: m.description,
          tags: m.tags,
          score: m.hits,
          why: m.matchedFields.map((f) => `${f}~${terms[0] ?? 'grep'}`),
          via: 'grep',
        });
      }
    }
  }

  results = rank(results).slice(0, max);

  // One-hop link expansion from the top reference (bounded body read).
  if (hops >= 1 && results.length > 0 && ledger.bodyReads < maxBodyReads) {
    const seed = results[0];
    if (seed) {
      const { body } = ledger.readBody(join(vaultRoot, seed.path));
      for (const link of extractMarkdownLinks(body)) {
        if (results.length >= max + hops * 3) break;
        if (!isInternalMarkdownLink(link.target)) continue;
        const path = link.target.replace(/^\//, '').split('#')[0] ?? '';
        if (!path || path === seed.path) continue;
        const linkAbs = `/${path}`;
        if (results.some((r) => r.link === linkAbs)) continue;
        const known = byLink.get(linkAbs);
        if (known) {
          results.push({ ...known, via: 'link', score: seed.score * 0.5 });
        } else if (ledger.bodyReads < maxBodyReads) {
          const fm = ledger.readFrontmatter(join(vaultRoot, path), 'frontmatter');
          const shaped = toFrontmatterMatch(fm, path);
          results.push({
            id: shaped.id,
            path: shaped.path,
            link: shaped.link,
            title: shaped.title || link.text,
            description: shaped.description,
            tags: shaped.tags,
            score: seed.score * 0.5,
            why: [`link~${seed.id}`],
            via: 'link',
          });
        }
      }
    }
  }

  // Section extraction: read bodies of the returned set (bounded by budget).
  if (opts.sections) {
    for (const ref of results) {
      if (ledger.bodyReads >= maxBodyReads) break;
      const { body } = ledger.readBody(join(vaultRoot, ref.path));
      ref.sections = matchedSections(body, terms);
    }
  }

  const result: RecallResult = {
    query,
    vaultRoot,
    results,
    report: ledger.report(conceptCount),
  };
  if (results.length === 0) result.suggestions = suggest(terms);
  return result;
}

/** Stable ranking: score desc, then path asc. */
function rank(refs: Candidate[]): Candidate[] {
  return [...refs].sort((a, b) => b.score - a.score || a.path.localeCompare(b.path, 'en'));
}

function suggest(terms: string[]): string[] {
  const tips = [
    'Broaden the query or drop a `--tag`/`--type` filter.',
    'List the map directly: open `/index.md` and descend by section.',
  ];
  if (terms.length > 1) {
    tips.unshift(`Try a single key term, e.g. "${terms[0]}".`);
  }
  return tips;
}
