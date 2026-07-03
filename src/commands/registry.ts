/**
 * The Engram command surface. Phase 0 registers these as stubs so the CLI shape
 * is stable; each `phase` notes when the real behavior lands (see the roadmap).
 */
export interface CommandSpec {
  /** Subcommand name as typed on the CLI. */
  name: string;
  /** One-line description shown in `engram --help`. */
  summary: string;
  /** The phase that implements the real behavior. */
  phase: string;
}

export const COMMANDS: readonly CommandSpec[] = [
  {
    name: 'init',
    summary: 'Scaffold an OKF-conformant vault in the current directory.',
    phase: 'Phase 1',
  },
  {
    name: 'capture',
    summary: 'Drop a raw note into the inbox for later refinement.',
    phase: 'Phase 1',
  },
  {
    name: 'refine',
    summary: 'Turn an inbox item into a filed, frontmatter-complete concept.',
    phase: 'Phase 1',
  },
  {
    name: 'link',
    summary: 'Suggest and insert cross-links between related concepts.',
    phase: 'Phase 1',
  },
  {
    name: 'reindex',
    summary: 'Regenerate index.md files from concept frontmatter.',
    phase: 'Phase 1',
  },
  {
    name: 'recall',
    summary: 'Navigate the vault and return the minimal relevant concepts.',
    phase: 'Phase 2',
  },
  {
    name: 'promote',
    summary: 'Import a momentum ADR/learning as an OKF concept.',
    phase: 'Phase 4',
  },
] as const;
