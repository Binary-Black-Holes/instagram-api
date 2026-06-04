import type { PaginatedResponse, PaginationOptions } from './common.js';

/**
 * Instagram user profile fields exposed by the Graph API.
 */
export interface InstagramUser {
  /** App-scoped ID returned by the access token (the `/me` identity). */
  id: string;
  /**
   * Instagram professional account ID. Returned by Instagram Login `/me` and
   * used as the entity ID in Instagram webhook notifications.
   */
  user_id?: string;
  /** Public username handle. */
  username?: string;
  /** Account display name. */
  name?: string;
  /**
   * Account type. Instagram Login returns `Business` or `Media_Creator`;
   * Facebook Login (IG User) may return values such as `BUSINESS`.
   */
  account_type?: string;
  /** Profile biography text. Facebook Login (IG User) only. */
  biography?: string;
  /** Public website URL from profile. Facebook Login (IG User) only. */
  website?: string;
  /** Follower count when available to the token. */
  followers_count?: number;
  /** Following count when available to the token. */
  follows_count?: number;
  /** Total media count for the account. */
  media_count?: number;
  /** Profile picture URL. */
  profile_picture_url?: string;
}

/**
 * Fields that can be requested when retrieving user profile data.
 *
 * Note: `user_id` and `account_type` are primarily for Instagram Login, while
 * `biography` and `website` are only available for Facebook Login (IG User).
 */
export type InstagramUserField =
  | 'id'
  | 'user_id'
  | 'username'
  | 'name'
  | 'account_type'
  | 'biography'
  | 'website'
  | 'followers_count'
  | 'follows_count'
  | 'media_count'
  | 'profile_picture_url';

/**
 * Options for {@link UsersResource.getProfile}.
 */
export interface GetProfileOptions {
  /** Explicit field list to request from Graph API. */
  fields?: InstagramUserField[];
}

/**
 * Options for {@link UsersResource.listMedia}.
 */
export interface ListUserMediaOptions extends PaginationOptions {
  /** Media fields to include in the response. */
  fields?: string[];
}

/**
 * Paginated media collection owned by an Instagram user.
 */
export type UserMediaResponse = PaginatedResponse<{
  id: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
  caption?: string;
}>;
