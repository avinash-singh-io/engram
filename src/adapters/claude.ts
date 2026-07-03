import { join } from 'node:path';
import { COMMAND_DEFINITIONS, renderClaudeCommand } from './commands';
import type { Adapter, AdapterFile } from './types';

/**
 * Claude Code's native project-memory file. It does not reliably auto-load
 * `AGENTS.md`, so the adapter emits a thin pointer to it — keeping AGENTS.md the
 * single source of truth (ADR-0011) while Claude Code still loads the contract.
 */
const CLAUDE_POINTER = `# Knowledge Vault — Claude Code

This is an \`engram\` OKF knowledge vault. **Read [AGENTS.md](AGENTS.md)** — it is
the single source of truth for how to navigate and write this vault (the OKF
traversal contract, shared across every agent).

Slash-commands live in \`.claude/commands/\`. Concepts are OKF Markdown with
required frontmatter; indexes are tool-owned — never hand-edit \`index.md\`, run
\`engram reindex\`.
`;

/**
 * Claude Code adapter — a native `CLAUDE.md` pointer, slash-commands (rendered
 * from the shared command set), and a PostToolUse write-hook. The root
 * `AGENTS.md` traversal contract is shared across all agents and emitted by
 * `engram init`, not duplicated here.
 */
export const claudeAdapter: Adapter = {
  id: 'claude',
  label: 'Claude Code (CLAUDE.md pointer + slash-commands + PostToolUse write-hook)',
  files(assetsRoot: string): AdapterFile[] {
    const commands: AdapterFile[] = COMMAND_DEFINITIONS.map((def) => ({
      dest: `.claude/commands/${def.name}.md`,
      content: renderClaudeCommand(def),
    }));
    return [
      { dest: 'CLAUDE.md', content: CLAUDE_POINTER },
      ...commands,
      {
        dest: '.claude/settings.json',
        src: join(assetsRoot, 'claude', 'settings.json'),
        mode: 'merge-json',
      },
    ];
  },
};
