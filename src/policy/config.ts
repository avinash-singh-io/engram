/**
 * TIER 2 — Agency. Loading the guardrail configuration a vault declares.
 *
 * **BUG-003.** Phase 10 shipped six guardrails, three of which read only from
 * configuration — `propose-only`, `path-scope`, `rate-limit` — and nothing ever
 * loaded a configuration. Every caller passed `DEFAULT_GUARDRAILS`, which enables
 * all six and populates none of their fields, so those three had no effect at all
 * for two releases. Their tests passed because they construct configs directly and
 * never ask where a real one comes from.
 *
 * The file is markdown with frontmatter, like a skill: legible with `cat`, travels
 * with a `git clone`, and editable by the human whose vault it constrains
 * (v2-overview §12).
 */

import type { FileStore } from '../core/ports.js';
import { parseFrontmatter } from '../format/registry.js';
import { guardrailNames, type GuardrailConfig } from './guardrails.js';

export const GUARDRAILS_PATH = '/.engram/guardrails.md';

/** Rules in force when a vault declares nothing. Every rule on, none scoped. */
export const DEFAULTS: GuardrailConfig = { enabled: guardrailNames() };

export interface LoadedGuardrails {
  config: GuardrailConfig;
  /**
   * Configuration problems, surfaced rather than swallowed. A guardrail file that
   * silently fails to load is the same failure as BUG-003 with a friendlier face:
   * the vault believes it is protected and is not.
   */
  warnings: string[];
}

const asList = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;

/**
 * Load `.engram/guardrails.md`.
 *
 * Absent means `DEFAULTS` — an existing vault must not change behaviour because a
 * new release looks for a file it has never had.
 */
export async function loadGuardrails(files: FileStore): Promise<LoadedGuardrails> {
  const raw = await files.read(GUARDRAILS_PATH);
  if (raw === null) return { config: DEFAULTS, warnings: [] };

  const parsed = parseFrontmatter(raw);
  const warnings: string[] = [];

  if (parsed.frontmatter === null) {
    warnings.push(
      `${GUARDRAILS_PATH}: ${parsed.yamlError ?? 'no frontmatter'} — falling back to defaults`,
    );
    return { config: DEFAULTS, warnings };
  }

  const fm = parsed.frontmatter;
  const known = new Set(guardrailNames());

  const declared = asList(fm.enabled);
  const enabled = declared === undefined ? DEFAULTS.enabled : declared.filter((n) => known.has(n));
  for (const name of declared ?? []) {
    if (!known.has(name)) {
      warnings.push(
        `${GUARDRAILS_PATH}: unknown guardrail "${name}" — engram has: ${guardrailNames().join(', ')}`,
      );
    }
  }

  const proposeOnly = asList(fm.proposeOnly);
  const rawScope = asList(fm.pathScope);

  // `pathScope: []` is the trap. `path-scope` reads an empty list as "no path is
  // permitted" and refuses every write, whereas a human writing it almost
  // certainly means "I have not configured this yet". Treated as unset, loudly —
  // silently honouring it would brick the vault, and silently ignoring it would
  // be BUG-003 again.
  let pathScope = rawScope;
  if (rawScope !== undefined && rawScope.length === 0) {
    warnings.push(
      `${GUARDRAILS_PATH}: \`pathScope: []\` would forbid every write. Treating it as unset — ` +
        'remove the key, or list the paths an agent may write.',
    );
    pathScope = undefined;
  }

  const rate = Number(fm.rateLimit);
  const rateLimit = fm.rateLimit === undefined || fm.rateLimit === null ? undefined : rate;
  if (rateLimit !== undefined && !Number.isFinite(rateLimit)) {
    warnings.push(`${GUARDRAILS_PATH}: rateLimit is not a number (${String(fm.rateLimit)})`);
  }

  return {
    config: {
      enabled,
      ...(proposeOnly === undefined ? {} : { proposeOnly }),
      ...(pathScope === undefined ? {} : { pathScope }),
      ...(rateLimit !== undefined && Number.isFinite(rateLimit) ? { rateLimit } : {}),
    },
    warnings,
  };
}

/**
 * The scaffold `init` writes.
 *
 * `proposeOnly` ships **empty**. Populating it would make a fresh vault start
 * deferring writes a human never asked to review — the mechanism has to be
 * discoverable without being imposed, exactly as ADR-0041 made the HTTP transport
 * opt-in rather than a sensible default.
 */
export function scaffoldGuardrails(): string {
  return [
    '---',
    `enabled: [${guardrailNames().join(', ')}]`,
    'proposeOnly: []',
    '# pathScope: [/concepts/, /sources/]   # omit entirely to permit every path',
    '# rateLimit: 20',
    '---',
    '',
    '# Guardrails',
    '',
    'What an agent may do to this vault. Engram reads this file at every mediated',
    'write; delete it and the defaults above apply.',
    '',
    '## enabled',
    '',
    'Rules in force. Every rule has a preventive half at the write gate and a',
    'detective half in `engram doctor`, because engram mediates only two of the four',
    'ways a file gets written — you and Obsidian are the other two.',
    '',
    '## proposeOnly',
    '',
    'Paths where an agent may **propose** but not write. A change here is held in',
    '`.engram/queue/` for you to approve:',
    '',
    '```',
    'engram queue list',
    'engram queue show <id>',
    'engram queue approve <id>',
    '```',
    '',
    'Approving is a human action. There is no MCP tool for it — an agent that could',
    'approve its own proposal would have turned a refusal into a retry (ADR-0042).',
    '',
    '## pathScope',
    '',
    'Paths an agent may write **at all**. Omit the key to permit every path.',
    'An empty list is treated as unset and warned about, because taken literally it',
    'forbids every write.',
    '',
    '## rateLimit',
    '',
    'Maximum new nodes per run — the guard against a large, well-formatted pile you',
    'never reviewed.',
  ].join('\n');
}
