/**
 * The wiring that makes a skill reachable: creating one, being told how to run it,
 * and being told when it is not going to work.
 */

import { describe, expect, it } from 'vitest';
import { main } from '../../src/cli.js';
import { doctor, formatReport } from '../../src/ops/doctor.js';
import { CONFIG_PATH } from '../../src/policy/config.js';
import { init } from '../../src/ops/init.js';
import { reindex } from '../../src/ops/reindex.js';
import { DEFAULTS } from '../../src/policy/config.js';
import { discoverSkills, scaffoldSkill, parseSkill } from '../../src/policy/skills.js';
import { generateAgentsMd } from '../../src/surface/agents-md.js';
import { auditSkills } from '../../src/surface/render-skills.js';
import { skillTargets } from '../../src/surface/adapters.js';
import { fixedClock, memoryFileStore } from '../../src/substrate/index.js';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const clock = fixedClock('2026-08-23T09:00:00.000Z');
const noObsidian = { has: async () => false };

describe('create-skill', () => {
  it('ships as a built-in, so it can be invoked rather than explained', async () => {
    const { skills } = await discoverSkills(memoryFileStore());
    const s = skills.find((s) => s.name === 'create-skill');
    expect(s).toBeDefined();
    expect(s!.origin).toBe('built-in');
  });

  it('sends the agent to the source directory, never to a generated one', async () => {
    const { skills } = await discoverSkills(memoryFileStore());
    const body = skills.find((s) => s.name === 'create-skill')!.body;
    expect(body).toContain('engram/skills/<name>/SKILL.md');
    expect(body).toMatch(/Never write a skill anywhere else/);
    expect(body).toMatch(/overwritten on the next `engram reindex`/);
  });

  it('warns that a description decides whether the skill is ever loaded', () => {
    // The single most common way a skill ends up useless: a description that
    // restates the title, so nothing ever matches against it.
    const body = scaffoldSkill('x');
    expect(body).toMatch(/when to reach for it/i);
  });
});

