import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { HttpMethod } from '../types/common.js';

/**
 * Low-level HTTP request configuration accepted by {@link HttpTransport}.
 */
export interface HttpTransportRequestConfig {
  /** Absolute request URL. */
  url: string;
  /** HTTP method. */
  method: HttpMethod;
  /** Request headers. */
  headers?: Record<string, string>;
  /**
   * Request payload. JSON objects are serialized automatically by the fetch
   * adapter; `URLSearchParams` and `Uint8Array` are sent as-is.
   */
  body?: unknown;
  /** Request timeout in milliseconds. */
  timeoutMs?: number;
}

/**
 * Low-level HTTP response returned by {@link HttpTransport}.
 */
export interface HttpTransportResponse<T = unknown> {
  /** HTTP status code. */
  status: number;
  /** Parsed response payload. */
  data: T;
  /** Raw response headers. */
  headers: Record<string, string | string[] | unknown>;
}

/**
 * Pluggable HTTP transport used by {@link HttpClient} and {@link OAuthProvider}.
 *
 * Implement this interface to swap Axios for `fetch`, undici, or a custom
 * client while keeping SDK retry, error mapping, and URL construction intact.
 */
export interface HttpTransport {
  /**
   * Executes an HTTP request and returns status, headers, and parsed data.
   *
   * @typeParam T - Expected response payload type.
   * @param config - Request configuration.
   */
  request<T = unknown>(config: HttpTransportRequestConfig): Promise<HttpTransportResponse<T>>;
}

/**
 * Thrown when a transport request exceeds its configured timeout.
 */
export class HttpTimeoutError extends Error {
  /** Configured timeout in milliseconds. */
  readonly timeoutMs: number;

  /**
   * @param timeoutMs - Configured timeout in milliseconds.
   */
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'HttpTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Configuration for resolving an {@link HttpTransport} implementation.
 */
export interface HttpTransportConfig {
  /** Custom HTTP transport. Takes precedence over `fetch` and `axios`. */
  httpTransport?: HttpTransport;
  /** Custom `fetch` implementation used when `httpTransport` is omitted. */
  fetch?: typeof globalThis.fetch;
  /** Custom Axios instance used when `httpTransport` and `fetch` are omitted. */
  axios?: AxiosInstance;
  /** Default request timeout in milliseconds for the built-in Axios instance. */
  timeoutMs?: number;
}

/**
 * Resolves the HTTP transport from explicit, fetch, Axios, or default Axios
 * configuration.
 *
 * @param config - Transport resolution options.
 * @returns Resolved transport and optional backing Axios instance.
 */
export function resolveHttpTransport(config: HttpTransportConfig = {}): {
  transport: HttpTransport;
  axiosInstance?: AxiosInstance;
} {
  if (config.httpTransport) {
    return { transport: config.httpTransport };
  }

  if (config.fetch) {
    return { transport: createFetchTransport(config.fetch) };
  }

  const axiosInstance =
    config.axios ??
    axios.create({
      timeout: config.timeoutMs ?? 30_000,
      headers: {
        Accept: 'application/json',
      },
      validateStatus: () => true,
    });

  return {
    transport: createAxiosTransport(axiosInstance),
    axiosInstance,
  };
}

/**
 * Adapts an Axios instance to the {@link HttpTransport} interface.
 *
 * @param axiosInstance - Axios client to wrap.
 */
export function createAxiosTransport(axiosInstance: AxiosInstance): HttpTransport {
  return {
    async request<T>(config: HttpTransportRequestConfig): Promise<HttpTransportResponse<T>> {
      try {
        const axiosConfig: AxiosRequestConfig = {
          url: config.url,
          method: config.method,
          data: config.body,
          validateStatus: () => true,
        };

        if (config.headers) {
          axiosConfig.headers = config.headers;
        }

        if (config.timeoutMs !== undefined) {
          axiosConfig.timeout = config.timeoutMs;
        }

        const response = await axiosInstance.request<T>(axiosConfig);

        return {
          status: response.status,
          data: response.data as T,
          headers: response.headers as Record<string, string | string[] | unknown>,
        };
      } catch (error) {
        if (error instanceof AxiosError && error.code === 'ECONNABORTED') {
          throw new HttpTimeoutError(config.timeoutMs ?? 0);
        }

        throw error;
      }
    },
  };
}

/**
 * Adapts the Fetch API to the {@link HttpTransport} interface.
 *
 * @param fetchFn - `fetch` implementation. Defaults to `globalThis.fetch`.
 */
export function createFetchTransport(fetchFn: typeof fetch = globalThis.fetch): HttpTransport {
  return {
    async request<T>(config: HttpTransportRequestConfig): Promise<HttpTransportResponse<T>> {
      const controller = config.timeoutMs ? new AbortController() : undefined;
      const timeoutId =
        config.timeoutMs && controller
          ? setTimeout(() => controller.abort(), config.timeoutMs)
          : undefined;

      try {
        const init: RequestInit = {
          method: config.method,
        };

        if (config.headers) {
          init.headers = config.headers;
        }

        const body = serializeFetchBody(config.body);
        if (body !== undefined) {
          init.body = body;
        }

        if (controller?.signal) {
          init.signal = controller.signal;
        }

        const response = await fetchFn(config.url, init);

        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        const data = await parseFetchResponseData(response);

        return {
          status: response.status,
          data: data as T,
          headers,
        };
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new HttpTimeoutError(config.timeoutMs ?? 0);
        }

        throw error;
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    },
  };
}

/**
 * Serializes request bodies for fetch-based transports.
 *
 * @param body - Request payload.
 */
function serializeFetchBody(body: unknown): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (
    body instanceof URLSearchParams ||
    body instanceof Uint8Array ||
    typeof body === 'string' ||
    body instanceof ArrayBuffer ||
    body instanceof Blob ||
    body instanceof FormData
  ) {
    return body as BodyInit;
  }

  return JSON.stringify(body);
}

/**
 * Parses fetch response payloads based on `Content-Type`.
 *
 * @param response - Fetch response object.
 */
async function parseFetchResponseData(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
