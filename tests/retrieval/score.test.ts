import { describe, expect, it } from 'vitest';
import { scoreCandidate, tokenize } from '../../src/retrieval/score';

describe('score', () => {
  it('tokenizes, lowercasing and dropping stopwords and 1-char tokens', () => {
    expect(tokenize('How the Raft consensus works')).toEqual(['raft', 'consensus', 'works']);
    expect(tokenize('a b-tree INDEX')).toEqual(['tree', 'index']);
  });

  it('weights a title hit above a description hit', () => {
    const t = scoreCandidate(['raft'], { title: 'Raft Consensus' });
    const d = scoreCandidate(['raft'], { description: 'about raft' });
    expect(t.score).toBeGreaterThan(d.score);
  });

  it('is deterministic and records an explainable match trail', () => {
    const fields = { title: 'Temporal Internals', description: 'replay makes it durable' };
    const a = scoreCandidate(['temporal', 'replay'], fields);
    const b = scoreCandidate(['temporal', 'replay'], fields);
    expect(a).toEqual(b);
    expect(a.why).toContain('title~temporal');
    expect(a.why).toContain('description~replay');
  });

  it('credits a substring hit at half weight', () => {
    const exact = scoreCandidate(['temporal'], { title: 'Temporal' });
    const substr = scoreCandidate(['tempor'], { title: 'Temporal' });
    expect(substr.score).toBeCloseTo(exact.score / 2);
  });

  it('scores zero for a query that matches nothing', () => {
    expect(scoreCandidate(['xylophone'], { title: 'Raft', description: 'consensus' }).score).toBe(
      0,
    );
  });

  it('scores tags when supplied', () => {
    const r = scoreCandidate(['interview'], { tags: ['consensus', 'interview'] });
    expect(r.score).toBeGreaterThan(0);
    expect(r.why).toContain('tags~interview');
  });
});
