import { describe, expect, it } from 'vitest';
import {
  DEFAULTS,
  GUARDRAILS_PATH,
  loadGuardrails,
  scaffoldGuardrails,
} from '../../src/policy/config.js';
import { checkAll, guardrailNames } from '../../src/policy/guardrails.js';
import { makeNode } from '../../src/core/model.js';
import { memoryFileStore } from '../../src/substrate/index.js';

const vault = (body: string) => memoryFileStore({ [GUARDRAILS_PATH]: body });
const fm = (...lines: string[]) => ['---', ...lines, '---', '', '# Guardrails'].join('\n');

const change = (path = '/decisions/x.md') => ({
  path,
  node: makeNode({
    id: 'x',
    path,
    stamp: { by: 'agent', at: '2026-08-13T09:00:00.000Z', until: null },
    body: '# x',
  }),
  edges: [],
  content: '# x',
});
const ctx = { existing: [], edges: [], writtenThisRun: 0 };

/**
 * BUG-003. Phase 10 shipped `propose-only`, `path-scope` and `rate-limit`, all of
 * which read only from configuration, and nothing ever loaded a configuration.
 * They had no effect for two releases and every test passed, because the tests
 * construct configs directly and never ask where a real one comes from.
 */
describe('a vault can finally configure its guardrails', () => {
  it('falls back to the defaults when the file is absent', async () => {
    const { config, warnings } = await loadGuardrails(memoryFileStore());
    expect(config).toEqual(DEFAULTS);
    expect(warnings).toEqual([]);
  });

  it('loads proposeOnly, which is what makes the queue reachable at all', async () => {
    const { config } = await loadGuardrails(vault(fm('proposeOnly: [/decisions/]')));
    expect(config.proposeOnly).toEqual(['/decisions/']);
  });

  it('and the loaded config actually defers at the gate', async () => {
    const { config } = await loadGuardrails(
      vault(fm('enabled: [propose-only]', 'proposeOnly: [/decisions/]')),
    );
    expect(checkAll(change(), ctx, config)).toMatchObject({ disposition: 'queue' });
  });

  it('coerces rateLimit, which the YAML subset hands back as a string', async () => {
    const { config } = await loadGuardrails(vault(fm('rateLimit: 20')));
    expect(config.rateLimit).toBe(20);
    expect(typeof config.rateLimit).toBe('number');
  });

  it('narrows enabled to what a vault asks for', async () => {
    const { config } = await loadGuardrails(vault(fm('enabled: [no-delete]')));
    expect(config.enabled).toEqual(['no-delete']);
  });
});

describe('a misconfigured file says so rather than failing quietly', () => {
  /**
   * The sharp edge. `path-scope` reads an empty list as "no path is permitted" and
   * refuses every write, while a human writing `pathScope: []` almost certainly
   * means "not configured yet". Honouring it literally bricks the vault; ignoring
   * it silently is BUG-003 again.
   */
  it('treats `pathScope: []` as unset, loudly', async () => {
    const { config, warnings } = await loadGuardrails(vault(fm('pathScope: []')));

    expect(config.pathScope).toBeUndefined();
    expect(warnings.join('\n')).toMatch(/would forbid every write/);
  });

  it('and a write is not refused because of it', async () => {
    const { config } = await loadGuardrails(vault(fm('enabled: [path-scope]', 'pathScope: []')));
    expect(checkAll(change(), ctx, config)).toBeNull();
  });

  it('a real pathScope still restricts', async () => {
    const { config } = await loadGuardrails(
      vault(fm('enabled: [path-scope]', 'pathScope: [/concepts/]')),
    );
    expect(checkAll(change('/elsewhere/x.md'), ctx, config)).toMatchObject({
      rule: 'path-scope',
      disposition: 'reject',
    });
  });

  it('names an unknown rule and drops it, rather than crashing', async () => {
    const { config, warnings } = await loadGuardrails(
      vault(fm('enabled: [no-delete, rm-rf, propose-only]')),
    );

    expect(config.enabled).toEqual(['no-delete', 'propose-only']);
    expect(warnings.join('\n')).toMatch(/unknown guardrail "rm-rf"/);
    expect(warnings.join('\n')).toContain(guardrailNames().join(', '));
  });

  it('falls back to defaults on malformed frontmatter, and warns', async () => {
    const { config, warnings } = await loadGuardrails(
      memoryFileStore({ [GUARDRAILS_PATH]: '---\nnot valid\n---\n' }),
    );
    expect(config).toEqual(DEFAULTS);
    expect(warnings).toHaveLength(1);
  });

  it('warns when rateLimit is not a number', async () => {
    const { warnings, config } = await loadGuardrails(vault(fm('rateLimit: soon')));
    expect(warnings.join('\n')).toMatch(/rateLimit is not a number/);
    expect(config.rateLimit).toBeUndefined();
  });
});

describe('the scaffold', () => {
  it('parses back into a valid configuration', async () => {
    const { config, warnings } = await loadGuardrails(
      memoryFileStore({ [GUARDRAILS_PATH]: scaffoldGuardrails() }),
    );
    expect(warnings).toEqual([]);
    expect(config.enabled).toEqual(guardrailNames());
  });

  /**
   * A fresh vault must not start holding writes for review that nobody asked to
   * review — the same reasoning that made ADR-0041's HTTP transport opt-in.
   */
  it('ships proposeOnly empty, so init changes no behaviour', async () => {
    const { config } = await loadGuardrails(
      memoryFileStore({ [GUARDRAILS_PATH]: scaffoldGuardrails() }),
    );
    expect(config.proposeOnly).toEqual([]);
    expect(checkAll(change(), ctx, config)).toBeNull();
  });

  it('leaves pathScope commented out rather than empty', () => {
    expect(scaffoldGuardrails()).toMatch(/^# pathScope:/m);
    expect(scaffoldGuardrails()).not.toMatch(/^pathScope: \[\]/m);
  });

  it('tells the reader that approving is a human action', () => {
    expect(scaffoldGuardrails()).toMatch(/no MCP tool for it/i);
  });
});
