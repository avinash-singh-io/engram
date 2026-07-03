/**
 * Editor adapter seam — engram is editor-agnostic. It never *depends* on an
 * editor; it only configures one it *detects* in the vault (ADR-0015). A new
 * editor is one descriptor module + one registry entry.
 */
export interface EditorSetupResult {
  editor: string;
  /** Human-readable list of changes applied (empty = already conformant). */
  changes: string[];
}

export interface EditorAdapter {
  id: string;
  label: string;
  /** True if this editor is present in the vault (e.g. `.obsidian/` exists). */
  detect(vaultRoot: string): boolean;
  /** Configure the editor for OKF conformance. Idempotent + non-destructive. */
  setup(vaultRoot: string): EditorSetupResult;
}
