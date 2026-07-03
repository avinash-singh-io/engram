import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ReadLedger } from '../../src/retrieval/reader';
import { FIXTURE_VAULT } from './fixture';

const idem = join(FIXTURE_VAULT, 'system-design', 'idempotency-patterns.md');

describe('ReadLedger', () => {
  it('charges an index read to the index tier with byte accounting', () => {
    const l = new ReadLedger(FIXTURE_VAULT);
    const content = l.readIndex(join(FIXTURE_VAULT, 'index.md'));
    expect(content).toContain('# Vault Index');
    const r = l.report(126);
    expect(r.byTier.index.reads).toBe(1);
    expect(r.byTier.index.bytes).toBeGreaterThan(0);
    expect(r.bodyReads).toBe(0);
    expect(r.filesTouched).toBe(1);
  });

  it('readFrontmatter returns only the mapping and charges the frontmatter tier', () => {
    const l = new ReadLedger(FIXTURE_VAULT);
    const fm = l.readFrontmatter(idem);
    expect(fm?.title).toBe('Idempotency Patterns');
    const r = l.report(126);
    expect(r.byTier.frontmatter.reads).toBe(1);
    expect(r.byTier.body.reads).toBe(0);
  });

  it('routes a frontmatter read to the grep tier when asked', () => {
    const l = new ReadLedger(FIXTURE_VAULT);
    l.readFrontmatter(idem, 'grep');
    expect(l.report(126).byTier.grep.reads).toBe(1);
  });

  it('readBody charges the body tier and returns the full body', () => {
    const l = new ReadLedger(FIXTURE_VAULT);
    const { body, frontmatter } = l.readBody(idem);
    expect(frontmatter?.title).toBe('Idempotency Patterns');
    expect(body).toContain('## Overview');
    expect(l.bodyReads).toBe(1);
    expect(l.report(126).byTier.body.reads).toBe(1);
  });

  it('readIndexIfExists returns null for a missing index (no charge)', () => {
    const l = new ReadLedger(FIXTURE_VAULT);
    expect(l.readIndexIfExists(join(FIXTURE_VAULT, 'nope', 'index.md'))).toBeNull();
    expect(l.report(126).filesTouched).toBe(0);
  });

  it('counts a re-read file once in filesTouched but twice in tier reads', () => {
    const l = new ReadLedger(FIXTURE_VAULT);
    const p = join(FIXTURE_VAULT, 'index.md');
    l.readIndex(p);
    l.readIndex(p);
    const r = l.report(126);
    expect(r.byTier.index.reads).toBe(2);
    expect(r.filesTouched).toBe(1);
  });

  it('reports total bytes as the sum across tiers and echoes conceptCount', () => {
    const l = new ReadLedger(FIXTURE_VAULT);
    l.readIndex(join(FIXTURE_VAULT, 'index.md'));
    l.readBody(idem);
    const r = l.report(126);
    expect(r.bytes).toBe(r.byTier.index.bytes + r.byTier.body.bytes);
    expect(r.conceptCount).toBe(126);
  });
});
