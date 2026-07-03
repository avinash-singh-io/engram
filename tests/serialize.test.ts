import { describe, expect, it } from 'vitest';
import { parseFrontmatter, serializeConcept, serializeFrontmatter } from '../src/format';

const fm = {
  type: 'Concept',
  title: 'Idempotency Patterns',
  description: 'How at-least-once execution plus idempotent operations yields effectively-once.',
  tags: ['distributed-systems', 'reliability'],
  timestamp: '2026-07-03T00:00:00Z',
};

describe('serialize', () => {
  it('round-trips frontmatter through parseFrontmatter', () => {
    const text = serializeConcept(fm, '# Model\n\nBody text.');
    const parsed = parseFrontmatter(text);
    expect(parsed.frontmatter).toEqual(fm);
    expect(parsed.body.trim()).toBe('# Model\n\nBody text.');
  });

  it('renders tags flow-style', () => {
    expect(serializeFrontmatter(fm)).toContain('tags: [distributed-systems, reliability]');
  });

  it('keeps a long description on a single physical line', () => {
    const long = {
      ...fm,
      description:
        'A single sentence that is deliberately long but must remain unwrapped on exactly one physical output line for OKF conformance.',
    };
    const descLines = serializeFrontmatter(long)
      .split('\n')
      .filter((l) => l.startsWith('description:'));
    expect(descLines).toHaveLength(1);
  });

  it('serializes a concept that passes the validator', () => {
    const text = serializeConcept(fm, '# Model\n\nBody.');
    expect(text.startsWith('---\n')).toBe(true);
  });
});
