import type { PaginatedResponse, PaginationOptions } from './common.js';

/**
 * Facebook Page connected to an Instagram Business/Creator account.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-login-for-instagram
 */
export interface ConnectedFacebookPage {
  /** Facebook Page ID. */
  id: string;
  /** Page display name. */
  name?: string;
  /** Page access token used for Instagram Graph API calls. */
  access_token?: string;
  /** Connected Instagram professional account reference. */
  instagram_business_account?: {
    id: string;
  };
}

/**
 * Options for {@link OAuthProvider.listConnectedAccounts}.
 */
export interface ListConnectedAccountsOptions extends PaginationOptions {
  /** Fields to request from `/me/accounts`. */
  fields?: ConnectedFacebookPageField[];
}

/**
 * Fields available on the `/me/accounts` endpoint.
 */
export type ConnectedFacebookPageField =
  | 'id'
  | 'name'
  | 'access_token'
  | 'instagram_business_account';

/**
 * Paginated response from `/me/accounts`.
 */
export type ConnectedAccountsResponse = PaginatedResponse<ConnectedFacebookPage>;

/**
 * Publishing quota configuration returned by `content_publishing_limit`.
 */
export interface ContentPublishingConfig {
  /** Maximum containers publishable within the quota window. */
  quota_total?: number;
  /** Quota window duration in seconds. */
  quota_duration?: number;
}

/**
 * Publishing quota usage returned by `content_publishing_limit`.
 */
export interface ContentPublishingLimit {
  /** Number of containers published within the queried window. */
  quota_usage?: number;
  /** Quota configuration for the Instagram account. */
  config?: ContentPublishingConfig;
}

/**
 * Response envelope for `GET /{ig-user-id}/content_publishing_limit`.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/content_publishing_limit
 */
export interface ContentPublishingLimitResponse {
  data: ContentPublishingLimit[];
}

/**
 * Options for querying content publishing limits.
 */
export interface ContentPublishingLimitOptions {
  /** Fields to return. Defaults to `quota_usage`. */
  fields?: Array<'quota_usage' | 'config' | 'rate_limit_settings'>;
  /** Unix timestamp no older than 24 hours. */
  since?: number;
}
