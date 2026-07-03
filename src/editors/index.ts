import { obsidianEditor } from './obsidian';
import type { EditorAdapter, EditorSetupResult } from './types';

export type { EditorAdapter, EditorSetupResult } from './types';
export { obsidianEditor };

/** All registered editor adapters. Add an editor with one entry + a descriptor. */
export const EDITOR_ADAPTERS: readonly EditorAdapter[] = [obsidianEditor];

/** Editor adapters whose environment is present in the vault. */
export function detectedEditors(vaultRoot: string): EditorAdapter[] {
  return EDITOR_ADAPTERS.filter((e) => e.detect(vaultRoot));
}

/** Configure every detected editor for OKF conformance (idempotent). */
export function setupEditors(vaultRoot: string): EditorSetupResult[] {
  return detectedEditors(vaultRoot).map((e) => e.setup(vaultRoot));
}
