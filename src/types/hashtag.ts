import type { PaginatedResponse, PaginationOptions } from './common.js';
import type { InstagramMediaField, InstagramMedia } from './media.js';

/**
 * Instagram hashtag node returned by Graph API hashtag endpoints.
 */
export interface InstagramHashtag {
  /** Static, globally unique hashtag node ID. */
  id: string;
  /** Hashtag text without the leading hash symbol. */
  name?: string;
}

/**
 * Fields available when reading an IG Hashtag node.
 */
export type InstagramHashtagField = 'id' | 'name';

/**
 * Options for {@link HashtagsResource.getById}.
 */
export interface GetHashtagOptions {
  /** Explicit field list to request from Graph API. */
  fields?: InstagramHashtagField[];
}

/**
 * Response returned by hashtag search.
 */
export interface HashtagSearchResponse {
  data: InstagramHashtag[];
}

/**
 * Options for hashtag media edges.
 */
export interface HashtagMediaOptions extends PaginationOptions {
  /** Media fields to include in the response. */
  fields?: InstagramMediaField[];
}

/**
 * Paginated media returned from hashtag recent/top media edges.
 */
export type HashtagMediaResponse = PaginatedResponse<InstagramMedia>;
