import type { GraphApiErrorBody } from '../types/common.js';
import { pickDefined } from '../utils/pickDefined.js';

/** Structured metadata attached to {@link InstagramApiError} instances. */
export type InstagramApiErrorOptions = {
  code?: number;
  subcode?: number;
  type?: string;
  status?: number;
  traceId?: string;
  graphError?: GraphApiErrorBody;
  cause?: unknown;
};

/** Options accepted by {@link RateLimitError}. */
export type RateLimitErrorOptions = InstagramApiErrorOptions & {
  retryAfterMs?: number;
};

/**
 * Base error thrown by the Instagram API SDK.
 *
 * All library-specific failures extend this class, enabling callers to
 * distinguish SDK errors from generic runtime exceptions.
 */
export class InstagramApiError extends Error {
  /** Meta Graph API error code, when available. */
  readonly code?: number;
  /** Meta Graph API error sub-code, when available. */
  readonly subcode?: number;
  /** Meta error type identifier. */
  readonly type?: string;
  /** HTTP status associated with the failed request. */
  readonly status?: number;
  /** Meta trace identifier useful for support tickets. */
  readonly traceId?: string;
  /** Parsed Graph API error payload. */
  readonly graphError?: GraphApiErrorBody;

  /**
   * @param message - Human-readable error message.
   * @param options - Structured error metadata.
   */
  constructor(message: string, options: InstagramApiErrorOptions = {}) {
    const { cause, ...metadata } = options;

    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'InstagramApiError';
    Object.assign(this, pickDefined(metadata));
  }

  /**
   * Serializes the error into a JSON-safe object for logging.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      subcode: this.subcode,
      type: this.type,
      status: this.status,
      traceId: this.traceId,
      graphError: this.graphError,
    };
  }
}

/**
 * Error thrown when authentication fails or the access token is invalid.
 */
export class AuthenticationError extends InstagramApiError {
  /**
   * @param message - Human-readable authentication failure message.
   * @param options - Structured error metadata.
   */
  constructor(message: string, options: InstagramApiErrorOptions = {}) {
    super(message, options);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when Graph API rate limits are exceeded.
 */
export class RateLimitError extends InstagramApiError {
  /** Suggested retry delay in milliseconds, when provided by headers. */
  readonly retryAfterMs?: number;

  /**
   * @param message - Human-readable rate limit message.
   * @param options - Structured error metadata.
   */
  constructor(message: string, options: RateLimitErrorOptions = {}) {
    const { retryAfterMs, ...metadata } = options;

    super(message, metadata);
    this.name = 'RateLimitError';
    Object.assign(this, pickDefined({ retryAfterMs }));
  }
}

/**
 * Error thrown when request validation fails before reaching Graph API.
 */
export class ValidationError extends InstagramApiError {
  /**
   * @param message - Human-readable validation message.
   * @param options - Structured error metadata.
   */
  constructor(message: string, options: InstagramApiErrorOptions = {}) {
    super(message, options);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when a requested resource cannot be found.
 */
export class NotFoundError extends InstagramApiError {
  /**
   * @param message - Human-readable not-found message.
   * @param options - Structured error metadata.
   */
  constructor(message: string, options: InstagramApiErrorOptions = {}) {
    super(message, options);
    this.name = 'NotFoundError';
  }
}

/**
 * Maps Graph API error payloads and HTTP metadata to typed SDK errors.
 *
 * @param status - HTTP response status code.
 * @param graphError - Parsed Graph API error payload.
 * @param retryAfterMs - Optional retry delay derived from response headers.
 * @returns Typed SDK error instance.
 */
export function createErrorFromResponse(
  status: number,
  graphError?: GraphApiErrorBody,
  retryAfterMs?: number,
): InstagramApiError {
  const message = graphError?.message ?? `Instagram API request failed with status ${status}`;
  const baseOptions = pickDefined({
    status,
    code: graphError?.code,
    subcode: graphError?.error_subcode,
    type: graphError?.type,
    traceId: graphError?.fbtrace_id,
    graphError,
  });

  if (status === 401 || status === 403 || graphError?.code === 190) {
    return new AuthenticationError(message, baseOptions);
  }

  if (status === 404 || graphError?.code === 803) {
    return new NotFoundError(message, baseOptions);
  }

  if (status === 429 || graphError?.code === 4 || graphError?.code === 17 || graphError?.code === 32) {
    return new RateLimitError(message, pickDefined({ ...baseOptions, retryAfterMs }));
  }

  return new InstagramApiError(message, baseOptions);
}
