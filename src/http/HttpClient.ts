import axios, { AxiosError, type AxiosInstance } from 'axios';
import { createErrorFromResponse } from '../errors/index.js';
import type {
  HttpClientHooks,
  GraphApiErrorResponse,
  GraphApiVersion,
  HttpRequestConfig,
  HttpResponse,
  LoginType,
  Logger,
  RetryPolicy,
} from '../types/common.js';
import {
  GRAPH_API_BASE_URL,
  INSTAGRAM_GRAPH_API_BASE_URL,
  RUPLOAD_BASE_URL,
} from '../types/common.js';
import { pickDefined } from '../utils/pickDefined.js';
import { buildQueryString, joinUrl, parseRetryAfterMs, sleep } from '../utils/url.js';

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 500,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Console-backed logger used when no custom logger is supplied.
 */
class ConsoleLogger implements Logger {
  debug(message: string, meta?: Record<string, unknown>): void {
    console.debug(`[instagram-api] ${message}`, meta ?? {});
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(`[instagram-api] ${message}`, meta ?? {});
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[instagram-api] ${message}`, meta ?? {});
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(`[instagram-api] ${message}`, meta ?? {});
  }
}

/**
 * Normalizes Axios response headers into a plain string map.
 *
 * @param headers - Axios response headers.
 * @returns Header key/value map.
 */
function normalizeHeaders(headers: unknown): Record<string, string> {
  const normalized: Record<string, string> = {};

  if (!headers || typeof headers !== 'object') {
    return normalized;
  }

  const source =
    'toJSON' in headers && typeof headers.toJSON === 'function'
      ? (headers.toJSON() as Record<string, unknown>)
      : (headers as Record<string, unknown>);

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) {
      continue;
    }

    normalized[key] = Array.isArray(value) ? value.join(', ') : String(value);
  }

  return normalized;
}

/**
 * Reads the `Retry-After` header from normalized response headers.
 *
 * @param headers - Normalized response headers.
 * @returns Retry delay in milliseconds, if available.
 */
function getRetryAfterMs(headers: Record<string, string>): number | undefined {
  const retryAfter = headers['retry-after'] ?? headers['Retry-After'];
  return retryAfter ? parseRetryAfterMs(retryAfter) : undefined;
}

/**
 * Low-level HTTP transport for Graph API requests.
 *
 * Uses Axios for request execution and handles URL construction, authentication
 * query params, retries, timeouts, and error normalization.
 */
export class HttpClient {
  private accessToken: string;
  private readonly apiVersion: GraphApiVersion;
  private readonly loginType: LoginType;
  private readonly graphApiBaseUrl: string;
  private readonly axios: AxiosInstance;
  private readonly logger: Logger;
  private readonly timeoutMs: number;
  private readonly retryPolicy: RetryPolicy;
  private readonly hooks?: HttpClientHooks;

  /**
   * @param config - HTTP client configuration.
   */
  constructor(config: {
    accessToken: string;
    apiVersion: GraphApiVersion;
    loginType?: LoginType;
    axios?: AxiosInstance;
    logger?: Logger;
    timeoutMs?: number;
    retry?: Partial<RetryPolicy>;
    hooks?: HttpClientHooks;
  }) {
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion;
    this.loginType = config.loginType ?? 'facebook';
    this.graphApiBaseUrl =
      this.loginType === 'instagram' ? INSTAGRAM_GRAPH_API_BASE_URL : GRAPH_API_BASE_URL;
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.logger = config.logger ?? new ConsoleLogger();
    Object.assign(this, pickDefined({ hooks: config.hooks }));
    this.retryPolicy = {
      ...DEFAULT_RETRY_POLICY,
      ...config.retry,
    };
    this.axios =
      config.axios ??
      axios.create({
        timeout: this.timeoutMs,
        headers: {
          Accept: 'application/json',
        },
        validateStatus: () => true,
      });
  }

  /**
   * Updates the bearer token used for subsequent requests.
   *
   * @param accessToken - New Graph API access token.
   */
  setAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
  }

  /**
   * Returns the underlying Axios instance used by this client.
   */
  getAxiosInstance(): AxiosInstance {
    return this.axios;
  }

  /**
   * Returns the configured Graph API version.
   */
  getApiVersion(): GraphApiVersion {
    return this.apiVersion;
  }

  /**
   * Returns the configured Meta login product.
   */
  getLoginType(): LoginType {
    return this.loginType;
  }

  /**
   * Uploads binary video data to a resumable upload session.
   *
   * Graph API: `POST https://rupload.facebook.com/ig-api-upload/{version}/{container-id}`
   */
  async uploadResumableVideo(config: {
    containerId: string;
    file: Uint8Array;
    fileSize: number;
    offset?: number;
    accessToken?: string;
  }): Promise<{ success?: boolean; message?: string }> {
    const token = config.accessToken ?? this.accessToken;
    const url = joinUrl(RUPLOAD_BASE_URL, 'ig-api-upload', this.apiVersion, config.containerId);
    const response = await this.axios.post<{ success?: boolean; message?: string } & GraphApiErrorResponse>(
      url,
      config.file,
      {
        timeout: this.timeoutMs,
        headers: {
          Authorization: `OAuth ${token}`,
          offset: String(config.offset ?? 0),
          file_size: String(config.fileSize),
          'Content-Type': 'application/octet-stream',
        },
        validateStatus: () => true,
      },
    );

    const payload = response.data;

    if (response.status < 200 || response.status >= 300 || this.isGraphErrorPayload(payload)) {
      const graphError = this.isGraphErrorPayload(payload) ? payload.error : undefined;
      throw createErrorFromResponse(response.status, graphError);
    }

    return payload;
  }

  /**
   * Executes a Graph API request and returns the parsed JSON payload.
   *
   * @typeParam T - Expected response payload type.
   * @param config - Request configuration.
   * @returns Parsed response envelope.
   */
  async request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const method = config.method ?? 'GET';
    const token = config.accessToken ?? this.accessToken;
    const url = this.buildUrl(config.path, {
      ...config.params,
      access_token: token,
    });

    let attempt = 0;

    while (true) {
      const startedAt = Date.now();

      try {
        this.logger.debug('Sending Graph API request', {
          method,
          path: config.path,
          attempt,
        });
        this.hooks?.onRequest?.({ method, path: config.path, url });

        const response = await this.axios.request<T | GraphApiErrorResponse>({
          url,
          method,
          timeout: this.timeoutMs,
          headers: {
            Accept: 'application/json',
            ...(method === 'POST' && config.body ? { 'Content-Type': 'application/json' } : {}),
          },
          ...(method === 'POST' && config.body ? { data: config.body } : {}),
        });

        const payload = response.data;
        const headers = normalizeHeaders(response.headers);

        if (response.status < 200 || response.status >= 300 || this.isGraphErrorPayload(payload)) {
          const graphError = this.isGraphErrorPayload(payload) ? payload.error : undefined;
          const retryAfterMs = getRetryAfterMs(headers);
          const error = createErrorFromResponse(response.status, graphError, retryAfterMs);

          if (this.shouldRetry(response.status, attempt)) {
            attempt += 1;
            const delay = retryAfterMs ?? this.retryPolicy.baseDelayMs * attempt;
            this.logger.warn('Retrying Graph API request', {
              path: config.path,
              attempt,
              delay,
              status: response.status,
            });
            await sleep(delay);
            continue;
          }

          this.logger.error('Graph API request failed', error.toJSON());
          this.hooks?.onError?.({
            method,
            path: config.path,
            url,
            error,
            durationMs: Date.now() - startedAt,
          });
          throw error;
        }

        this.hooks?.onResponse?.({
          method,
          path: config.path,
          url,
          status: response.status,
          durationMs: Date.now() - startedAt,
        });

        return {
          data: payload as T,
          status: response.status,
          headers,
        };
      } catch (error) {
        if (error instanceof AxiosError && error.code === 'ECONNABORTED') {
          const timeoutError = createErrorFromResponse(408, {
            message: `Request timed out after ${this.timeoutMs}ms`,
            type: 'TimeoutError',
            code: 408,
          });

          if (this.shouldRetry(408, attempt)) {
            attempt += 1;
            await sleep(this.retryPolicy.baseDelayMs * attempt);
            continue;
          }

          throw timeoutError;
        }

        this.hooks?.onError?.({
          method,
          path: config.path,
          url,
          error,
          durationMs: Date.now() - startedAt,
        });
        throw error;
      }
    }
  }

  /**
   * Builds an absolute Graph API URL for the configured API version.
   *
   * @param path - Relative API path.
   * @param params - Query string parameters.
   * @returns Fully qualified request URL.
   */
  buildUrl(path: string, params: Record<string, string | number | boolean | undefined> = {}): string {
    const base = joinUrl(this.graphApiBaseUrl, this.apiVersion, path.replace(/^\//, ''));
    const query = buildQueryString(params);
    return query ? `${base}?${query}` : base;
  }

  private shouldRetry(status: number, attempt: number): boolean {
    return attempt < this.retryPolicy.maxRetries && this.retryPolicy.retryableStatusCodes.includes(status);
  }

  private isGraphErrorPayload(payload: unknown): payload is GraphApiErrorResponse {
    return typeof payload === 'object' && payload !== null && 'error' in payload;
  }
}
