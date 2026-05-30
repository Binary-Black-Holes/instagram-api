import { describe, expect, it } from 'vitest';
import { pickDefined } from './pickDefined.js';

describe('pickDefined', () => {
  it('removes properties with undefined values', () => {
    expect(
      pickDefined({
        status: 404,
        code: undefined,
        type: 'OAuthException',
      }),
    ).toEqual({
      status: 404,
      type: 'OAuthException',
    });
  });

  it('returns an empty object when all values are undefined', () => {
    expect(
      pickDefined({
        code: undefined,
        status: undefined,
      }),
    ).toEqual({});
  });

  it('preserves falsy values other than undefined', () => {
    expect(
      pickDefined({
        zero: 0,
        empty: '',
        disabled: false,
        missing: undefined,
      }),
    ).toEqual({
      zero: 0,
      empty: '',
      disabled: false,
    });
  });

  it('preserves null values', () => {
    expect(
      pickDefined({
        value: null,
        missing: undefined,
      }),
    ).toEqual({
      value: null,
    });
  });

  it('does not mutate the source object', () => {
    const source = {
      kept: 'value',
      dropped: undefined,
    };

    const result = pickDefined(source);

    expect(source).toEqual({
      kept: 'value',
      dropped: undefined,
    });
    expect(result).not.toBe(source);
  });

  it('returns a shallow copy of nested objects', () => {
    const nested = { id: '123' };

    expect(
      pickDefined({
        graphError: nested,
        status: undefined,
      }),
    ).toEqual({
      graphError: nested,
    });
  });
});
