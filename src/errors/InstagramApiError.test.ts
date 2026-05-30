import { describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  createErrorFromResponse,
} from './InstagramApiError.js';

describe('createErrorFromResponse', () => {
  it('maps auth failures to AuthenticationError', () => {
    const error = createErrorFromResponse(401, {
      message: 'Invalid OAuth access token.',
      type: 'OAuthException',
      code: 190,
    });

    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe('Invalid OAuth access token.');
    expect(error.code).toBe(190);
    expect(error.status).toBe(401);
  });

  it('maps not found responses to NotFoundError', () => {
    const error = createErrorFromResponse(404, {
      message: 'Unsupported get request.',
      type: 'GraphMethodException',
      code: 803,
    });

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.code).toBe(803);
  });

  it('maps rate limit responses to RateLimitError with retry delay', () => {
    const error = createErrorFromResponse(
      429,
      {
        message: 'Application request limit reached',
        type: 'OAuthException',
        code: 4,
        fbtrace_id: 'trace-123',
      },
      5_000,
    );

    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfterMs).toBe(5_000);
    expect(error.traceId).toBe('trace-123');
  });

  it('serializes typed errors to JSON-safe objects', () => {
    const error = createErrorFromResponse(403, {
      message: 'Forbidden',
      type: 'OAuthException',
      code: 200,
    });

    expect(error.toJSON()).toEqual({
      name: 'AuthenticationError',
      message: 'Forbidden',
      code: 200,
      subcode: undefined,
      type: 'OAuthException',
      status: 403,
      traceId: undefined,
      graphError: {
        message: 'Forbidden',
        type: 'OAuthException',
        code: 200,
      },
    });
  });
});
