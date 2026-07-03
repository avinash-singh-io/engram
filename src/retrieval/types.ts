/**
 * Retrieval-layer public types.
 *
 * `RecallResult` and `ReadReport` are STABLE, exported contracts: Phase 5's
 * hybrid navigate+retrieve and any MCP adapter consume them. Extend additively;
 * do not break the shape (parallel-execution-plan.md §7).
 */

/**
 * The tier a file read is charged to. Only `body` is a full-content,
 * context-consuming read (the operation M3/M6 bound); `index`, `frontmatter`,
 * and `grep` return distilled, one-line-per-concept metadata and never surface
 * a concept body to the caller (see ADR-0010).
 */
export type ReadTier = 'index' | 'frontmatter' | 'grep' | 'body';

export interface TierStat {
  reads: number;
  bytes: number;
}

/**
 * Instrumented read accounting emitted once per recall. `bodyReads` and
 * `filesTouched` are exactly what the bounded-read metrics constrain:
 * M6 = never a whole-vault body load, M3 = bounded sublinear file fraction.
 */
export interface ReadReport {
  byTier: Record<ReadTier, TierStat>;
  /** Distinct files whose content was read through the ledger (any tier). */
  filesTouched: number;
  /** Full-content (body-tier) reads — the context-consuming operation. */
  bodyReads: number;
  /** Total concepts in the vault (denominator for the bounded fraction). */
  conceptCount: number;
  /** Total bytes read across all tiers. */
  bytes: number;
}

export interface RecallQuery {
  query: string;
  /** Require the candidate to carry at least one of these tags. */
  tags?: string[];
  /** Require the candidate's `type` to equal this. */
  type?: string;
  /** Max references to return (minimal-set cap). */
  max?: number;
  /** One-hop link expansion from the top candidate(s). */
  hops?: number;
  /** Extract matched headings (reads bodies, bounded). */
  sections?: boolean;
}

export interface MatchedSection {
  heading: string;
  level: number;
}

/** How a candidate was reached during navigation. */
export type RecallVia = 'index' | 'grep' | 'link';

/**
 * One ranked concept reference — the map-to-the-answer, not the answer body.
 * `sections` is populated only under `--sections`; `tags` only when frontmatter
 * was consulted (tag/type filtering, grep, or link resolution).
 */
export interface RecallReference {
  id: string;
  /** Vault-relative path, posix separators, with `.md`. */
  path: string;
  /** Absolute bundle-relative link, e.g. `/system-design/x.md`. */
  link: string;
  title: string;
  description: string;
  tags?: string[];
  score: number;
  /** Explainable match trail, e.g. `["title~temporal", "description~replay"]`. */
  why: string[];
  via: RecallVia;
  sections?: MatchedSection[];
}

export interface RecallResult {
  query: string;
  vaultRoot: string;
  results: RecallReference[];
  report: ReadReport;
  /** Present when nothing scored above threshold (low-confidence guidance). */
  suggestions?: string[];
}
