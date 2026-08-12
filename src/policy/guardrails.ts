/**
 * TIER 2 — Agency. Guardrails are the counterweight to write-time autonomy.
 *
 * §1 of the architecture is why this file has the shape it does: engram mediates
 * **two of the four write paths**. Obsidian edits files directly by design, and an
 * agent with a shell can do the same. So a rule enforced only at the gate is
 * *advisory*, and advisory controls on a shared filesystem are a comfort rather
 * than a control.
 *
 * Therefore **every rule ships in two halves**:
 *
 *   preventive — runs at the write gate; catches engram-mediated writes only
 *   detective  — runs in `doctor`; catches every write, however it happened
 *
 * A rule with no detective form cannot be registered. That is enforced by a test,
 * not by review — the same mechanism that caught `part-of` being registered but
 * never serialized in Phase 9.
 */

import type { Edge, Node } from '../core/model.js';
import type { Change } from '../gate.js';

export interface GuardrailContext {
  /** Nodes already in the vault, for rules that need to look at what exists. */
  existing: Node[];
  /** Edges already in the vault. */
  edges: Edge[];
  /** Nodes written in this run, for rate limiting. */
  writtenThisRun: number;
}

export interface Guardrail {
  name: string;
  /** What goes wrong without it. Shown when it fires and in AGENTS.md. */
  prevents: string;
  /**
   * Preventive half. Returns a reason when the change must be refused.
   * `null` means allow.
   */
  check(change: Change, ctx: GuardrailContext, config: GuardrailConfig): string | null;
  /**
   * Detective half — what `doctor` scans for after the fact. Required: a rule
   * enforceable only preventively is advisory (v2-overview §7).
   */
  detect(nodes: Node[], edges: Edge[], config: GuardrailConfig): string[];
}

/** Declarative configuration, loaded from the vault. */
export interface GuardrailConfig {
  /** Rules in force. A rule absent here does not run. */
  enabled: string[];
  /** Paths where writes must be proposed rather than applied. */
  proposeOnly?: string[];
  /** Paths an agent may write at all. */
  pathScope?: string[];
  /** Maximum new nodes per run. */
  rateLimit?: number;
}

const REGISTRY = new Map<string, Guardrail>();

export function registerGuardrail(rule: Guardrail): void {
  REGISTRY.set(rule.name, rule);
}

export function guardrailNames(): string[] {
  return [...REGISTRY.keys()].sort();
}

export function getGuardrail(name: string): Guardrail | undefined {
  return REGISTRY.get(name);
}

const under = (path: string, scopes: string[]): boolean =>
  scopes.some((s) => path.startsWith(s.replace(/\*+$/, '')));

registerGuardrail({
  name: 'no-delete',
  prevents: 'losing the record of what you used to believe',
  check(change) {
    // Deprecate, never remove. Supersession invalidates; deletion erases.
    return change.content.trim() === '' && change.node.body !== null
      ? 'refusing to empty an existing node — deprecate or supersede it instead'
      : null;
  },
  detect(nodes, edges) {
    const known = new Set(nodes.map((n) => n.id));
    return edges
      .filter((e) => e.kind === 'supersedes' && !known.has(e.to))
      .map((e) => `${e.from} supersedes "${e.to}", which no longer exists — was it deleted?`);
  },
});

registerGuardrail({
  name: 'require-sources',
  prevents: 'an unauditable synthesis claim you act on months later',
  check(change) {
    const isSynthesis = change.node.id.startsWith('synthesis-');
    const hasSources = change.edges.some((e) => e.kind === 'sources');
    return isSynthesis && !hasSources
      ? `a synthesis node must cite at least one source (${change.node.id})`
      : null;
  },
  detect(nodes, edges) {
    const cited = new Set(edges.filter((e) => e.kind === 'sources').map((e) => e.from));
    return nodes
      .filter((n) => n.id.startsWith('synthesis-') && !cited.has(n.id))
      .map((n) => `${n.path} is a synthesis node carrying no sources edge`);
  },
});

registerGuardrail({
  name: 'no-supersede-verified',
  prevents: 'an agent overruling a human judgement silently',
  check(change, ctx) {
    const verified = new Set(ctx.existing.filter((n) => n.stamp.by !== 'agent').map((n) => n.id));
    const hit = change.edges.find((e) => e.kind === 'supersedes' && verified.has(e.to));
    return hit === undefined
      ? null
      : `cannot supersede "${hit.to}" unattended — it carries a human assertion`;
  },
  detect(nodes, edges) {
    const byHuman = new Set(nodes.filter((n) => n.stamp.by !== 'agent').map((n) => n.id));
    return edges
      .filter((e) => e.kind === 'supersedes' && byHuman.has(e.to))
      .map((e) => `${e.from} supersedes "${e.to}", which carries a human assertion`);
  },
});

