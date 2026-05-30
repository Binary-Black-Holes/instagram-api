import type { QueryParams } from '../types/common.js';

/**
 * Builds a query string from a parameter object, omitting undefined values.
 *
 * @param params - Query parameters to serialize.
 * @returns URL-encoded query string without leading `?`.
 */
export function buildQueryString(params: QueryParams = {}): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  return searchParams.toString();
}

/**
 * Joins URL path segments while avoiding duplicate slashes.
 *
 * @param base - Base URL or path.
 * @param segments - Additional path segments.
 * @returns Normalized URL path.
 */
export function joinUrl(base: string, ...segments: string[]): string {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedSegments = segments
    .filter(Boolean)
    .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
    .join('/');

  return normalizedSegments ? `${normalizedBase}/${normalizedSegments}` : normalizedBase;
}

/**
 * Parses a retry-after header value into milliseconds.
 *
 * @param headerValue - Raw `Retry-After` header value.
 * @returns Retry delay in milliseconds, if parseable.
 */
export function parseRetryAfterMs(headerValue: string | null): number | undefined {
  if (!headerValue) {
    return undefined;
  }

  const seconds = Number(headerValue);

  if (!Number.isNaN(seconds)) {
    return seconds * 1000;
  }

  const date = Date.parse(headerValue);

  if (!Number.isNaN(date)) {
    return Math.max(date - Date.now(), 0);
  }

  return undefined;
}

/**
 * Delays execution for the specified duration.
 *
 * @param ms - Delay duration in milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Converts an array of field names into a Graph API fields query value.
 *
 * @param fields - Field names to request.
 * @param fallback - Default field list when none is provided.
 * @returns Comma-separated field list.
 */
export function resolveFields(fields: string[] | undefined, fallback: string[]): string {
  return (fields?.length ? fields : fallback).join(',');
}
