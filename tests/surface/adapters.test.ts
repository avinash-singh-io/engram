import { describe, expect, it } from 'vitest';
import {
  AGENTS,
  BEGIN,
  END,
  spliceContract,
  writeContracts,
  type AgentDescriptor,
} from '../../src/surface/adapters.js';
import { generateAgentsMd } from '../../src/surface/agents-md.js';
import { guardrailNames } from '../../src/policy/guardrails.js';
import { memoryFileStore } from '../../src/substrate/index.js';

const contract = () => generateAgentsMd({ enabled: guardrailNames() });

/** Claims that exist only in the real contract — a pointer carried none of them. */
const CLAIMS = [
  'Never validates, never fails',
  'cannot infer a relationship',
  'may be empty',
  'repair is trivial',
] as const;

/**
 * ADR-0017, restored.
 *
 * v2 shipped these as pointers — `CLAUDE.md` saying "read AGENTS.md" — citing
 * ADR-0011 without noticing ADR-0017 amends it. ADR-0017's reason is the one that
 * decides it: an agent loads only its own instructions file and does **not**
 * reliably follow a reference to another one, so a pointer means the agent never
 * gets the contract at all. The old tests asserted the pointer contained none of
 * the contract; these assert the opposite, because the opposite is correct.
 */
describe('every agent file carries the contract in full', () => {
  it.each(AGENTS)('$name gets the real contract, not a reference to it', async (agent) => {
    const files = memoryFileStore();
    await writeContracts(files, contract());

    const written = (await files.read(agent.contractFile)) ?? '';
    for (const claim of CLAIMS) expect(written).toContain(claim);
    for (const rule of guardrailNames()) expect(written).toContain(rule);
  });

  it('so no agent file merely points somewhere else', async () => {
    const files = memoryFileStore();
    await writeContracts(files, contract());
    const claude = (await files.read('/CLAUDE.md')) ?? '';

    expect(claude).not.toMatch(/read (it|AGENTS\.md) first/i);
    expect(claude.length).toBeGreaterThan(500);
  });

  /**
   * The duplication is only safe because there is one source. If two files could
   * disagree, ADR-0011's original objection would be back.
   */
  it('every copy is byte-identical inside the markers', async () => {
    const files = memoryFileStore();
    await writeContracts(files, contract());

    const regions = await Promise.all(
      AGENTS.map(async (a) => {
        const raw = (await files.read(a.contractFile)) ?? '';
        return raw.slice(raw.indexOf(BEGIN), raw.indexOf(END));
      }),
    );
    expect(new Set(regions).size).toBe(1);
  });

  it('declares the region generated, so nobody edits inside it', async () => {
    const files = memoryFileStore();
    await writeContracts(files, contract());
    expect((await files.read('/GEMINI.md')) ?? '').toContain('Do not edit');
  });

  /** ADR-0011's descriptor principle survives: adding an agent adds no code. */
  it('renders into an agent it has never heard of, given a descriptor', async () => {
    const files = memoryFileStore();
    const invented: AgentDescriptor = {
      name: 'somethingnew',
      contractFile: '/SOMETHINGNEW.md',
      why: 'it reads its own file',
    };

    const result = await writeContracts(files, contract(), [invented]);
    expect(result.written).toEqual(['/SOMETHINGNEW.md']);
    expect((await files.read('/SOMETHINGNEW.md')) ?? '').toContain(CLAIMS[0]);
  });
});

/**
 * The half that makes rendering-in-full safe on a vault you already own. Engram
 * owns what is between the markers and nothing else.
 */
describe('a file the user already wrote keeps everything they wrote', () => {
  const mine = '# My own CLAUDE.md\n\nAlways run the tests before you commit.\n';

  it('appends the contract below their content, not over it', async () => {
    const files = memoryFileStore({ '/CLAUDE.md': mine });
    const result = await writeContracts(files, contract());

    const after = (await files.read('/CLAUDE.md')) ?? '';
    expect(after).toContain('Always run the tests before you commit.');
    expect(after.indexOf('My own CLAUDE.md')).toBeLessThan(after.indexOf(BEGIN));
    expect(result.merged).toContain('/CLAUDE.md');
  });

  it('reports merged separately from written, so init can say which happened', async () => {
    const files = memoryFileStore({ '/CLAUDE.md': mine });
    const result = await writeContracts(files, contract());

    expect(result.merged).toEqual(['/CLAUDE.md']);
    expect(result.written).toEqual(['/.antigravity/AGENTS.md', '/GEMINI.md']);
  });

  /** Re-running must not stack blocks — this is what makes reindex idempotent. */
  it('replaces its own region instead of appending a second one', async () => {
    const files = memoryFileStore({ '/CLAUDE.md': mine });
    await writeContracts(files, contract());
    await writeContracts(files, contract());
    await writeContracts(files, contract());

    const after = (await files.read('/CLAUDE.md')) ?? '';
    expect(after.split(BEGIN)).toHaveLength(2);
    expect(after.split(END)).toHaveLength(2);
    expect(after).toContain('Always run the tests before you commit.');
  });

  it('picks up a changed contract on the next run', async () => {
    const files = memoryFileStore({ '/CLAUDE.md': mine });
    await writeContracts(files, contract());
    await writeContracts(files, generateAgentsMd({ enabled: ['no-delete'], proposeOnly: ['/x/'] }));

    const after = (await files.read('/CLAUDE.md')) ?? '';
    expect(after).toContain('/x/');
    expect(after).toContain('Always run the tests before you commit.');
  });

  it('preserves content written below the block too', async () => {
    const files = memoryFileStore();
    await writeContracts(files, contract());
    const generated = (await files.read('/CLAUDE.md')) ?? '';
    await files.write('/CLAUDE.md', `${generated}\n## My notes\n\nkeep me\n`);

    await writeContracts(files, contract());
    expect((await files.read('/CLAUDE.md')) ?? '').toContain('keep me');
  });
});

describe('spliceContract', () => {
  it('is the whole file when there was none', () => {
    const out = spliceContract(null, 'THE CONTRACT');
    expect(out.startsWith(BEGIN)).toBe(true);
    expect(out.trimEnd().endsWith(END)).toBe(true);
  });

  it('treats a whitespace-only file as empty', () => {
    expect(spliceContract('\n  \n', 'X').startsWith(BEGIN)).toBe(true);
  });

  it('keeps text on both sides of an existing region', () => {
    const before = `TOP\n\n${BEGIN}\n\nOLD\n\n${END}\n\nBOTTOM\n`;
    const out = spliceContract(before, 'NEW');

    expect(out).toContain('TOP');
    expect(out).toContain('BOTTOM');
    expect(out).toContain('NEW');
    expect(out).not.toContain('OLD');
  });

  it('ends with exactly one newline', () => {
    for (const existing of [null, 'mine', `${BEGIN}\n\nold\n\n${END}\n`]) {
      expect(spliceContract(existing, 'X')).toMatch(/[^\n]\n$/);
    }
  });

  it('ignores a stray END with no BEGIN rather than mangling the file', () => {
    const out = spliceContract(`mine ${END} still mine`, 'X');
    expect(out).toContain('still mine');
    expect(out).toContain('X');
  });
});
