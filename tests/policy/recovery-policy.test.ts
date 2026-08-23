/**
 * Three consumers, three policies (ADR-0047 §4).
 *
 * `parseFrontmatter` degrades per key. That is right for a note and wrong for a
 * security config, so the asymmetry is asserted by name here rather than left to be
 * inferred from four call sites. A reader who finds it surprising should find this
 * file.
 */

import { describe, expect, it } from 'vitest';
import { memoryFileStore } from '../../src/substrate/fs.js';
import { GUARDRAILS_PATH, loadGuardrails, DEFAULTS } from '../../src/policy/config.js';
import { parseSkill } from '../../src/policy/skills.js';
import { readNode } from '../../src/format/registry.js';

const withBadKey = (extra: string) => `---\nid: n\nweird: &anchor v\n${extra}\n---\n\nbody`;

describe('notes RECOVER', () => {
  it('keeps every readable key when one fails', () => {
    const { node } = readNode(withBadKey('author: avinash'), '/n.md');
    expect(node.id).toBe('n');
    expect(node.stamp.by).toBe('avinash');
  });

  it('warns about the failing key by name', () => {
    const { warnings } = readNode(withBadKey('author: avinash'), '/n.md');
    expect(warnings.some((w) => w.includes('weird'))).toBe(true);
  });
});

describe('guardrails FAIL CLOSED', () => {
  const load = async (body: string) => {
    return loadGuardrails(memoryFileStore({ [GUARDRAILS_PATH]: body }));
  };

  it('applies defaults rather than a partially read file', async () => {
    // `enabled` is readable here. Recovering it would be the permissive answer:
    // the unreadable line might have been a `pathScope` that no longer scopes.
    const { config } = await load('---\nenabled: [require-sources]\nweird: &a v\n---\n');
    expect(config).toEqual(DEFAULTS);
  });

  it('never yields a looser config than the file asked for', async () => {
    const { config } = await load('---\nenabled: []\nweird: &a v\n---\n');
    // `enabled: []` alone would disable every rule. Failing closed keeps them all on.
    expect(config.enabled.length).toBe(DEFAULTS.enabled.length);
  });

  it('says the file was not applied, and why', async () => {
    const { warnings } = await load('---\nenabled: [require-sources]\nweird: &a v\n---\n');
    expect(warnings.join(' ')).toContain('NOT applied');
    expect(warnings.join(' ')).toContain('weird');
  });

  it('still applies a file it can read completely', async () => {
    const { config, warnings } = await load('---\nenabled: [require-sources]\n---\n');
    expect(config.enabled).toEqual(['require-sources']);
    expect(warnings).toEqual([]);
  });
});

describe('skills REJECT', () => {
  it('refuses a skill with an unreadable key rather than half-loading it', () => {
    const result = parseSkill(
      '---\nname: s\ndescription: d\nuses: [capture]\nweird: &a v\n---\n\nbody',
      'vault',
    );
    expect('error' in result).toBe(true);
  });

  it('names the failing key in the refusal', () => {
    const result = parseSkill(
      '---\nname: s\ndescription: d\nuses: [capture]\nweird: &a v\n---\n\nbody',
      'vault',
    );
    expect('error' in result && result.error.reason).toContain('weird');
  });

  it('still loads a skill it can read completely', () => {
    const result = parseSkill(
      '---\nname: s\ndescription: d\nuses: [capture]\n---\n\nbody',
      'vault',
    );
    expect('skill' in result).toBe(true);
  });
});
