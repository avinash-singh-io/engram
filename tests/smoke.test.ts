import { describe, expect, it } from 'vitest';
import { VERSION } from '../src/index';

describe('engram package', () => {
  it('exposes a semver version string', () => {
    expect(typeof VERSION).toBe('string');
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
