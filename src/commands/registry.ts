import type { Command } from 'commander';
import { registerCapture } from './capture';
import { registerInit } from './init';
import { registerLink } from './link';
import { registerRecall } from './recall';
import { registerRefine } from './refine';
import { registerReindex } from './reindex';

/**
 * The Engram command surface. `register` wires a real command onto the program;
 * specs without it fall back to a "not yet implemented" stub. Each later phase
 * adds ONE entry (or fills in `register`) — never edits the dispatch loop
 * (shared-foundation keystone; see parallel-execution-plan.md).
 */
export interface CommandSpec {
  name: string;
  summary: string;
  phase: string;
  register?: (program: Command) => void;
}

export const COMMANDS: readonly CommandSpec[] = [
  {
    name: 'init',
    summary: 'Scaffold an OKF-conformant vault in the current directory.',
    phase: 'Phase 1',
    register: registerInit,
  },
  {
    name: 'capture',
    summary: 'Drop a raw note into the inbox for later refinement.',
    phase: 'Phase 1',
    register: registerCapture,
  },
  {
    name: 'refine',
    summary: 'Turn an inbox item into a filed, frontmatter-complete concept.',
    phase: 'Phase 1',
    register: registerRefine,
  },
  {
    name: 'link',
    summary: 'Suggest and insert cross-links between related concepts.',
    phase: 'Phase 1',
    register: registerLink,
  },
  {
    name: 'reindex',
    summary: 'Regenerate index.md files from concept frontmatter.',
    phase: 'Phase 1',
    register: registerReindex,
  },
  {
    name: 'recall',
    summary: 'Navigate the vault and return the minimal relevant concepts.',
    phase: 'Phase 2',
    register: registerRecall,
  },
  {
    name: 'promote',
    summary: 'Import a momentum ADR/learning as an OKF concept.',
    phase: 'Phase 4',
  },
] as const;
