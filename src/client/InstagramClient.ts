import { HttpClient } from '../http/HttpClient.js';
import {
  CommerceResource,
  HashtagsResource,
  InsightsResource,
  MediaResource,
  MessagingResource,
  UsersResource,
  WebhooksResource,
} from '../resources/index.js';
import type { InstagramClientConfig } from '../types/common.js';
import { ValidationError } from '../errors/index.js';
import { pickDefined } from '../utils/pickDefined.js';

/**
 * Primary entry point for the Instagram Graph API SDK.
 *
 * The client follows a resource-oriented class architecture. Each resource
 * groups related API operations while sharing authentication, retry policy,
 * and HTTP transport configuration.
 *
 * @example
 * ```ts
 * import { InstagramClient } from '@binary-black-holes/instagram-api';
 *
 * const client = new InstagramClient({
 *   accessToken: pageAccessToken,
 *   instagramAccountId: connectedPage.instagram_business_account.id,
 * });
 *
 * const profile = await client.users.getProfile();
 * const media = await client.users.listMedia({ limit: 25 });
 * ```
 */
export class InstagramClient {
  /** User profile, media listing, and business discovery operations. */
  readonly users: UsersResource;
  /** Media read, comment moderation, publishing, and resumable uploads. */
  readonly media: MediaResource;
  /** Hashtag search and public hashtag media operations. */
  readonly hashtags: HashtagsResource;
  /** Account and media insights operations. */
  readonly insights: InsightsResource;
  /** Product catalogs and product tagging operations. */
  readonly commerce: CommerceResource;
  /** Instagram Direct messaging and private replies. */
  readonly messaging: MessagingResource;
  /** Webhook subscription management. */
  readonly webhooks: WebhooksResource;

  private readonly http: HttpClient;
  private accountId: string;

  /**
   * Creates a new Instagram API client instance.
   *
   * @param config - Client configuration including access token and account ID.
   */
  constructor(config: InstagramClientConfig) {
    const loginType = config.loginType ?? 'facebook';
    if (!config.accessToken?.trim()) {
      throw new ValidationError('accessToken is required.');
    }

    if (loginType === 'facebook' && !config.instagramAccountId?.trim()) {
      throw new ValidationError(
        'instagramAccountId is required. Use OAuthProvider.listConnectedAccounts() to resolve it from /me/accounts.',
      );
    }

    this.accountId = config.instagramAccountId ?? 'me';
    this.http = new HttpClient({
      accessToken: config.accessToken,
      apiVersion: config.apiVersion ?? 'v21.0',
      loginType,
      ...pickDefined({
        axios: config.axios,
        logger: config.logger,
        timeoutMs: config.timeoutMs,
        retry: config.retry,
        hooks: config.hooks,
      }),
    });

    this.users = new UsersResource(this.http, this.accountId);
    this.media = new MediaResource(this.http, this.accountId);
    this.hashtags = new HashtagsResource(this.http, this.accountId);
    this.insights = new InsightsResource(this.http, this.accountId);
    this.commerce = new CommerceResource(this.http, this.accountId);
    this.messaging = new MessagingResource(this.http, this.accountId);
    this.webhooks = new WebhooksResource(this.http, this.accountId);
  }

  /**
   * Returns the configured Instagram Business/Creator account ID.
   */
  getInstagramAccountId(): string {
    return this.accountId;
  }

  /**
   * Updates the Instagram account ID used by all resource modules.
   *
   * @param instagramAccountId - New account ID.
   */
  setInstagramAccountId(instagramAccountId: string): void {
    if (!instagramAccountId.trim()) {
      throw new ValidationError('instagramAccountId must be a non-empty string.');
    }

    this.accountId = instagramAccountId;
    this.users.setAccountId(instagramAccountId);
    this.media.setAccountId(instagramAccountId);
    this.hashtags.setAccountId(instagramAccountId);
    this.insights.setAccountId(instagramAccountId);
    this.commerce.setAccountId(instagramAccountId);
    this.messaging.setAccountId(instagramAccountId);
    this.webhooks.setAccountId(instagramAccountId);
  }

  /**
   * Updates the access token used for subsequent API calls.
   *
   * @param accessToken - New Graph API access token.
   */
  setAccessToken(accessToken: string): void {
    if (!accessToken.trim()) {
      throw new ValidationError('accessToken must be a non-empty string.');
    }

    this.http.setAccessToken(accessToken);
  }

  /**
   * Exposes the underlying HTTP client for advanced or experimental endpoints.
   *
   * Prefer resource methods where available. This accessor exists for
   * forward compatibility with newly released Graph API operations.
   */
  getHttpClient(): HttpClient {
    return this.http;
  }
}
