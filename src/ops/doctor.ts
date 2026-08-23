/**
 * `doctor` — health, integrity, and the detective half of the guardrail story.
 *
 * **Read-only in Phase 9.** ADR-0028 makes not-rewriting-links engram's default
 * posture; `--fix` is its single exception and gets its own deliberate pass.
 *
 * §7 of the architecture is the reason this command matters: engram mediates only
 * two of the four write paths, because Obsidian and any agent with a shell write
 * files directly. A rule enforceable only at the write gate is therefore advisory.
 * Every closed relation was required in Phase 8 to carry a **detective form** —
 * this is where those get run.
 */

import { inspect, type Finding } from '../core/graph.js';
import type { Edge, Node } from '../core/model.js';
import { isDerived } from '../core/paths.js';
import type { Detector, FileStore } from '../core/ports.js';
import { getRelation, relationKinds } from '../core/relations.js';
import { detectAll, guardrailNames, type GuardrailConfig } from '../policy/guardrails.js';
import { CONFIG_PATH } from '../policy/config.js';
import { linkSettingWarnings, OBSIDIAN_APP_JSON, readLinkSettings } from './obsidian-settings.js';
import { needsUpgrade, planUpgrade, versionSkew } from './upgrade.js';
import { auditSkills } from '../surface/render-skills.js';
import { discoverSkills, SKILLS_DIR } from '../policy/skills.js';
import { walk, type WalkFinding } from './walk.js';
import { parseFrontmatter, readNode } from '../format/registry.js';
import { subsetNames } from '../format/subset.js';

export interface DoctorReport {
  /** Nothing here fails the command — ADR-0021 is explicit these are not errors. */
  warnings: string[];
  /** Only these make `doctor` exit non-zero. */
  failures: string[];
  /** The detective form of every registered relation, run and reported by name. */
  detectives: { relation: string; check: string; hits: string[] }[];
  /**
   * The detective half of every enabled guardrail.
   *
   * This is the half that catches writes the gate never saw — Obsidian edits and
   * agent shell writes (v2-overview §1). Without it, every guardrail would be
   * advisory rather than enforced.
   */
  guardrails: { rule: string; prevents: string; hits: string[] }[];
  counts: { nodes: number; edges: number };
}

/** Rules in force when a vault declares none. */
export const DEFAULT_GUARDRAILS: GuardrailConfig = { enabled: guardrailNames() };

const say = (f: Finding | WalkFinding): string => `[${f.code}] ${f.message}`;