describe('engram skill new', () => {
  it('writes the directory layout and renders it immediately', async () => {
    // A scaffold you then have to reindex by hand is one most people will believe
    // is broken.
    const root = mkdtempSync(join(tmpdir(), 'engram-skillnew-'));
    try {
      expect(await main(['init', '--vault', root])).toBe(0);
      expect(await main(['skill', 'new', 'my-thing', '--vault', root])).toBe(0);

      const source = readFileSync(join(root, 'engram/skills/my-thing/SKILL.md'), 'utf8');
      expect(parseSkill(source, 'vault')).toHaveProperty('skill');
      const rendered = readFileSync(join(root, '.claude/skills/my-thing/SKILL.md'), 'utf8');
      expect(rendered).toContain('my-thing');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('the contract says how to invoke an operation', () => {
  it('names the shell as the way to run one', async () => {
    // FEAT-009's actual cause: the contract listed `engram capture [text]` in a
    // table and never said whether that was a shell command, a CLI subcommand or
    // an MCP tool. A capability an agent cannot reach is not a capability.
    const md = generateAgentsMd(DEFAULTS, 'default');
    expect(md).toContain('## How to run these');
    expect(md).toContain('```bash');
    expect(md).toMatch(/command-line tool/);
  });

  it('gives the slash form for every agent, with the right separator', () => {
    const md = generateAgentsMd(DEFAULTS, 'default');
    expect(md).toContain('/engram:format');
    expect(md).toContain('/engram-format');
  });

  it("names the user's own skills unprefixed", async () => {
    const files = memoryFileStore();
    await init(files, clock);
    await files.write(
      '/engram/skills/mine/SKILL.md',
      '---\nname: mine\ndescription: d\nmetadata:\n  engram-uses: format\n---\n\nb',
    );
    await reindex(files, clock);
    const md = (await files.read('/AGENTS.md'))!;
    expect(md).toContain('`/mine`');
  });

  it('states the host constraints engram cannot fix', () => {
    // The trust dialog and the no-walk-up rule are Claude Code's, not engram's. It
    // cannot change them, so it has to say them — otherwise a session started one
    // directory down silently has no engram skills and nothing explains why.
    const md = generateAgentsMd(DEFAULTS, 'default');
    expect(md).toMatch(/workspace trust dialog/);
    expect(md).toMatch(/does not walk up|not walk up/);
  });

  it('says MCP is optional and that approving is never a tool', () => {
    const md = generateAgentsMd(DEFAULTS, 'default');
    expect(md).toMatch(/never an MCP tool/);
  });
});

describe('doctor reports what a person can act on', () => {
  it('says nothing about skills in a directory that is not a vault', async () => {
    // Same reasoning planUpgrade uses: a warning is only worth reading if it is
    // actionable, and "your skills are not rendered" is noise in a plain folder.
    const r = await doctor(memoryFileStore({ '/a.md': '# a' }), noObsidian);
    expect(r.warnings.filter((w) => w.includes('[skill'))).toEqual([]);
  });

  it('reports unrendered skills once, not once per file', async () => {
    // Twenty-seven warnings saying the same thing is the same as no warning.
    const files = memoryFileStore();
    await init(files, clock);
    await files.write(
      '/engram/skills/unrendered/SKILL.md',
      '---\nname: unrendered\ndescription: d\nmetadata:\n  engram-uses: format\n---\n\nb',
    );
    const r = await doctor(files, noObsidian);
    const hits = r.warnings.filter((w) => w.includes('[skill-unrendered]'));
    expect(hits).toHaveLength(1);
    expect(hits[0]).toContain('engram reindex');
  });

  it('reports a stale render and does not pretend it will remove it', async () => {
    const files = memoryFileStore();
    await init(files, clock);
    await files.write(
      '/engram/skills/connect-the-dots/SKILL.md',
      '---\nname: connect-the-dots\ndescription: d\nmetadata:\n  engram-uses: format\n---\n\nmine',
    );
    await reindex(files, clock);

    const r = await doctor(files, noObsidian);
    // One warning, listing every leftover — there is one per agent, because the
    // built-in had been rendered to all of them before the override existed.
    const stale = r.warnings.filter((w) => w.includes('[skill-stale]'));
    expect(stale).toHaveLength(1);
    expect(stale[0]).toMatch(/will not delete them/);
    for (const agent of skillTargets()) {
      expect(stale[0], agent.name).toContain(`${agent.skills.dir}/`);
    }
  });

  it('says when a file in its way is not its own', async () => {
    const files = memoryFileStore();
    await init(files, clock);
    await files.write(
      '/.claude/skills/engram/skills/format/SKILL.md',
      '---\nname: format\ndescription: someone else\n---\n\ntheirs',
    );
    const r = await doctor(files, noObsidian);
    expect(r.warnings.filter((w) => w.includes('[not-ours]'))).toHaveLength(1);
  });

  it('warns that a hand-edited render is about to be lost, and names the source', async () => {
    // Acceptance criterion 5. There is no lock on these files and there should not
    // be — they are plain files on your disk — so the only honest protection is
    // telling you before the edit disappears, and saying where it belongs instead.
    const files = memoryFileStore();
    await init(files, clock);
    const path = '/.claude/skills/engram/skills/format/SKILL.md';
    await files.write(path, `${(await files.read(path))!}\n\nMY OWN NOTES\n`);

    const r = await doctor(files, noObsidian);
    const hits = r.warnings.filter((w) => w.includes('[skill-edited]'));
    expect(hits).toHaveLength(1);
    expect(hits[0]).toContain(path);
    expect(hits[0]).toContain('/engram/skills/<name>/SKILL.md');
  });

  it("does not call an older version's render a hand edit", async () => {
    // A copy written by an earlier engram differs too, for a reason that has nothing
    // to do with editing. Reporting it as one would be wrong, and the sort of
    // warning people learn to scroll past.
    const files = memoryFileStore();
    await init(files, clock);
    const path = '/.claude/skills/engram/skills/format/SKILL.md';
    const older = (await files.read(path))!.replace(/engram-managed: .*/, 'engram-managed: 0.0.1');
    await files.write(path, older);

    const r = await doctor(files, noObsidian);
    expect(r.warnings.filter((w) => w.includes('[skill-edited]'))).toEqual([]);
  });

  it('a freshly initialised vault reports no skill problems at all', async () => {
    const files = memoryFileStore();
    await init(files, clock);
    const r = await doctor(files, noObsidian);
    expect(r.warnings.filter((w) => w.includes('[skill'))).toEqual([]);
  });
});

describe('doctor shows the agent surface state (phase 19)', () => {
  it('lists every registered agent with contract strategy, counts, verification', async () => {
    const files = memoryFileStore();
    await init(files, clock);
    const r = await doctor(files, noObsidian);

    expect(r.surfaces.map((s) => s.agent)).toEqual(['claude', 'antigravity', 'gemini', 'opencode']);

    const claude = r.surfaces.find((s) => s.agent === 'claude')!;
    expect(claude.contract).toBe('/CLAUDE.md (rendered copy)');
    expect(claude.skills).toBeGreaterThan(0);
    expect(claude.commands).toBe(0);

    const opencode = r.surfaces.find((s) => s.agent === 'opencode')!;
    expect(opencode.contract).toBe('AGENTS.md (native)');
    expect(opencode.skills).toBeGreaterThan(0);
    expect(opencode.commands).toBeGreaterThan(0);
    // ADR-0044's rule, visible in output: the verification claim names its
    // evidence rather than asserting itself.
    expect(opencode.verified).toMatch(/live-session/);
  });

  it('the formatted report carries the surfaces section', async () => {
    const files = memoryFileStore();
    await init(files, clock);
    const out = formatReport(await doctor(files, noObsidian));
    expect(out).toContain('agent surfaces (4 registered)');
    expect(out).toContain('opencode: contract AGENTS.md (native)');
  });

  it('a hand-edited command is reported with the command remedy, not the skill one', async () => {
    const files = memoryFileStore();
    await init(files, clock);
    const path = '/.opencode/commands/engram-format.md';
    await files.write(path, `${(await files.read(path))!}\n\nMY OWN NOTES\n`);

    const r = await doctor(files, noObsidian);
    const hits = r.warnings.filter((w) => w.includes('[command-edited]'));
    expect(hits).toHaveLength(1);
    expect(hits[0]).toContain(path);
    expect(hits[0]).toContain('no user-editable source');
    expect(r.warnings.filter((w) => w.includes('[skill-edited]'))).toEqual([]);
  });

  it('an agent whose targets hold nothing renders a surface-unrendered warning', async () => {
    // The FileStore port cannot delete, so "never rendered" is simulated at the
    // unit boundary: a vault that is initialised (so the skill checks run) but
    // whose reindex has never populated the render targets.
    const files = memoryFileStore({ [CONFIG_PATH]: '{}' });
    const r = await doctor(files, noObsidian);

    const hits = r.warnings.filter((w) => w.includes('[surface-unrendered]'));
    for (const agent of ['claude', 'gemini', 'opencode']) {
      expect(hits.join(' '), agent).toContain(`\`${agent}\``);
    }
  });
});

describe('auditSkills is read-only', () => {
  it('writes nothing', async () => {
    const files = memoryFileStore();
    await init(files, clock);
    const before = (await files.list()).sort();
    const { skills } = await discoverSkills(files);
    await auditSkills(files, skills);
    expect((await files.list()).sort()).toEqual(before);
  });
});
