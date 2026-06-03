import axios, { type AxiosInstance } from 'axios';
import type {
  ConnectedAccountsResponse,
  ListConnectedAccountsOptions,
} from '../types/account.js';
import type {
  AuthorizationUrlOptions,
  AccessTokenResponse,
  InstagramLoginAccessTokenResponse,
  LongLivedTokenResponse,
  LoginType,
  OAuthConfig,
  TokenDebugInfo,
} from '../types/common.js';
import {
  DEFAULT_OAUTH_SCOPES,
  DEFAULT_INSTAGRAM_LOGIN_SCOPES,
  GRAPH_API_BASE_URL,
  INSTAGRAM_GRAPH_API_BASE_URL,
  INSTAGRAM_OAUTH_API_BASE_URL,
  INSTAGRAM_OAUTH_DIALOG_URL,
  OAUTH_DIALOG_URL,
} from '../types/common.js';
import { ValidationError } from '../errors/index.js';
import { buildQueryString, joinUrl, resolveFields } from '../utils/url.js';

/**
 * OAuth helper for Instagram Graph API authorization flows.
 *
 * Provides declarative methods for building authorization URLs, exchanging
 * authorization codes, refreshing long-lived tokens, discovering connected
 * Pages/Instagram accounts, and debugging tokens.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram
 */
export class OAuthProvider {
  private readonly loginType: LoginType;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scopes: readonly string[];
  private readonly apiVersion: NonNullable<OAuthConfig['apiVersion']>;
  private readonly axios: AxiosInstance;

  /**
   * @param config - OAuth provider configuration.
   */
  constructor(config: OAuthConfig) {
    this.loginType = config.loginType ?? 'facebook';
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    this.scopes =
      config.scopes ??
      (this.loginType === 'instagram' ? DEFAULT_INSTAGRAM_LOGIN_SCOPES : DEFAULT_OAUTH_SCOPES);
    this.apiVersion = config.apiVersion ?? 'v21.0';
    this.axios =
      config.axios ??
      axios.create({
        headers: {
          Accept: 'application/json',
        },
        validateStatus: () => true,
      });
  }

  /**
   * Builds the Facebook OAuth dialog URL used to initiate user authorization.
   *
   * @param options - Authorization URL options.
   * @returns Absolute authorization URL.
   */
  getAuthorizationUrl(options: AuthorizationUrlOptions = {}): string {
    const scopes = options.scopes ?? [...this.scopes];
    const params = buildQueryString({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(','),
      state: options.state,
      auth_type: options.forceReauth ? 'rerequest' : undefined,
    });

    const base =
      this.loginType === 'instagram'
        ? joinUrl(INSTAGRAM_OAUTH_DIALOG_URL, 'oauth/authorize')
        : joinUrl(OAUTH_DIALOG_URL, this.apiVersion, 'dialog/oauth');

    return `${base}?${params}`;
  }

