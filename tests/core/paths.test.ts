import { describe, expect, it } from 'vitest';
import {
  DERIVED_GITIGNORE,
  RESERVED_FILES,
  ROOT_MARKER,
  isDerived,
  isReservedFile,
} from '../../src/core/paths.js';
import { getRelation, relationKinds } from '../../src/core/relations.js';

describe('reserved files are never authored content, at any depth', () => {
  it.each([
    ['index.md', true],
    ['a/b/index.md', true],
    ['log.md', true],
    ['deep/nested/log.md', true],
    ['AGENTS.md', true],
    ['CLAUDE.md', true],
    ['concepts/graph-rag.md', false],
    ['my-index.md', false],
    ['indexed.md', false],
  ])('%s -> reserved: %s', (path, expected) => {
    expect(isReservedFile(path)).toBe(expected);
  });

  it('names exactly the four engram owns', () => {
    expect([...RESERVED_FILES].sort()).toEqual(['AGENTS.md', 'CLAUDE.md', 'index.md', 'log.md']);
  });
});

describe('derived paths (ADR-0029)', () => {
  it.each([
    ['/index.md', true],
    ['index.md', true],
    ['/views/superseded.md', true],
    ['/views/nested/thing.md', true],
    ['/concepts/x.md', false],
    ['/viewsly/x.md', false],
    ['/a/views/x.md', false],
  ])('%s -> derived: %s', (path, expected) => {
    expect(isDerived(path)).toBe(expected);
  });

  it('the managed gitignore covers exactly the derived subtree', () => {
    expect(DERIVED_GITIGNORE).toContain('/views/');
    expect(DERIVED_GITIGNORE).toContain('/index.md');
  });

  it('the root marker is the .engram sidecar (ADR-0009, ADR-0030)', () => {
    expect(ROOT_MARKER).toBe('.engram');
  });
});

describe('part-of is registered (the prerequisite views need)', () => {
  it('joins the closed set', () => {
    expect(relationKinds()).toEqual(['part-of', 'sources', 'supersedes']);
  });

  it('does NOT invalidate its target', () => {
    // Containment says nothing about currency. If part-of invalidated, then
    // reorganising a tree would silently mark its contents superseded.
    expect(getRelation('part-of')!.invalidatesTarget).toBe(false);
  });

  it('carries a detective form, like every closed type must (ADR-0024)', () => {
    expect(getRelation('part-of')!.detective.length).toBeGreaterThan(0);
  });
});
