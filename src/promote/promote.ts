import { basename, isReservedFile } from '../format/concept-id';
import { encodeLinkTarget } from '../format/links';
import { validateConcept } from '../format/validate';
import type { ValidationResult } from '../format/types';
import { parseMomentum, type MomentumArtifact } from './parse-momentum';
import { toConcept } from './to-concept';

/**
 * Pure promote pipeline: parse a momentum artifact → map to an OKF concept →
 * `validateConcept` (the hard gate). It never writes; `result.ok` reflects the
 * gate and the caller MUST refuse to place a non-conformant concept, so the
 * vault can never contain an invalid promoted concept (ADR-0012).
 */

export interface PromoteInput {
  /** Raw text of the momentum source file. */
  sourceText: string;
  /** Path of the momentum source (provenance link + default filename). */
  sourcePath: string;
  /** Target vault directory (default `references`). */
  targetDir?: string;
  type?: string;
  tags?: string[];
  description?: string;
  /** Injectable clock for deterministic timestamps. */
  now?: Date;
}

export interface PromoteResult {
  /** Mirrors `validation.ok` — false when the mapping is non-conformant. */
  ok: boolean;
  artifact: MomentumArtifact;
  /** Vault-relative target path, e.g. `references/0001-x.md`. */
  targetPath: string;
  /** Serialized concept file text. */
  conceptText: string;
  title: string;
  description: string;
  sourceRef: string;
  validation: ValidationResult;
  /** `log.md` entry to append on placement (Phase 1 log writer shape). */
  logEntry: { action: string; title: string; link: string };
  /** Human-readable log line including momentum provenance. */
  logLine: string;
}

function cleanDir(dir: string): string {
  return dir.replace(/^\/+|\/+$/g, '') || 'references';
}

function slugStem(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'artifact'
  );
}

/**
 * Filename for the concept. An ADR is one file = one decision, so its source
 * basename is reused (preserves the ADR number so cross-ADR links resolve to
 * promoted siblings). A learning entry's source file is a container of many
 * entries, so it is always named from the entry title.
 */
function conceptFilename(artifact: MomentumArtifact, sourcePath: string): string {
  const base = basename(sourcePath);
  if (artifact.kind === 'adr' && base.toLowerCase().endsWith('.md') && !isReservedFile(base)) {
    return base;
  }
  const stem = (artifact.id ? `${artifact.id}-` : '') + slugStem(artifact.title);
  return `${stem}.md`;
}

/** Run the parse → map → validate promote pipeline (no filesystem writes). */
export function promoteMomentum(input: PromoteInput): PromoteResult {
  const artifact = parseMomentum(input.sourceText);
  const targetDir = cleanDir(input.targetDir ?? 'references');
  const rendered = toConcept(artifact, {
    type: input.type,
    description: input.description,
    tags: input.tags,
    targetDir,
    sourcePath: input.sourcePath,
    now: input.now,
  });

  const targetPath = `${targetDir}/${conceptFilename(artifact, input.sourcePath)}`;
  const validation = validateConcept(rendered.text, targetPath);
  const link = `/${targetPath}`;

  return {
    ok: validation.ok,
    artifact,
    targetPath,
    conceptText: rendered.text,
    title: rendered.title,
    description: rendered.description,
    sourceRef: artifact.sourceRef,
    validation,
    logEntry: { action: 'Promoted', title: rendered.title, link },
    logLine: `- **Promoted** [${rendered.title}](${encodeLinkTarget(link)}) from momentum ${artifact.sourceRef}`,
  };
}
