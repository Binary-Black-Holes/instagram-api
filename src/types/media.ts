import type { PaginatedResponse, PaginationOptions } from './common.js';

/**
 * Supported Instagram media types.
 */
export type MediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS' | 'STORIES';

/**
 * Instagram media object returned by Graph API media endpoints.
 */
export interface InstagramMedia {
  /** Media object ID. */
  id: string;
  /** Media type discriminator. */
  media_type?: MediaType;
  /** Direct CDN URL when available. */
  media_url?: string;
  /** Thumbnail URL for video/reels content. */
  thumbnail_url?: string;
  /** Public permalink to the media on Instagram. */
  permalink?: string;
  /** ISO 8601 creation timestamp. */
  timestamp?: string;
  /** Caption text associated with the media. */
  caption?: string;
  /** Like count when available to the token. */
  like_count?: number;
  /** Comment count when available to the token. */
  comments_count?: number;
  /** Owner Instagram user ID. */
  owner?: {
    id: string;
  };
  /** Child media IDs for carousel albums. */
  children?: PaginatedResponse<{ id: string; media_type?: MediaType; media_url?: string }>;
}

/**
 * Common media fields for read operations.
 */
export type InstagramMediaField =
  | 'id'
  | 'media_type'
  | 'media_url'
  | 'thumbnail_url'
  | 'permalink'
  | 'timestamp'
  | 'caption'
  | 'like_count'
  | 'comments_count'
  | 'owner'
  | 'children{id,media_type,media_url}';

/**
 * Options for {@link MediaResource.getById}.
 */
export interface GetMediaOptions {
  /** Explicit field list to request from Graph API. */
  fields?: InstagramMediaField[];
}

/**
 * Options for {@link MediaResource.listComments}.
 */
export interface ListMediaCommentsOptions extends PaginationOptions {
  /** Comment fields to include in the response. */
  fields?: string[];
}

/**
 * Instagram comment object.
 */
export interface InstagramComment {
  /** Comment ID. */
  id: string;
  /** Comment body text. */
  text?: string;
  /** ISO 8601 timestamp. */
  timestamp?: string;
  /** Username of the comment author when exposed by Graph API. */
  username?: string;
  /** Whether the comment is hidden. */
  hidden?: boolean;
  /** Like count when available. */
  like_count?: number;
}

/**
 * Payload for creating a single-image media container.
 */
export interface CreateImageMediaInput {
  /** Publicly accessible image URL. */
  imageUrl: string;
  /** Optional caption text. */
  caption?: string;
  /** Accessibility description for image posts. */
  altText?: string;
  /** Location ID to tag on the media. */
  locationId?: string;
  /** User tags applied to the media. */
  userTags?: Array<{ username: string; x: number; y: number }>;
}

/**
 * Payload for creating a story media container.
 */
export interface CreateStoryMediaInput {
  /** Media type for the story container. */
  mediaType: 'STORIES';
  /** Publicly accessible image URL for image stories. */
  imageUrl?: string;
  /** Publicly accessible video URL for video stories. */
  videoUrl?: string;
  /** Optional cover image URL when uploading a video story. */
  coverUrl?: string;
}

/**
 * Payload for creating a video/reels media container.
 */
export interface CreateVideoMediaInput {
  /** Publicly accessible video URL. */
  videoUrl: string;
  /** Media type accepted by Graph API container creation. */
  mediaType?: 'VIDEO' | 'REELS' | 'STORIES';
  /** Optional caption text. */
  caption?: string;
  /** Cover image URL for reels. */
  coverUrl?: string;
  /** Whether the reel should be shared to feed. */
  shareToFeed?: boolean;
}

/**
 * Response returned after creating a media container.
 */
export interface MediaContainerResponse {
  /** Container ID used for publishing. */
  id: string;
}

/**
 * Response returned after publishing a media container.
 */
export interface PublishMediaResponse {
  /** Published media ID. */
  id: string;
}

/**
 * Payload for creating a carousel item container.
 *
 * Each carousel slide must be created individually with `is_carousel_item=true`
 * before assembling the carousel container.
 */
export interface CreateCarouselItemInput {
  /** Publicly accessible image URL for an image slide. */
  imageUrl?: string;
  /** Publicly accessible video URL for a video slide. */
  videoUrl?: string;
  /** Accessibility description for image slides. */
  altText?: string;
  /** User tags applied to the slide. */
  userTags?: Array<{ username: string; x: number; y: number }>;
}

/**
 * Payload for creating a carousel container from item container IDs.
 */
export interface CreateCarouselContainerInput {
  /** Container IDs returned by {@link MediaResource.createCarouselItemContainer}. */
  children: string[];
  /** Optional carousel caption. */
  caption?: string;
  /** Whether to share the carousel to feed. */
  shareToFeed?: boolean;
  /** Collaborator usernames. */
  collaborators?: string[];
  /** Location ID to tag on the carousel. */
  locationId?: string;
  /** Product tags to apply to the carousel. */
  productTags?: Array<{ productId: string | number; x?: number; y?: number }>;
}

/**
 * Input for initializing a resumable upload session.
 */
export interface CreateResumableUploadInput {
  /** Media type for the resumable container. */
  mediaType: 'REELS' | 'STORIES' | 'VIDEO';
  caption?: string;
  coverUrl?: string;
  shareToFeed?: boolean;
  collaborators?: string[];
  locationId?: string;
}

/**
 * Response returned when initializing a resumable upload session.
 */
export interface ResumableUploadSessionResponse extends MediaContainerResponse {
  /** Upload URI returned by Graph API for large file uploads. */
  uri?: string;
}

/**
 * Input for uploading binary video data to a resumable session.
 */
export interface UploadResumableVideoInput {
  /** Container ID returned by resumable session creation. */
  containerId: string;
  /** Raw video bytes. */
  file: Uint8Array;
  /** Total file size in bytes. */
  fileSize: number;
  /** Byte offset for partial uploads. Defaults to `0`. */
  offset?: number;
}

/**
 * Reply payload for public comment threads.
 */
export interface ReplyToCommentInput {
  /** Reply body text. */
  message: string;
}

/**
 * Response returned after replying to a comment.
 */
export interface CommentReplyResponse {
  id: string;
}

/**
 * Container processing status for video uploads.
 */
export interface MediaContainerStatus {
  /** Container ID. */
  id: string;
  /** Processing status code. */
  status_code?: 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED';
  /** Human-readable status message. */
  status?: string;
}

/**
 * Options for {@link MediaResource.waitForContainerReady}.
 */
export interface WaitForContainerReadyOptions {
  /** Delay between polling attempts in milliseconds. Defaults to `2000`. */
  intervalMs?: number;
  /** Maximum polling attempts before failing. Defaults to `30`. */
  maxAttempts?: number;
}

/**
 * Options for {@link MediaResource.publishWhenReady}.
 */
export interface PublishWhenReadyOptions extends WaitForContainerReadyOptions {
  /** When true, checks publishing quota before attempting to publish. */
  enforceQuota?: boolean;
}

/**
 * Parsed publishing quota summary.
 */
export interface PublishingQuotaSummary {
  /** Number of containers published in the current window. */
  usage: number;
  /** Maximum containers allowed in the window. */
  total: number;
  /** Remaining publish slots in the current window. */
  remaining: number;
  /** Quota window duration in seconds. */
  durationSeconds?: number;
}