export async function doctor(
  files: FileStore,
  detect: Detector,
  guardrailConfig: GuardrailConfig = DEFAULT_GUARDRAILS,
): Promise<DoctorReport> {
  const warnings: string[] = [];
  const failures: string[] = [];

  const walked = await walk(files);
  for (const f of walked.findings) warnings.push(say(f));

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  for (const path of walked.paths) {
    const raw = await files.read(path);
    if (raw === null) continue;
    const result = readNode(raw, path);
    nodes.push(result.node);
    edges.push(...result.edges);
    for (const w of result.warnings) warnings.push(`[read] ${path}: ${w}`);

    // The remedy, not just the symptom. BUG-011's original message said the
    // frontmatter "did not parse" and stopped there — it named no key, said nothing
    // about what engram *does* read, and did not mention that identity had just been
    // traded for a path. A health check that reports a problem without a next action
    // is only half a check.
    const parsed = parseFrontmatter(raw);
    for (const e of parsed.keyErrors) {
      warnings.push(
        `[frontmatter] ${path} line ${e.line}: ${e.reason}. ` +
          `engram reads ${subsetNames().length} YAML constructs including block and flow ` +
          `sequences — see STRUCTURE.md, or rewrite this key in a form it lists.`,
      );
    }

    // Identity lost **because of** a parse failure, which is a different problem from
    // a note that never had an `id` — and a much worse one. ADR-0021: the slug is the
    // identity and the path is only an address, so a note reduced to path-as-identity
    // breaks every relation pointing at it the moment it moves.
    const lostId = parsed.yamlError !== undefined || parsed.keyErrors.some((e) => e.key === 'id');
    if (result.node.id === path && lostId) {
      // A **warning**, not a failure. ADR-0021 is explicit that a missing slug is
      // "a warning and a fallback, never an error", and a doctor that exits 1 because
      // one file in a vault has an odd property is a doctor people stop running.
      //
      // It is worded to carry its own severity instead. Raising it to a failure would
      // be a real argument — this is data integrity, not tidiness — but it amends
      // ADR-0021 and belongs in an ADR rather than in a health check.
      warnings.push(
        `[identity-lost] ${path} has no readable \`id\`, so it is identified by its path. ` +
          `This is not cosmetic: moving or renaming it will break every relation ` +
          `pointing at it (ADR-0021). Fix the frontmatter above, then re-run.`,
      );
    }
  }

  for (const f of inspect(nodes, edges)) warnings.push(say(f));

  // A reserved path holding content no generator would write. The walker excludes
  // reserved paths from authored content, so without this check a hand-written
  // index.md would be invisible until reindex silently overwrote it.
  for (const path of await files.list()) {
    if (!isDerived(path)) continue;
    const raw = await files.read(path);
    if (raw !== null && raw.trim() !== '' && !raw.includes('GENERATED by engram reindex')) {
      warnings.push(
        `[derived-not-generated] ${path} is a derived path but was not written by engram. ` +
          `On conflict the rule is regenerate, never merge (ADR-0029) — run \`engram reindex\`.`,
      );
    }
  }

  // Skills reach an agent only through the copies in its own directory, so a source
  // skill that was never rendered is a skill nobody can invoke — the failure FEAT-009
  // reported, in a form engram can actually detect.
  //
  // Skipped entirely for a directory engram has never initialised, on the same
  // reasoning `planUpgrade` uses: warnings are only worth reading if every one of
  // them is actionable, and "your skills are not rendered" is noise in a folder that
  // is not a vault.
  const initialised = await files.exists(CONFIG_PATH);
  if (initialised) {
    const discovered = await discoverSkills(files);
    for (const e of discovered.errors) warnings.push(`[skill] ${e.name}: ${e.reason}`);

    const audit = await auditSkills(files, discovered.skills);
    // One line per condition, not per file. Twenty-seven warnings saying the same
    // thing is the same as no warning: nobody reads past the third.
    if (audit.unrendered.length > 0) {
      warnings.push(
        `[skill-unrendered] ${audit.unrendered.length} skill file(s) are missing from ` +
          `agent directories, so those skills cannot be invoked. Run \`engram reindex\`. ` +
          `First: ${audit.unrendered[0]}`,
      );
    }
    if (audit.edited.length > 0) {
      // The one warning that has to name the source file. "Do not edit" without an
      // alternative just gets worked around, and this is the moment someone finds out
      // their change is about to disappear.
      warnings.push(
        `[skill-edited] ${audit.edited.length} rendered skill file(s) have been changed ` +
          `by hand and will be overwritten by the next \`engram reindex\`. Rendered ` +
          `skills are derived state (ADR-0029) — to keep a change, put it in ` +
          `${SKILLS_DIR}/<name>/SKILL.md instead: ${audit.edited.join(', ')}`,
      );
    }
    if (audit.foreign.length > 0) {
      warnings.push(
        `[skill-not-ours] ${audit.foreign.length} file(s) where engram would render a ` +
          `skill have no provenance marker, so engram will never overwrite them — and ` +
          `is therefore not rendering its own skill of that name. If you meant to take ` +
          `them over, this is working as intended: ${audit.foreign.join(', ')}`,
      );
    }
    if (audit.stale.length > 0) {
      // Every path is listed rather than counted, because each one needs removing
      // individually. Engram will not do it: the FileStore port has four methods and
      // removal is deliberately not one — the same stance as `upgrade`, which copies
      // and then names what it left behind. A leftover only ever returned in a result
      // object and never printed is the same as not having detected it.
      warnings.push(
        `[skill-stale] ${audit.stale.length} file(s) written by engram no longer ` +
          `correspond to any skill — usually a built-in you have since overridden, ` +
          `which keeps working until removed. Engram will not delete them for you: ` +
          audit.stale.join(', '),
      );
    }
  }

  // A vault older than the engram reading it. Note files are safe by construction —
  // each carries its own okf_version — but engram's own files are not versioned,
  // which is the gap this surfaces rather than leaves as a mystery.
  const plan = await planUpgrade(files);
  const skew = versionSkew(plan);
  if (skew !== null) warnings.push(skew);
  else if (needsUpgrade(plan)) {
    warnings.push('[version] `engram upgrade` has changes available for this vault.');
  }

  // Detection over configuration (ADR-0025). Obsidian owns link rewriting; engram
  // only reports a mismatch (ADR-0028).
  //
  // Until Phase 14 this emitted one fixed line telling the human to go check a
  // setting, and never opened `app.json` — so it said the same thing to a
  // correctly configured vault and a misconfigured one, which is the same as
  // saying nothing. ADR-0028 asked for the settings to be *read*.
  if (await detect.has('obsidian')) {
    const settings = await readLinkSettings(files);
    if (settings === null) {
      warnings.push(
        `[obsidian] Obsidian detected but ${OBSIDIAN_APP_JSON} is unreadable, so this device's ` +
          `link settings could not be checked. Links must be markdown + absolute (ADR-0003).`,
      );
    } else {
      warnings.push(...linkSettingWarnings(settings));
    }
  }

  const detectives = relationKinds().map((relation) => {
    const kind = getRelation(relation)!;
    const known = new Set(nodes.map((n) => n.id));
    const hits = edges
      .filter((e) => e.kind === relation && !known.has(e.to))
      .map((e) => `${e.from} --${relation}--> ${e.to} (target has no node)`);
    return { relation, check: kind.detective, hits };
  });

  const guardrails = detectAll(nodes, edges, guardrailConfig);
  for (const g of guardrails) {
    for (const hit of g.hits) warnings.push(`[guardrail:${g.rule}] ${hit}`);
  }

  return {
    warnings,
    failures,
    detectives,
    guardrails,
    counts: { nodes: nodes.length, edges: edges.length },
  };
}