registerGuardrail({
  name: 'propose-only',
  prevents: 'autonomous writes where the stakes are highest',
  check(change, _ctx, config) {
    return under(change.path, config.proposeOnly ?? [])
      ? `${change.path} is propose-only — this change needs human review before it applies`
      : null;
  },
  detect(nodes, _edges, config) {
    return nodes
      .filter((n) => under(n.path, config.proposeOnly ?? []) && n.stamp.by === 'agent')
      .map((n) => `${n.path} is in a propose-only path but was written by an agent`);
  },
});

registerGuardrail({
  name: 'path-scope',
  prevents: 'an agent reorganising things it should not touch',
  check(change, _ctx, config) {
    const scopes = config.pathScope;
    return scopes === undefined || under(change.path, scopes)
      ? null
      : `${change.path} is outside the permitted scope (${scopes.join(', ')})`;
  },
  detect(nodes, _edges, config) {
    const scopes = config.pathScope;
    if (scopes === undefined) return [];
    return nodes
      .filter((n) => n.stamp.by === 'agent' && !under(n.path, scopes))
      .map((n) => `${n.path} was written by an agent outside the permitted scope`);
  },
});

registerGuardrail({
  name: 'rate-limit',
  prevents: 'a large, well-formatted pile you never reviewed',
  check(_change, ctx, config) {
    const max = config.rateLimit;
    return max !== undefined && ctx.writtenThisRun >= max
      ? `rate limit reached (${max} new nodes per run)`
      : null;
  },
  detect(nodes, _edges, config) {
    const max = config.rateLimit;
    if (max === undefined) return [];
    const perDay = new Map<string, number>();
    for (const n of nodes.filter((x) => x.stamp.by === 'agent')) {
      const day = n.stamp.at.slice(0, 10);
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }
    return [...perDay.entries()]
      .filter(([, count]) => count > max)
      .map(([day, count]) => `${count} agent-authored nodes on ${day}, above the limit of ${max}`);
  },
});

/**
 * Run every enabled rule's preventive half.
 *
 * Returns the first refusal, naming the rule — a rejection that does not say which
 * rule fired is not actionable.
 */
export function checkAll(
  change: Change,
  ctx: GuardrailContext,
  config: GuardrailConfig,
): { rule: string; reason: string } | null {
  for (const name of config.enabled) {
    const rule = REGISTRY.get(name);
    if (rule === undefined) continue;
    const reason = rule.check(change, ctx, config);
    if (reason !== null) return { rule: name, reason };
  }
  return null;
}

/** Run every enabled rule's detective half. */
export function detectAll(
  nodes: Node[],
  edges: Edge[],
  config: GuardrailConfig,
): { rule: string; prevents: string; hits: string[] }[] {
  return config.enabled
    .map((name) => REGISTRY.get(name))
    .filter((r): r is Guardrail => r !== undefined)
    .map((rule) => ({
      rule: rule.name,
      prevents: rule.prevents,
      hits: rule.detect(nodes, edges, config),
    }));
}

/**
 * Narrow a configuration. **Tighten only — never loosen.**
 *
 * This is what bounds the blast radius of a careless or downloaded skill in
 * Phase 15: a skill declares the guardrails it runs under and may only add rules
 * and shrink scopes. It exists before skills do, deliberately, because a
 * constraint added after the thing it constrains is not a constraint.
 */
export function tighten(
  base: GuardrailConfig,
  requested: Partial<GuardrailConfig>,
): GuardrailConfig {
  return {
    enabled: [...new Set([...base.enabled, ...(requested.enabled ?? [])])],
    proposeOnly: [...new Set([...(base.proposeOnly ?? []), ...(requested.proposeOnly ?? [])])],
    // Intersection, not union: a narrower scope is tighter, a wider one is not.
    pathScope:
      base.pathScope === undefined
        ? requested.pathScope
        : requested.pathScope === undefined
          ? base.pathScope
          : base.pathScope.filter((s) => requested.pathScope!.includes(s)),
    rateLimit:
      base.rateLimit === undefined
        ? requested.rateLimit
        : Math.min(base.rateLimit, requested.rateLimit ?? base.rateLimit),
  };
}
