import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { parseFrontmatter } from '../format/frontmatter';
import type { ReadReport, ReadTier, TierStat } from './types';

const emptyTiers = (): Record<ReadTier, TierStat> => ({
  index: { reads: 0, bytes: 0 },
  frontmatter: { reads: 0, bytes: 0 },
  grep: { reads: 0, bytes: 0 },
  body: { reads: 0, bytes: 0 },
});

/** A concept read at the body tier — frontmatter + full body + raw text. */
export interface BodyRead {
  frontmatter: Record<string, unknown> | null;
  body: string;
  raw: string;
}

/**
 * The single filesystem choke point for retrieval. Every index/concept content
 * read flows through here and is charged to a tier, so the bounded-read metrics
 * (M3/M6) are trustworthy. The navigator/scan/parse/score modules import no
 * `node:fs` at all — a source-level test enforces that (metric integrity).
 */
export class ReadLedger {
  private readonly tiers = emptyTiers();
  private readonly touched = new Set<string>();

  constructor(private readonly vaultRoot: string) {}

  private rel(absPath: string): string {
    return relative(this.vaultRoot, absPath).split(sep).join('/');
  }

  private charge(tier: ReadTier, absPath: string, bytes: number): void {
    const stat = this.tiers[tier];
    stat.reads += 1;
    stat.bytes += bytes;
    this.touched.add(this.rel(absPath));
  }

  /** Read a full `index.md` (tier: index). */
  readIndex(absPath: string): string {
    const content = readFileSync(absPath, 'utf8');
    this.charge('index', absPath, Buffer.byteLength(content, 'utf8'));
    return content;
  }

  /** Read an index only if it exists; missing indexes yield null (no charge). */
  readIndexIfExists(absPath: string): string | null {
    try {
      return this.readIndex(absPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  /**
   * Read a concept's frontmatter only (tier: frontmatter or grep). Reads the
   * file but returns just the parsed mapping — the body never reaches the
   * caller, so this is bounded auxiliary I/O, not a context-consuming read.
   */
  readFrontmatter(
    absPath: string,
    tier: 'frontmatter' | 'grep' = 'frontmatter',
  ): Record<string, unknown> | null {
    const content = readFileSync(absPath, 'utf8');
    this.charge(tier, absPath, Buffer.byteLength(content, 'utf8'));
    return parseFrontmatter(content).frontmatter;
  }

  /** Read a full concept body (tier: body) — the context-consuming read. */
  readBody(absPath: string): BodyRead {
    const raw = readFileSync(absPath, 'utf8');
    this.charge('body', absPath, Buffer.byteLength(raw, 'utf8'));
    const parsed = parseFrontmatter(raw);
    return { frontmatter: parsed.frontmatter, body: parsed.body, raw };
  }

  /** Body-tier reads charged so far — the live budget counter. */
  get bodyReads(): number {
    return this.tiers.body.reads;
  }

  /** Snapshot the ledger into an immutable ReadReport. */
  report(conceptCount: number): ReadReport {
    const t = this.tiers;
    const bytes = (Object.values(t) as TierStat[]).reduce((sum, s) => sum + s.bytes, 0);
    return {
      byTier: {
        index: { ...t.index },
        frontmatter: { ...t.frontmatter },
        grep: { ...t.grep },
        body: { ...t.body },
      },
      filesTouched: this.touched.size,
      bodyReads: t.body.reads,
      conceptCount,
      bytes,
    };
  }
}
