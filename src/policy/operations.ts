/**
 * TIER 2 — Agency. The six operations, described once.
 *
 * **This is one list, and that is the point.** `skill-schema.ts` named the six
 * operations a skill may sequence; `surface/agents-md.ts` separately held a table of
 * the same six with their descriptions. Two lists of the same thing is the shape
 * that produced BUG-008 twice — a generated file the walker did not know about, and
 * then a second one added the same day. Adding a seventh operation to one list and
 * not the other would not fail; it would silently ship a contract that omits it.
 *
 * So the contract table, the skills engram renders, and the validation of what a
 * skill may declare all read from here.
 *
 * ## Why an operation gets a *skill about it* rather than becoming one
 *
 * A skill is instructions an agent follows; engram never runs one (v2-overview §6).
 * That guarantee is what bounds a careless or downloaded skill: it can only sequence
 * operations that already exist. Adding a seventh operation called "skill" would
 * make engram interpret skills and dissolve the guarantee. So the operations stay
 * six, and each gets a skill *describing* it — which is what makes them reachable as
 * `/engram:capture` with no MCP server involved.
 */

import { OPERATIONS, type Operation, type Skill } from './skill-schema.js';

export interface OperationDef {
  name: Operation;
  /** The shell form, with its arguments. */
  command: string;
  /** One line for the contract's table. */
  does: string;
  /**
   * When an agent should reach for this.
   *
   * Load-bearing: this becomes the skill's `description`, and a description is what
   * an agent matches against when deciding whether to load a skill at all. One that
   * only restates the name makes the skill unreachable except by explicit invocation.
   */
  when: string;
  /** The skill body — what to actually do, and what the result means. */
  steps: string[];
}

const DEFS: OperationDef[] = [
  {
    name: 'init',
    command: 'engram init [--structure <name>] [--scaffold]',
    does: 'scaffold a vault. Non-destructive; never overwrites.',
    when:
      'Set up a new engram vault, adopt an existing folder of notes, or change which ' +
      'filing convention a vault declares. Use when a directory has no `.engram/` yet, ' +
      'or when the user wants to switch structure.',
    steps: [
      '1. Run `engram init` in the vault root. It is non-destructive — an existing file',
      '   is skipped, never overwritten, so running it twice is safe.',
      '2. `--structure default|para|zettelkasten|custom` declares the filing convention.',
      '   A vault that already has notes keeps its own folders; add `--scaffold` only if',
      "   the user explicitly wants the structure's directories created.",
      '3. Read the `notes:` it returns aloud to the user. They say what was *not* done',
      '   and why, which is usually the part that matters.',
      '',
      '**Never run this in a directory the user did not name.** It writes files.',
    ],
  },
  {
    name: 'capture',
    command: 'engram capture [text]',
    does: '**persist raw content. Never validates, never fails.**',
    when:
      'Save a thought, a pasted article, a link or a half-finished note immediately, ' +
      'without deciding yet what it is or where it belongs. Use whenever formatting ' +
      'would mean losing the thought or interrupting the user.',
    steps: [
      '1. `engram capture "the text"`, or pipe on stdin for anything long.',
      '2. It lands in `raw/` with a timestamp. Nothing is validated and nothing is',
      '   rejected — that is the contract (ADR-0026).',
      '',
      '**Capture never rejects.** If you cannot format something now — no time, no',
      'structure, half a thought — capture it. Losing a thought is the only real',
      'failure; an unfiled note is not. Do not ask the user where it should go first.',
    ],
  },
  {
    name: 'format',
    command: 'engram format [text] --title <t> [--container <c>] [--sources <id>]',
    does: 'content + your structure → a validated node and its relations.',
    when:
      'Turn raw content into a filed note with a title, a place and its relations to ' +
      'what already exists. Use when the user has decided what something is, or when ' +
      'processing `raw/` into the vault proper.',
    steps: [
      '1. Decide the structure yourself and pass it: `--title`, `--container`,',
      '   `--sources`, `--supersedes`. **Engram runs no model and cannot infer any of',
      '   it** — it makes no network calls at all (ADR-0034).',
      '2. Pass `--container` with the folder name **exactly as it is on disk**. Engram',
      '   uses it verbatim for the path; only the relation target is slugified.',
      '3. Add `--generated` when you authored the content rather than the user. Trust',
      '   weighting depends on that distinction being honest.',
      '',
      '## The three outcomes',
      '',
      '| Outcome | What it means | What to do |',
      '|---|---|---|',
      '| applied | written | say where |',
      '| **queued** | a guardrail defers this path for human review | **not a failure.** Tell the user it is waiting and give them `engram queue show <id>` |',
      '| rejected | a guardrail refuses it | say which rule and why. Do not retry the same write |',
      '',
      '**A queued result is not an error and must not be retried or worked around.**',
      'Approving is a human action and there is no tool for it (ADR-0042).',
    ],
  },
  {
    name: 'link',
    command: 'engram link <file> <to> <kind>',
    does: 'assert one typed relation (`supersedes` | `sources` | `part-of`).',
    when:
      'Record that one note supersedes, cites, or belongs to another, after both ' +
      'already exist. Use when a relation was missed at write time or becomes true later.',
    steps: [
      '1. `engram link <file> <target-slug> <kind>`. The target is a **slug**, which is',
      '   identity — not a path, which is only an address (ADR-0021).',
      '2. Only the closed relations carry meaning engram acts on. Anything else is free',
      '   association: recorded and readable, but with no validity semantics.',
      '',
      'Prefer asserting relations at `format` time. You know how content relates to what',
      'exists at the moment you write it, and that is when the information is cheapest',
      'and most reliable. A wrong relation is plain text in frontmatter and costs',
      'seconds to fix — repair is trivial, so extraction does not have to be perfect.',
    ],
  },
  {
    name: 'reindex',
    command: 'engram reindex',
    does: 'regenerate derived state — `index.md`, `views/`, contracts, skills. Idempotent.',
    when:
      'Rebuild the index, the generated views, the agent contracts and the rendered ' +
      'skills after notes or configuration changed. Use after a batch of writes, after ' +
      'editing guardrails or skills, or when generated files look stale.',
    steps: [
      '1. `engram reindex`. It is idempotent — running it twice gives the same result.',
      '2. Everything it writes is **derived state** (ADR-0029): safe to delete, never',
      '   committed, and on conflict the rule is regenerate rather than merge.',
      '',
      'Run this after editing anything in `engram/skills/` — that is the source, and the',
      'copies each agent reads are regenerated from it.',
    ],
  },
  {
    name: 'doctor',
    command: 'engram doctor',
    does: 'health and integrity report. Read-only.',
    when:
      'Check a vault for broken relations, guardrail violations, stale derived state ' +
      'or a version mismatch. Use before a review, after a large import, or when ' +
      'something looks wrong.',
    steps: [
      '1. `engram doctor`. It is read-only and changes nothing.',
      '2. **Warnings are not errors.** Only failures make it exit non-zero. Report what',
      '   it says without fixing anything the user did not ask you to fix.',
      '',
      'It exists because engram mediates only two of the four ways a file gets written —',
      'you and Obsidian are the other two. Every guardrail has a preventive half at the',
      'write gate and a detective half here; without this, half of them would be',
      'advisory rather than enforced.',
    ],
  },
];

