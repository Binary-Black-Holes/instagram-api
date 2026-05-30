import type { PaginatedResponse, PaginationOptions } from './common.js';

/**
 * Instagram user profile fields exposed by the Graph API.
 */
export interface InstagramUser {
  /** Instagram-scoped user ID. */
  id: string;
  /** Public username handle. */
  username?: string;
  /** Account display name. */
  name?: string;
  /** Profile biography text. */
  biography?: string;
  /** Public website URL from profile. */
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
 */
export type InstagramUserField =
  | 'id'
  | 'username'
  | 'name'
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