/** Format a report for a terminal. Exit code is `failures.length === 0 ? 0 : 1`. */
export function formatReport(r: DoctorReport): string {
  const lines = [`engram doctor`, ``, `nodes: ${r.counts.nodes}   edges: ${r.counts.edges}`, ``];

  if (r.failures.length > 0) {
    lines.push(`FAILURES (${r.failures.length})`, ...r.failures.map((f) => `  ✖ ${f}`), ``);
  }
  if (r.warnings.length > 0) {
    lines.push(
      `warnings (${r.warnings.length}) — none of these are errors`,
      ...r.warnings.map((w) => `  • ${w}`),
      ``,
    );
  }

  lines.push(`relation detectives (${r.detectives.length} registered)`);
  for (const d of r.detectives) {
    lines.push(`  ${d.relation}: ${d.check}`);
    for (const h of d.hits) lines.push(`    • ${h}`);
    if (d.hits.length === 0) lines.push(`    clean`);
  }

  lines.push(``, `guardrail detectives (${r.guardrails.length} in force)`);
  lines.push(`  these catch writes the gate never saw — Obsidian and shell edits`);
  for (const g of r.guardrails) {
    lines.push(`  ${g.rule}: prevents ${g.prevents}`);
    for (const h of g.hits) lines.push(`    • ${h}`);
    if (g.hits.length === 0) lines.push(`    clean`);
  }

  if (r.failures.length === 0 && r.warnings.length === 0) lines.push(``, `no problems found`);
  return `${lines.join('\n')}\n`;
}