  /**
   * Exchanges an authorization code for a short-lived user access token.
   *
   * @param code - Authorization code returned to the redirect URI.
   * @returns Short-lived access token payload.
   */
  async exchangeCodeForToken(code: string): Promise<AccessTokenResponse> {
    if (!code.trim()) {
      throw new ValidationError('Authorization code must be a non-empty string.');
    }

    if (this.loginType === 'instagram') {
      return this.exchangeInstagramCodeForToken(code);
    }

    return this.postFacebookOAuth<AccessTokenResponse>('oauth/access_token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code,
    });
  }

  /**
   * Exchanges a short-lived token for a long-lived token (~60 days).
   *
   * @param shortLivedToken - Short-lived user access token.
   * @returns Long-lived access token payload.
   */
  async exchangeForLongLivedToken(shortLivedToken: string): Promise<LongLivedTokenResponse> {
    if (!shortLivedToken.trim()) {
      throw new ValidationError('Short-lived token must be a non-empty string.');
    }

    if (this.loginType === 'instagram') {
      return this.getInstagramGraph<LongLivedTokenResponse>('access_token', {
        grant_type: 'ig_exchange_token',
        client_secret: this.clientSecret,
        access_token: shortLivedToken,
      });
    }

    return this.getFacebookOAuth<LongLivedTokenResponse>('oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      fb_exchange_token: shortLivedToken,
    });
  }

  /**
   * Refreshes a long-lived token before it expires.
   *
   * @param longLivedToken - Existing long-lived access token.
   * @returns Refreshed long-lived access token payload.
   */
  async refreshLongLivedToken(longLivedToken: string): Promise<LongLivedTokenResponse> {
    if (!longLivedToken.trim()) {
      throw new ValidationError('Long-lived token must be a non-empty string.');
    }

    if (this.loginType === 'instagram') {
      return this.getInstagramGraph<LongLivedTokenResponse>('refresh_access_token', {
        grant_type: 'ig_refresh_token',
        access_token: longLivedToken,
      });
    }

    return this.getFacebookOAuth<LongLivedTokenResponse>('oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      fb_exchange_token: longLivedToken,
    });
  }

  /**
   * Retrieves metadata about an access token.
   *
   * @param inputToken - Token to inspect.
   * @param accessToken - App or user token used to perform debug request.
   * @returns Token debug metadata.
   */
  async debugToken(inputToken: string, accessToken: string): Promise<TokenDebugInfo> {
    const response = await this.getFacebookOAuth<{ data: TokenDebugInfo }>('debug_token', {
      input_token: inputToken,
      access_token: accessToken,
    });

    return response.data;
  }

  /**
   * Lists Facebook Pages and connected Instagram accounts for a user token.
   *
   * Graph API: `GET /me/accounts?fields=id,name,access_token,instagram_business_account`
   *
   * Use the returned Page access token and `instagram_business_account.id` when
   * constructing {@link InstagramClient}.
   */
  async listConnectedAccounts(
    userAccessToken: string,
    options: ListConnectedAccountsOptions = {},
  ): Promise<ConnectedAccountsResponse> {
    if (this.loginType === 'instagram') {
      throw new ValidationError(
        'listConnectedAccounts() is only available with Facebook Login. Instagram Login tokens identify the Instagram user directly.',
      );
    }

    if (!userAccessToken.trim()) {
      throw new ValidationError('userAccessToken must be a non-empty string.');
    }

    const query = buildQueryString({
      fields: resolveFields(options.fields, [
        'id',
        'name',
        'access_token',
        'instagram_business_account',
      ]),
      limit: options.limit,
      after: options.after,
      before: options.before,
      access_token: userAccessToken,
    });
    const url = `${joinUrl(GRAPH_API_BASE_URL, this.apiVersion, 'me/accounts')}?${query}`;
    const response = await this.axios.get<ConnectedAccountsResponse & { error?: { message: string } }>(url);
    const payload = response.data;

    if (response.status < 200 || response.status >= 300 || payload.error) {
      throw new ValidationError(payload.error?.message ?? `Account discovery failed with status ${response.status}`);
    }

    return payload;
  }

  /**
   * Returns the underlying Axios instance used by this provider.
   */
  getAxiosInstance(): AxiosInstance {
    return this.axios;
  }

  private async exchangeInstagramCodeForToken(code: string): Promise<InstagramLoginAccessTokenResponse> {
    const payload = await this.postForm<InstagramLoginAccessTokenResponse | { data: InstagramLoginAccessTokenResponse[] }>(
      joinUrl(INSTAGRAM_OAUTH_API_BASE_URL, 'oauth/access_token'),
      {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        code,
      },
    );

    if ('data' in payload && Array.isArray(payload.data)) {
      const [token] = payload.data;
      if (!token) {
        throw new ValidationError('Instagram Login code exchange returned an empty token response.');
      }
      return token;
    }

    if ('access_token' in payload) {
      return payload;
    }

    throw new ValidationError('Instagram Login code exchange returned an invalid token response.');
  }

  private async getFacebookOAuth<T>(path: string, params: Record<string, string>): Promise<T> {
    const query = buildQueryString(params);
    const url = `${joinUrl(GRAPH_API_BASE_URL, this.apiVersion, path)}?${query}`;
    const response = await this.axios.get<T & { error?: { message: string } }>(url);
    const payload = response.data;

    if (response.status < 200 || response.status >= 300 || payload.error) {
      throw new ValidationError(payload.error?.message ?? `OAuth request failed with status ${response.status}`);
    }

    return payload;
  }

  private async getInstagramGraph<T>(path: string, params: Record<string, string>): Promise<T> {
    const query = buildQueryString(params);
    const url = `${joinUrl(INSTAGRAM_GRAPH_API_BASE_URL, path)}?${query}`;
    const response = await this.axios.get<T & { error?: { message: string } }>(url);
    const payload = response.data;

    if (response.status < 200 || response.status >= 300 || payload.error) {
      throw new ValidationError(payload.error?.message ?? `Instagram OAuth request failed with status ${response.status}`);
    }

    return payload;
  }

  private async postFacebookOAuth<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = joinUrl(GRAPH_API_BASE_URL, this.apiVersion, path);
    return this.postForm<T>(url, params);
  }

  private async postForm<T>(url: string, params: Record<string, string>): Promise<T> {
    const body = new URLSearchParams(params);
    const response = await this.axios.post<T & { error?: { message: string } }>(url, body, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    const payload = response.data;

    if (response.status < 200 || response.status >= 300 || payload.error) {
      throw new ValidationError(payload.error?.message ?? `OAuth request failed with status ${response.status}`);
    }

    return payload;
  }
}
