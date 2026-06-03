import type { AxiosInstance } from 'axios';

/**
 * Supported Instagram Graph API version identifiers.
 *
 * @see https://developers.facebook.com/docs/graph-api/changelog
 */
export type GraphApiVersion =
  | 'v19.0'
  | 'v20.0'
  | 'v21.0'
  | 'v22.0'
  | 'v23.0'
  | 'v24.0'
  | 'v25.0';

/**
 * Meta login product used for OAuth and Graph API requests.
 */
export type LoginType = 'facebook' | 'instagram';

/**
 * Generic cursor-based pagination envelope returned by Graph API list endpoints.
 */
export interface PaginatedResponse<T> {
  /** Collection payload for the current page. */
  data: T[];
  /** Cursor metadata when additional pages exist. */
  paging?: PaginationCursors;
}

/**
 * Cursor metadata attached to paginated Graph API responses.
 */
export interface PaginationCursors {
  /** Cursor pointing to the next page, if available. */
  cursors?: {
    before?: string;
    after?: string;
  };
  /** Absolute URL for the next page, if available. */
  next?: string;
  /** Absolute URL for the previous page, if available. */
  previous?: string;
}

/**
 * Options for iterating paginated Graph API resources.
 */
export interface PaginationOptions {
  /** Maximum number of items to return per page. */
  limit?: number;
  /** Cursor returned from a previous response. */
  after?: string;
  /** Cursor returned from a previous response. */
  before?: string;
}

/**
 * Standard Graph API error payload nested under `error`.
 */
export interface GraphApiErrorBody {
  /** Human-readable error summary. */
  message: string;
  /** Meta error type identifier. */
  type: string;
  /** Numeric Meta error code. */
  code: number;
  /** Optional sub-code for more granular failures. */
  error_subcode?: number;
  /** Trace identifier useful when contacting Meta support. */
  fbtrace_id?: string;
}

/**
 * Raw Graph API error response shape.
 */
export interface GraphApiErrorResponse {
  error: GraphApiErrorBody;
}

/**
 * Supported HTTP verbs for Graph API requests.
 */
export type HttpMethod = 'GET' | 'POST' | 'DELETE';

/**
 * Query parameters accepted by the internal HTTP client.
 */
export type QueryParams = Record<string, string | number | boolean | undefined>;

/**
 * Request configuration passed to the HTTP transport layer.
 */
export interface HttpRequestConfig {
  /** Relative Graph API path, e.g. `/me/media`. */
  path: string;
  /** HTTP method. Defaults to `GET`. */
  method?: HttpMethod;
  /** Query string parameters. */
  params?: QueryParams;
  /** JSON request body for POST operations. */
  body?: Record<string, unknown>;
  /** Optional access token override for a single request. */
  accessToken?: string;
}

/**
 * Minimal HTTP response wrapper used internally by the SDK.
 */
export interface HttpResponse<T> {
  /** Parsed JSON payload. */
  data: T;
  /** HTTP status code. */
  status: number;
  /** Response headers normalized to string values. */
  headers: Record<string, string>;
}

/**
 * Logger interface compatible with console or structured logging libraries.
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Retry policy applied by the HTTP client for transient failures.
 */
export interface RetryPolicy {
  /** Maximum number of retry attempts after the initial request. */
  maxRetries: number;
  /** Base delay in milliseconds before the first retry. */
  baseDelayMs: number;
  /** HTTP status codes that should trigger a retry. */
  retryableStatusCodes: number[];
}

/**
 * Optional hooks for observing HTTP client traffic.
 */
export interface HttpClientHooks {
  /** Called before a Graph API request is sent. */
  onRequest?: (context: { method: string; path: string; url: string }) => void;
  /** Called after a successful Graph API response. */
  onResponse?: (context: {
    method: string;
    path: string;
    url: string;
    status: number;
    durationMs: number;
  }) => void;
  /** Called when a Graph API request fails. */
  onError?: (context: {
    method: string;
    path: string;
    url: string;
    error: unknown;
    durationMs: number;
  }) => void;
}

/**
 * Core client configuration accepted by {@link InstagramClient}.
 */
export interface InstagramClientConfig {
  /**
   * Meta login product. Defaults to `facebook` for backwards compatibility.
   */
  loginType?: LoginType;
  /** Page access token for Facebook Login or Instagram User access token for Instagram Login. */
  accessToken: string;
  /** Graph API version. Defaults to `v21.0`. */
  apiVersion?: GraphApiVersion;
  /**
   * Instagram Business/Creator account ID. Required for Facebook Login; optional
   * for Instagram Login, where `/me` can be used for user-scoped endpoints.
   */
  instagramAccountId?: string;
  /** Custom Axios instance for HTTP transport, interceptors, or testing. */
  axios?: AxiosInstance;
  /** Optional structured logger. */
  logger?: Logger;
  /** Request timeout in milliseconds. Defaults to `30000`. */
  timeoutMs?: number;
  /** Retry policy for transient network or rate-limit failures. */
  retry?: Partial<RetryPolicy>;
  /** Optional request/response lifecycle hooks for logging or metrics. */
  hooks?: HttpClientHooks;
}

