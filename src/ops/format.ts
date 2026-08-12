/**
 * `format(content, hints)` — the agent's main verb (ADR-0033).
 *
 * **Engram does not extract.** ADR-0034 forbids network calls, so engram cannot
 * call a model and cannot infer relations. ADR-0019 assigns that to the agent,
 * which already knows the relationship at the moment it writes the content, and
 * ADR-0027 makes write-time reporting the primary error mitigation precisely
 * because reporting beats inferring.
 *
 * So `hints` carries what the agent decided, and engram's half is deterministic:
 * slug from title, path from container, stamp, serialize, validate, gate. There is
 * no extractor in this file, and there is not meant to be one.
 *
 * The shape is `content (from anywhere) → format → [gate] → nodes`. Nothing is
 * required to pass through `inbox/` first — that is a buffer, not a stage.
 */

import { makeEdge, makeNode, type Edge, type Node } from '../core/model.js';
import type { Clock, FileStore } from '../core/ports.js';
import { isClosedRelation } from '../core/relations.js';
import { writeNode } from '../format/registry.js';
import { validate, type Change } from '../gate.js';
import type { GuardrailConfig } from '../policy/guardrails.js';

export interface FormatHints {
  /** Human-readable title. The slug is derived from it when `id` is absent. */
  title?: string;
  /** Explicit slug. Wins over a title-derived one. */
  id?: string;
  /** Where to file it. Becomes a `part-of` edge and the default directory. */
  container?: string;
  /** Explicit path. Wins over a container-derived one. */
  path?: string;
  supersedes?: string[];
  sources?: string[];
  /** Who is asserting. */
  by: string;
  /**
   * True when an agent authored this rather than a human.
   *
   * Stamps `generated`, which is ADR-0027's second mitigation: agent-authored
   * assertions stay filterable and auditable, and retrieval can weight them below
   * human-verified ones.
   */
  generated?: boolean;
}

export type FormatResult =
  | { outcome: 'applied'; node: Node; edges: Edge[]; warnings: string[] }
  | { outcome: 'rejected'; reason: string; rule: string };

export interface FormatDeps {
  files: FileStore;
  clock: Clock;
  /**
   * Guardrails in force. Omitted means none — `format` is usable without policy,
   * but a vault that configures rules gets them enforced at the gate rather than
   * only reported afterwards by `doctor`.
   */
  guardrails?: GuardrailConfig;
  /** Nodes already present, for rules that must look at what exists. */
  existing?: Node[];
  /** Nodes written so far this run, for rate limiting. */
  writtenThisRun?: number;
}

/**
 * Title → slug. Deterministic and lossy on purpose: a slug is a human-readable
 * identifier, not an encoding of the title (ADR-0021).
 */
export function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** First non-empty line of the body, stripped of heading marks. */
function titleFromContent(content: string): string {
  for (const line of content.split('\n')) {
    const trimmed = line.replace(/^#+\s*/, '').trim();
    if (trimmed !== '') return trimmed;
  }
  return '';
}

export async function format(
  content: string,
  hints: FormatHints,
  deps: FormatDeps,
): Promise<FormatResult> {
  const title = hints.title ?? titleFromContent(content);
  const id = hints.id ?? slugify(title);

  if (id === '') {
    // Not a failure of capture — capture cannot reject (ADR-0026). This is the
    // promotion boundary, and validation gates promotion.
    return {
      outcome: 'rejected',
      reason: 'cannot derive an identity: give a title, an id, or content with a first line',
      rule: 'id-required',
    };
  }

  const dir = hints.container === undefined ? '' : `/${slugify(hints.container)}`;
  const path = hints.path ?? `${dir}/${id}.md`;

  const at = deps.clock.now();
  const stamp = { by: hints.by, at, until: null };

  const node = makeNode({ id, path, stamp, body: content });

  const edges: Edge[] = [];
  if (hints.container !== undefined) {
    edges.push(makeEdge({ from: id, to: slugify(hints.container), kind: 'part-of', stamp }));
  }
  for (const to of hints.supersedes ?? []) {
    edges.push(makeEdge({ from: id, to, kind: 'supersedes', stamp }));
  }
  for (const to of hints.sources ?? []) {
    edges.push(makeEdge({ from: id, to, kind: 'sources', stamp }));
  }

  const { content: serialized, warnings } = writeNode(node, edges);
  const change: Change = { path, node, edges, content: serialized };

  const verdict = validate(
    change,
    deps.guardrails === undefined
      ? undefined
      : {
          config: deps.guardrails,
          ctx: {
            existing: deps.existing ?? [],
            edges: [],
            writtenThisRun: deps.writtenThisRun ?? 0,
          },
        },
  );
  if (verdict.outcome === 'reject') {
    return { outcome: 'rejected', reason: verdict.reason, rule: verdict.rule };
  }

  await deps.files.write(path, serialized);

  const notes = [...warnings];
  for (const e of edges) {
    if (!isClosedRelation(e.kind)) {
      notes.push(`"${e.kind}" is not a closed relation; it carries no validity semantics`);
    }
  }
  if (hints.generated === true) {
    notes.push(`stamped as agent-authored (generated by ${hints.by})`);
  }
  return { outcome: 'applied', node, edges, warnings: notes };
}