const BY_NAME = new Map(DEFS.map((d) => [d.name, d]));

/**
 * Every operation, in the registry's order.
 *
 * Throws at module load if the two lists have drifted, so the failure is loud and
 * immediate rather than a contract that quietly omits an operation.
 */
export function operations(): OperationDef[] {
  const missing = OPERATIONS.filter((n) => !BY_NAME.has(n));
  if (missing.length > 0) {
    throw new Error(`operations without a definition: ${missing.join(', ')}`);
  }
  return OPERATIONS.map((n) => BY_NAME.get(n)!);
}

export function getOperation(name: string): OperationDef | undefined {
  return BY_NAME.get(name as Operation);
}

/**
 * Tool restriction declared on every operation skill.
 *
 * **A hint, not a guarantee.** `allowed-tools` is experimental in the hosts, and
 * engram must not describe it as protection: the real bound is that a skill can only
 * sequence operations that already exist, and every write it leads to still passes
 * the gate under the vault's guardrails. This narrows what a well-behaved agent
 * reaches for; it does not enforce anything.
 */
export const OPERATION_TOOLS = 'Bash(engram:*)';

/**
 * One skill per operation, so an agent can reach the whole surface with no MCP
 * server — `/engram:format` rather than a tool call over a socket the vault has to
 * be configured for.
 *
 * Derived from the registry, so a seventh operation cannot ship without one.
 */
export function operationSkills(): Skill[] {
  return operations().map((def) => ({
    name: def.name,
    description: def.when,
    uses: [def.name],
    body: [
      '# What it does',
      '',
      def.does.replace(/\*\*/g, ''),
      '',
      '# How to run it',
      '',
      '```bash',
      def.command,
      '```',
      '',
      'Run it in the vault root, in a shell. This is a command-line tool — there is no',
      'server to start and no connection to make.',
      '',
      '# Steps',
      '',
      ...def.steps,
    ].join('\n'),
    origin: 'built-in' as const,
  }));
}
