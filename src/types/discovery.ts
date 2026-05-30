import type { PaginatedResponse } from './common.js';
import type { InstagramMedia } from './media.js';

/**
 * Public business profile returned by Business Discovery.
 */
export interface DiscoveredBusiness {
  id: string;
  username?: string;
  name?: string;
  biography?: string;
  website?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
  media?: PaginatedResponse<Pick<InstagramMedia, 'id' | 'caption' | 'comments_count' | 'like_count' | 'media_type' | 'media_url' | 'permalink' | 'timestamp'>>;
}

/**
 * Fields supported inside `business_discovery.username(...)`.
 */
export type BusinessDiscoveryField =
  | 'id'
  | 'username'
  | 'name'
  | 'biography'
  | 'website'
  | 'followers_count'
  | 'follows_count'
  | 'media_count'
  | 'profile_picture_url'
  | 'media'
  | 'media{id,caption,comments_count,like_count,media_type,media_url,permalink,timestamp}';

/**
 * Options for {@link UsersResource.discoverBusiness}.
 */
export interface BusinessDiscoveryOptions {
  /** Target Instagram Business/Creator username without `@`. */
  username: string;
  /** Nested fields to request inside business discovery. */
  fields?: BusinessDiscoveryField[];
}

/**
 * Graph API response envelope for business discovery queries.
 */
export interface BusinessDiscoveryResponse {
  id: string;
  business_discovery: DiscoveredBusiness;
}
