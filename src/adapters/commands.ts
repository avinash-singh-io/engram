/**
 * Shared command-definition set — the single source of command semantics that
 * every agent adapter renders. Each adapter wraps these definitions in its own
 * per-agent file convention (Claude slash-command, Codex prompt, Antigravity
 * command), so adding an agent is a thin descriptor, not a fork (ADR-0010).
 *
 * Instruction bodies are agent-neutral: they describe the `engram` CLI flow the
 * agent should drive. The root `AGENTS.md` (emitted by `engram init`, shared by
 * all agents) carries the vault traversal contract.
 */

export interface CommandDefinition {
  /** Command name (also the emitted file stem and the slash-command trigger). */
  name: string;
  /** One-line summary — becomes the agent-facing `description`. */
  summary: string;
  /** Agent-neutral instruction markdown (no per-agent frontmatter). */
  body: string;
}

export const COMMAND_DEFINITIONS: readonly CommandDefinition[] = [
  {
    name: 'capture',
    summary: 'Capture a raw note into the engram vault inbox',
    body: [
      "Capture the user's note into the vault inbox with minimal ceremony.",
      '',
      'Run: `engram capture "<the note text>"`',
      '',
      'Then confirm the inbox path. Do not refine or file it yet — `refine` does that.',
    ].join('\n'),
  },
  {
    name: 'refine',
    summary: 'Refine an inbox note into a filed OKF concept',
    body: [
      'Turn an inbox item into a filed, frontmatter-complete concept.',
      '',
      '1. Read the inbox item.',
      '2. Choose a `type` (Concept / Reference / Playbook / MOC), a `title`, a',
      '   **one-sentence** `description`, `tags`, and a destination `category/slug.md`.',
      '3. Run:',
      '   `engram refine <inbox-path> --type <T> --title "<title>" --description "<one sentence.>" --tags a,b --to <category>/<slug>.md`',
      '',
      'The command validates OKF conformance and refuses to write a non-conformant',
      'concept. Indexes and `log.md` update automatically.',
    ].join('\n'),
  },
  {
    name: 'link',
    summary: 'Suggest and insert cross-links between concepts',
    body: [
      '1. Run `engram link <concept> --suggest` to see tag-overlap candidates.',
      '2. Pick the most related target.',
      '3. Run `engram link <concept> --to <target>` to insert an absolute markdown link.',
      '',
      'Links are untyped; convey the relationship in prose near the link.',
    ].join('\n'),
  },
  {
    name: 'reindex',
    summary: 'Regenerate vault indexes from concept frontmatter',
    body: [
      'Run `engram reindex` to regenerate every `index.md` from concept frontmatter.',
      'Indexes are tool-owned — never hand-edit them. Use `engram reindex --check` to',
      'detect drift without writing.',
    ].join('\n'),
  },
  {
    name: 'promote',
    summary: 'Import a momentum ADR/learning as an OKF concept',
    body: [
      'Promote a momentum artifact (an ADR or a history/learning entry) into this',
      'vault as a one-way, point-in-time OKF `Reference` concept.',
      '',
      '1. Identify the momentum source file by path (Engram reads it as plain text —',
      '   no momentum tooling is invoked).',
      '2. Preview first:',
      '   `engram promote <path/to/adr.md> --dry-run`',
      '3. If the rendered concept validates, write it:',
      '   `engram promote <path/to/adr.md> --to references --tags a,b`',
      '',
      'The concept maps to `type: Reference`, derives a one-sentence `description`',
      'from the ADR `## Decision` (override with `--description`), carries a',
      '`# Source` provenance block, and passes the OKF validator as a hard pre-write',
      'gate. It is a snapshot — Engram never syncs changes back to momentum.',
    ].join('\n'),
  },
] as const;

/** Look up a command definition by name. */
export function getCommand(name: string): CommandDefinition | undefined {
  return COMMAND_DEFINITIONS.find((c) => c.name === name);
}

/** Render a definition as a Claude Code slash-command (`description` frontmatter). */
export function renderClaudeCommand(def: CommandDefinition): string {
  return `---\ndescription: ${def.summary}\n---\n\n${def.body}\n`;
}

/** Render a definition as a Codex prompt file (heading + summary + body). */
export function renderCodexPrompt(def: CommandDefinition): string {
  return `# /${def.name}\n\n> ${def.summary}\n\n${def.body}\n`;
}

/** Render a definition as an Antigravity command file (`name`/`description` frontmatter). */
export function renderAntigravityCommand(def: CommandDefinition): string {
  return `---\nname: ${def.name}\ndescription: ${def.summary}\n---\n\n${def.body}\n`;
}
