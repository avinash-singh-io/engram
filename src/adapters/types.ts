/** Agent adapter seam (shared foundation). Phase 4 adds Codex / Antigravity. */

export interface AdapterFile {
  /** Vault-relative destination path. */
  dest: string;
  /**
   * Absolute source path in the bundled assets tree. Mutually exclusive with
   * `content`; exactly one of the two must be set.
   */
  src?: string;
  /**
   * Inline file content, rendered in-code (e.g. a command surface built from the
   * shared command-definition set). Preferred over `src` when present. Phase 4
   * added this so a new agent is a thin descriptor, not a fork of asset files.
   */
  content?: string;
  /** How to handle an existing file: skip (default, non-destructive) or deep-merge JSON. */
  mode?: 'skip' | 'merge-json';
}

export interface Adapter {
  /** Stable id, e.g. 'claude'. */
  id: string;
  /** Human-facing one-liner (used by `engram init --agent` help + docs). */
  label: string;
  /**
   * The file this agent loads its instructions from — Claude Code reads
   * `CLAUDE.md`, Codex and others read `AGENTS.md`. `engram init` renders the
   * FULL traversal contract into this file (agents load only their own file, so
   * a cross-file pointer is unreliable — the contract must be self-contained in
   * each). Single source, generated per agent → no manual duplication (ADR-0017).
   */
  contractFile: string;
  /** The files this adapter scaffolds into a vault. */
  files(assetsRoot: string): AdapterFile[];
}
