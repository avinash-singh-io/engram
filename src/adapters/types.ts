/** Agent adapter seam (shared foundation). Phase 4 adds Codex / Antigravity. */

export interface AdapterFile {
  /** Vault-relative destination path. */
  dest: string;
  /** Absolute source path in the bundled assets tree. */
  src: string;
  /** How to handle an existing file: skip (default, non-destructive) or deep-merge JSON. */
  mode?: 'skip' | 'merge-json';
}

export interface Adapter {
  /** Stable id, e.g. 'claude'. */
  id: string;
  /** The files this adapter scaffolds into a vault. */
  files(assetsRoot: string): AdapterFile[];
}