/**
 * OAuth configuration for authorization URL generation and token exchange.
 */
export interface OAuthConfig {
  /**
   * Meta login product. Defaults to `facebook` for backwards compatibility.
   */
  loginType?: LoginType;
  /** Meta application client ID. */
  clientId: string;
  /** Meta application client secret. */
  clientSecret: string;
  /** Registered OAuth redirect URI. */
  redirectUri: string;
  /** Requested permission scopes. */
  scopes?: string[];
  /** Graph API version used during OAuth. Defaults to `v21.0`. */
  apiVersion?: GraphApiVersion;
  /** Custom Axios instance for OAuth HTTP requests. */
  axios?: AxiosInstance;
}

/**
 * Authorization URL generation options.
 */
export interface AuthorizationUrlOptions {
  /** CSRF protection state value. */
  state?: string;
  /** Override default scopes for this authorization request. */
  scopes?: string[];
  /** Force re-authentication even if the user is already logged in. */
  forceReauth?: boolean;
}

/**
 * Short-lived token response returned by the OAuth token endpoint.
 */
export interface AccessTokenResponse {
  /** Bearer access token. */
  access_token: string;
  /** Token type, typically `bearer`. */
  token_type?: string;
  /** Expiration time in seconds, when applicable. */
  expires_in?: number;
  /** Instagram User ID returned by Instagram Login code exchange. */
  user_id?: string | number;
  /** Permissions returned by Instagram Login code exchange. */
  permissions?: string | string[];
}

/**
 * Long-lived token exchange response.
 */
export interface LongLivedTokenResponse extends AccessTokenResponse {
  /** Absolute expiration timestamp in seconds since epoch. */
  expires_at?: number;
}

/**
 * Instagram Login code exchange response. Meta has returned this as either a
 * flat token object or a `data` array depending on the documentation surface.
 */
export interface InstagramLoginAccessTokenResponse extends AccessTokenResponse {
  user_id: string | number;
  permissions?: string | string[];
}

/**
 * Token debug/introspection payload.
 */
export interface TokenDebugInfo {
  /** Application ID that issued the token. */
  app_id: string;
  /** Application-scoped user ID. */
  user_id?: string;
  /** Granted OAuth scopes. Graph API returns a comma-separated string. */
  scopes?: string | string[];
  /** Whether the token is currently valid. */
  is_valid: boolean;
  /** Expiration timestamp in seconds since epoch. */
  expires_at?: number;
  /** Issued-at timestamp in seconds since epoch. */
  issued_at?: number;
}

/**
 * Legacy OAuth scopes for Instagram Graph API with Facebook Login.
 *
 * Still valid for existing apps, but newer Meta app configurations may require
 * {@link DEFAULT_INSTAGRAM_BUSINESS_OAUTH_SCOPES} instead.
 *
 * @see https://developers.facebook.com/docs/permissions/reference
 */
export const DEFAULT_OAUTH_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_comments',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
] as const;

/**
 * Current OAuth scopes for Instagram API with Facebook Login.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/overview
 */
export const DEFAULT_INSTAGRAM_BUSINESS_OAUTH_SCOPES = [
  'instagram_business_basic',
  'instagram_business_content_publish',
  'instagram_business_manage_comments',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
] as const;

/**
 * Default scopes for Instagram API with Instagram Login.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
 */
export const DEFAULT_INSTAGRAM_LOGIN_SCOPES = [
  'instagram_business_basic',
] as const;

/**
 * Default Graph API base URL builder.
 */
export const GRAPH_API_BASE_URL = 'https://graph.facebook.com';

/**
 * Default Facebook OAuth dialog URL.
 */
export const OAUTH_DIALOG_URL = 'https://www.facebook.com';

/**
 * Graph API host used by Instagram API with Instagram Login.
 */
export const INSTAGRAM_GRAPH_API_BASE_URL = 'https://graph.instagram.com';

/**
 * OAuth dialog host used by Instagram API with Instagram Login.
 */
export const INSTAGRAM_OAUTH_DIALOG_URL = 'https://api.instagram.com';

/**
 * Token exchange host used by Instagram API with Instagram Login.
 */
export const INSTAGRAM_OAUTH_API_BASE_URL = 'https://api.instagram.com';

/**
 * Resumable upload host used for large video uploads.
 */
export const RUPLOAD_BASE_URL = 'https://rupload.facebook.com';
