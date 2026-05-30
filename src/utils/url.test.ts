import { describe, expect, it } from 'vitest';
import { buildQueryString, resolveFields } from '../utils/url.js';

describe('utils', () => {
  it('builds query strings without undefined values', () => {
    expect(buildQueryString({ a: 1, b: undefined, c: 'test' })).toBe('a=1&c=test');
  });

  it('resolves Graph API field lists', () => {
    expect(resolveFields(['id', 'username'], ['fallback'])).toBe('id,username');
    expect(resolveFields(undefined, ['id', 'username'])).toBe('id,username');
  });
});
