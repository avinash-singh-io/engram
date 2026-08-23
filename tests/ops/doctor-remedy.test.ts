/**
 * `doctor` must say what to do, not only what broke (Group 5).
 *
 * BUG-011's original message was `frontmatter did not parse: not a key: value pair:
 * - finance`. It named no key, said nothing about what engram *does* read, and did
 * not mention that the note had just traded a stable identity for a path. Every one
 * of those omissions is asserted against here.
 */

import { describe, expect, it } from 'vitest';
import { doctor } from '../../src/ops/doctor.js';
import { memoryFileStore } from '../../src/substrate/fs.js';

const detector = { has: async () => false };
const vault = (files: Record<string, string>) => memoryFileStore(files);
const all = (r: { warnings: string[]; failures: string[] }) =>
  [...r.warnings, ...r.failures].join('\n');

describe('doctor names the remedy', () => {
  it('names the line and what engram reads instead', async () => {
    const r = await doctor(
      vault({ '/n.md': '---\nid: n\nweird: &anchor v\n---\n\nbody' }),
      detector,
    );
    const out = all(r);
    expect(out).toContain('[frontmatter]');
    expect(out).toContain('anchor');
    expect(out).toMatch(/engram reads \d+ YAML constructs/);
  });

  it('flags identity lost to a parse failure, and says why it matters', async () => {
    const r = await doctor(vault({ '/n.md': '---\nid: &a x\nauthor: me\n---\n\nbody' }), detector);
    const out = all(r);
    expect(out).toContain('[identity-lost]');
    expect(out).toContain('break every relation');
  });

  it('does not flag a note that simply never had an id', async () => {
    // ADR-0021: a missing slug is a legitimate state. Only identity lost *to a parse
    // failure* is the data-integrity event, and conflating them would make the new
    // warning noise on every hand-written note.
    const r = await doctor(vault({ '/n.md': '---\nauthor: me\n---\n\nbody' }), detector);
    expect(all(r)).not.toContain('[identity-lost]');
  });

  it('stays a warning rather than failing the command', async () => {
    // ADR-0021 says a missing slug is "a warning and a fallback, never an error".
    // Raising this to a failure is arguable but amends that ADR, so it does not
    // happen quietly inside a health check.
    const r = await doctor(vault({ '/n.md': '---\nid: &a x\n---\n\nbody' }), detector);
    expect(r.failures).toEqual([]);
    expect(r.warnings.join('\n')).toContain('[identity-lost]');
  });

  it('says nothing about a note it reads cleanly', async () => {
    const r = await doctor(
      vault({ '/n.md': '---\nokf_version: 0.2\nid: n\npart-of:\n  - a\n---\n\nbody' }),
      detector,
    );
    const out = all(r);
    expect(out).not.toContain('[frontmatter]');
    expect(out).not.toContain('[identity-lost]');
  });
});
