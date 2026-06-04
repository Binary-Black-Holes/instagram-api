import type {
  BusinessDiscoveryOptions,
  BusinessDiscoveryResponse,
} from '../types/discovery.js';
import type {
  GetProfileOptions,
  InstagramUser,
  ListUserMediaOptions,
  UserMediaResponse,
} from '../types/user.js';
import { ValidationError } from '../errors/index.js';
import { buildBusinessDiscoveryFields } from '../utils/graph.js';
import { collectAllPages } from '../utils/pagination.js';
import { resolveFields } from '../utils/url.js';
import { BaseResource } from './BaseResource.js';

/**
 * Default profile fields for Facebook Login (IG User), which exposes
 * `biography` and `website`.
 */
const DEFAULT_FACEBOOK_USER_FIELDS = [
  'id',
  'username',
  'name',
  'biography',
  'website',
  'followers_count',
  'follows_count',
  'media_count',
  'profile_picture_url',
] as const;

/**
 * Default profile fields for Instagram Login `/me`. Meta does not expose
 * `biography`/`website` here and recommends `user_id`/`account_type`.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started
 */
const DEFAULT_INSTAGRAM_USER_FIELDS = [
  'id',
  'user_id',
  'username',
  'name',
  'account_type',
  'followers_count',
  'follows_count',
  'media_count',
  'profile_picture_url',
] as const;

/**
 * User profile and account media resource.
 */
export class UsersResource extends BaseResource {
  /**
   * Retrieves the Instagram Business/Creator profile for the configured account.
   *
   * @param options - Field selection options.
   * @returns Instagram user profile payload.
   *
   * @example
   * ```ts
   * const profile = await client.users.getProfile({
   *   fields: ['id', 'username', 'followers_count'],
   * });
   * ```
   */
  async getProfile(options: GetProfileOptions = {}): Promise<InstagramUser> {
    const accountId = this.resolveAccountId();
    const defaultFields =
      this.getLoginType() === 'instagram'
        ? [...DEFAULT_INSTAGRAM_USER_FIELDS]
        : [...DEFAULT_FACEBOOK_USER_FIELDS];
    const response = await this.http.request<InstagramUser>({
      path: `/${accountId}`,
      params: {
        fields: resolveFields(options.fields, defaultFields),
      },
    });

    return response.data;
  }

  /**
   * Lists media published by the configured Instagram account.
   *
   * @param options - Pagination and field selection options.
   * @returns Paginated media collection.
   */
  async listMedia(options: ListUserMediaOptions = {}): Promise<UserMediaResponse> {
    const accountId = this.resolveAccountId();
    const response = await this.http.request<UserMediaResponse>({
      path: `/${accountId}/media`,
      params: {
        fields: options.fields?.join(','),
        limit: options.limit,
        after: options.after,
        before: options.before,
      },
    });

    return response.data;
  }

  /**
   * Retrieves all media for the account by automatically following pagination cursors.
   *
   * @param options - Pagination and field selection options.
   * @returns Flattened media array.
   */
  async listAllMedia(options: ListUserMediaOptions = {}): Promise<UserMediaResponse['data']> {
    return collectAllPages((pagination) => this.listMedia({ ...options, ...pagination }));
  }

  /**
   * Retrieves public profile and media metadata for another Instagram business account.
   *
   * Graph API: `GET /{ig-user-id}?fields=business_discovery.username(target){...}`
   */
  async discoverBusiness(options: BusinessDiscoveryOptions): Promise<BusinessDiscoveryResponse> {
    this.assertFacebookLoginOnly('Business discovery');

    if (!options.username.trim()) {
      throw new ValidationError('username must be a non-empty string.');
    }

    const accountId = this.resolveAccountId();
    const response = await this.http.request<BusinessDiscoveryResponse>({
      path: `/${accountId}`,
      params: {
        fields: buildBusinessDiscoveryFields(options.username, options.fields),
      },
    });

    return response.data;
  }
}
