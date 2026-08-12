/**
 * Reading Obsidian's link settings, so `doctor` can report device drift.
 *
 * [ADR-0028](../../specs/decisions/0028-obsidian-owns-link-rewriting.md) decided
 * that **Obsidian owns link rewriting and engram never does**, and specified the
 * detective half that makes that safe:
 *
 * > `doctor` **reads the Obsidian link-format setting** from `.obsidian/app.json`
 * > and warns when a device's setting differs from what the vault's links actually
 * > use. Detected, not configured (ADR-0025).
 *
 * That half was never implemented in v2 — `doctor` emitted a fixed advisory telling
 * the human to go change a setting, and never opened the file. The ADR was written
 * for a laptop, a phone and a tablet editing one synced vault, where the settings
 * are per-vault-per-install and cannot be assumed to match. On that setup the
 * warning *was* the point: the pre-mortem ranked two writers with two formats as
 * the single most likely cause of real vault corruption.
 *
 * Engram still rewrites nothing. This reports.
 */

import type { FileStore } from '../core/ports.js';

export const OBSIDIAN_APP_JSON = '/.obsidian/app.json';

/** What OKF conformance needs: markdown links, absolute targets (ADR-0003). */
export interface LinkSettings {
  /** `false` means `[[wikilinks]]`, which OKF does not use. */
  useMarkdownLinks: boolean;
  /** `absolute` | `relative` | `shortest` — Obsidian's "New link format". */
  newLinkFormat: string;
}

/**
 * Obsidian's own defaults when a key is absent from `app.json`.
 *
 * A fresh install writes very little; missing means default, not unknown. Getting
 * this wrong in the other direction would make `doctor` silent exactly on the
 * untouched installs most likely to be misconfigured.
 */
const OBSIDIAN_DEFAULTS: LinkSettings = { useMarkdownLinks: false, newLinkFormat: 'shortest' };

/** Read the settings, or `null` when this is not an Obsidian vault. */
export async function readLinkSettings(files: FileStore): Promise<LinkSettings | null> {
  const raw = await files.read(OBSIDIAN_APP_JSON);
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return OBSIDIAN_DEFAULTS;
    const o = parsed as Record<string, unknown>;
    return {
      useMarkdownLinks:
        typeof o.useMarkdownLinks === 'boolean'
          ? o.useMarkdownLinks
          : OBSIDIAN_DEFAULTS.useMarkdownLinks,
      newLinkFormat:
        typeof o.newLinkFormat === 'string' ? o.newLinkFormat : OBSIDIAN_DEFAULTS.newLinkFormat,
    };
  } catch {
    // A corrupt app.json is Obsidian's problem, not a reason for doctor to fail.
    return OBSIDIAN_DEFAULTS;
  }
}

/**
 * What to warn about, given the settings on **this** device.
 *
 * Returns one line per problem and nothing at all when the device is configured
 * the way the vault's links are written — a doctor that always says something
 * teaches people to stop reading it.
 */
export function linkSettingWarnings(settings: LinkSettings): string[] {
  const out: string[] = [];

  if (!settings.useMarkdownLinks) {
    out.push(
      `[obsidian] this device is set to write [[wikilinks]]. OKF uses standard markdown links ` +
        `(ADR-0003), and Obsidian rewrites targets on move in whichever format is set here — ` +
        `so a file moved on this device will write links the rest of the vault does not use. ` +
        `Settings → Files & Links → "Use [[Wikilinks]]" off.`,
    );
  }

  if (settings.newLinkFormat !== 'absolute') {
    out.push(
      `[obsidian] this device's "New link format" is "${settings.newLinkFormat}", not "absolute". ` +
        `The setting is per-vault-per-install, so devices can disagree and each will rewrite ` +
        `moved links its own way (ADR-0028). Settings → Files & Links → New link format → ` +
        `"Absolute path in vault".`,
    );
  }

  return out;
}
