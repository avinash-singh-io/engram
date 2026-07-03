import { existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { enumerateConceptFiles } from '../vault/read';
import { parseIndex } from './index-parse';

export type IndexQualitySeverity = 'error' | 'warning';

export interface IndexQualityIssue {
  code: string;
  message: string;
  severity: IndexQualitySeverity;
  /** Vault-relative path the issue concerns. */
  path?: string;
}

export interface IndexQualityReport {
  /** True when no ERROR-severity issue exists (descent stays possible). */
  ok: boolean;
  issues: IndexQualityIssue[];
  stats: {
    indexes: number;
    concepts: number;
    indexedConcepts: number;
  };
}

function parentOf(dir: string): string {
  const i = dir.lastIndexOf('/');
  return i === -1 ? '' : dir.slice(0, i);
}

function indexRelPath(dir: string): string {
  return dir ? `${dir}/index.md` : 'index.md';
}

/**
 * Check that a vault's indexes are navigation-grade (ADR-0005/0006): every
 * concept is surfaced with a description, bullets are grouped into sections, and
 * each parent index links its child-directory indexes so three-level descent is
 * possible. A flat (non-nested) index still passes with a warning that it
 * reduces sublinear descent. Reports ERROR gaps (descent-breaking) and WARNINGs.
 */
export function checkIndexQuality(vaultRoot: string): IndexQualityReport {
  const issues: IndexQualityIssue[] = [];
  const conceptAbs = enumerateConceptFiles(vaultRoot);
  const concepts = conceptAbs.map((abs) => relative(vaultRoot, abs).split(sep).join('/'));

  const conceptsByDir = new Map<string, string[]>();
  const dirs = new Set<string>(['']);
  for (const path of concepts) {
    const slash = path.lastIndexOf('/');
    const dir = slash === -1 ? '' : path.slice(0, slash);
    const list = conceptsByDir.get(dir) ?? [];
    list.push(path);
    conceptsByDir.set(dir, list);
    let d = dir;
    while (d !== '') {
      dirs.add(d);
      d = parentOf(d);
    }
  }

  let indexes = 0;
  let indexedConcepts = 0;
  const parsedByDir = new Map<string, ReturnType<typeof parseIndex>>();

  for (const dir of dirs) {
    const rel = indexRelPath(dir);
    const abs = join(vaultRoot, rel);
    if (!existsSync(abs)) {
      issues.push({
        code: dir === '' ? 'root-index-missing' : 'index-missing',
        message: `Missing index for directory "${dir || '(root)'}"; descent stops here.`,
        severity: 'error',
        path: rel,
      });
      continue;
    }
    indexes += 1;
    const parsed = parseIndex(readFileSync(abs, 'utf8'));
    parsedByDir.set(dir, parsed);

    // Every direct concept must be surfaced, with a non-empty description.
    const targets = new Map(parsed.concepts.map((c) => [c.target.split('#')[0], c] as const));
    for (const cpath of conceptsByDir.get(dir) ?? []) {
      const entry = targets.get(`/${cpath}`);
      if (!entry) {
        issues.push({
          code: 'concept-not-indexed',
          message: `Concept "${cpath}" is not listed in its directory index.`,
          severity: 'error',
          path: cpath,
        });
        continue;
      }
      indexedConcepts += 1;
      if (!entry.description) {
        issues.push({
          code: 'description-missing',
          message: `Concept "${cpath}" has no description in the index — agents can't scan-to-decide.`,
          severity: 'warning',
          path: cpath,
        });
      }
    }

    // Bullets should be grouped under section headings.
    if (parsed.entries.length > 0 && parsed.headings.length === 0) {
      issues.push({
        code: 'no-sections',
        message: `Index "${rel}" has bullets but no section headings.`,
        severity: 'warning',
        path: rel,
      });
    }
  }

  // Each non-root directory index must be linked from its parent (descent edge).
  for (const dir of dirs) {
    if (dir === '') continue;
    const parent = parentOf(dir);
    const parentParsed = parsedByDir.get(parent);
    if (!parentParsed) continue;
    const wantLink = `/${indexRelPath(dir)}`;
    const linked = parentParsed.descents.some((d) => d.target.split('#')[0] === wantLink);
    if (!linked) {
      issues.push({
        code: 'missing-child-link',
        message: `Parent index "${indexRelPath(parent)}" does not link child "${wantLink}"; descent can't reach it.`,
        severity: 'error',
        path: wantLink,
      });
    }
  }

  // Flat-layout warning: subdir concepts exist but the root has no descent links.
  const hasSubdirConcepts = [...conceptsByDir.keys()].some((d) => d !== '');
  const rootParsed = parsedByDir.get('');
  if (hasSubdirConcepts && rootParsed && rootParsed.descents.length === 0) {
    issues.push({
      code: 'flat-layout',
      message: 'Root index has no child-directory links; a flat vault reduces sublinear descent.',
      severity: 'warning',
      path: 'index.md',
    });
  }

  return {
    ok: issues.every((i) => i.severity !== 'error'),
    issues,
    stats: { indexes, concepts: concepts.length, indexedConcepts },
  };
}
