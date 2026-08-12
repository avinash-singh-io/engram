/** TIER 3 — implements `core/ports.ts`. Detection over configuration (ADR-0025). */
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { Detector } from '../core/ports.js';

const MARKERS: Record<string, string> = {
  git: '.git',
  obsidian: '.obsidian',
  engram: '.engram',
};

/** Detects environment facts by looking for their markers under `root`. */
export function filesystemDetector(root: string): Detector {
  return {
    async has(fact) {
      const marker = MARKERS[fact];
      if (marker === undefined) return false;
      try {
        await access(join(root, marker));
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** A fixed fact set. An unknown fact is absent, never an error. */
export function staticDetector(facts: Record<string, boolean>): Detector {
  return {
    async has(fact) {
      return facts[fact] ?? false;
    },
  };
}
