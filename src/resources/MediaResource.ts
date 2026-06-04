import type {
  ContentPublishingLimitOptions,
  ContentPublishingLimitResponse,
} from '../types/account.js';
import type {
  CommentReplyResponse,
  CreateCarouselContainerInput,
  CreateCarouselItemInput,
  CreateImageMediaInput,
  CreateResumableUploadInput,
  CreateStoryMediaInput,
  CreateVideoMediaInput,
  GetMediaOptions,
  InstagramComment,
  InstagramMedia,
  ListMediaCommentsOptions,
  MediaContainerResponse,
  MediaContainerStatus,
  PublishMediaResponse,
  ReplyToCommentInput,
  ResumableUploadSessionResponse,
  UploadResumableVideoInput,
  WaitForContainerReadyOptions,
  PublishWhenReadyOptions,
  PublishingQuotaSummary,
} from '../types/media.js';
import type { PaginatedResponse } from '../types/common.js';
import { ValidationError } from '../errors/index.js';
import { collectAllPages } from '../utils/pagination.js';
import { extractPublishingQuota } from '../utils/publishing.js';
import { serializeCarouselChildren, serializeProductTags } from '../utils/graph.js';
import { resolveFields, sleep } from '../utils/url.js';
import { BaseResource } from './BaseResource.js';

const DEFAULT_MEDIA_FIELDS = [
  'id',
  'media_type',
  'media_url',
  'thumbnail_url',
  'permalink',
  'timestamp',
  'caption',
  'like_count',
  'comments_count',
  'owner',
  'children{id,media_type,media_url}',
] as const;

/**
 * Instagram media read and publish resource.
 *
 * Maps to Meta's IG User Media and IG User Media Publish endpoints.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media_publish
 */
export class MediaResource extends BaseResource {
  /**
   * Retrieves a media object by ID.
   *
   * Graph API: `GET /{ig-media-id}`
   */
  async getById(mediaId: string, options: GetMediaOptions = {}): Promise<InstagramMedia> {
    this.assertNonEmptyId(mediaId, 'mediaId');

    const response = await this.http.request<InstagramMedia>({
      path: `/${mediaId}`,
      params: {
        fields: resolveFields(options.fields, [...DEFAULT_MEDIA_FIELDS]),
      },
    });

    return response.data;
  }

  /**
   * Lists comments attached to a media object.
   *
   * Graph API: `GET /{ig-media-id}/comments`
   */
  async listComments(
    mediaId: string,
    options: ListMediaCommentsOptions = {},
  ): Promise<PaginatedResponse<InstagramComment>> {
    this.assertNonEmptyId(mediaId, 'mediaId');

    const response = await this.http.request<PaginatedResponse<InstagramComment>>({
      path: `/${mediaId}/comments`,
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
   * Retrieves all comments for a media object across paginated results.
   */
  async listAllComments(
    mediaId: string,
    options: ListMediaCommentsOptions = {},
  ): Promise<InstagramComment[]> {
    return collectAllPages((pagination) => this.listComments(mediaId, { ...options, ...pagination }));
  }

  /**
   * Creates an image media container prior to publishing.
   *
   * Graph API: `POST /{ig-user-id}/media` with `image_url`.
   */
  async createImageContainer(input: CreateImageMediaInput): Promise<MediaContainerResponse> {
    const accountId = this.resolveAccountId();

    const response = await this.http.request<MediaContainerResponse>({
      path: `/${accountId}/media`,
      method: 'POST',
      params: {
        image_url: input.imageUrl,
        caption: input.caption,
        alt_text: input.altText,
        location_id: input.locationId,
        user_tags: input.userTags ? JSON.stringify(input.userTags) : undefined,
      },
    });

    return response.data;
  }

  /**
   * Creates a story media container prior to publishing.
   *
   * Graph API: `POST /{ig-user-id}/media` with `media_type=STORIES`.
   */
  async createStoryContainer(input: CreateStoryMediaInput): Promise<MediaContainerResponse> {
    if (!input.imageUrl && !input.videoUrl) {
      throw new ValidationError('Either imageUrl or videoUrl must be provided for story containers.');
    }

    const accountId = this.resolveAccountId();

    const response = await this.http.request<MediaContainerResponse>({
      path: `/${accountId}/media`,
      method: 'POST',
      params: {
        media_type: input.mediaType,
        image_url: input.imageUrl,
        video_url: input.videoUrl,
        cover_url: input.coverUrl,
      },
    });

    return response.data;
  }

  /**
   * Creates a video or reels media container prior to publishing.
   *
   * Graph API: `POST /{ig-user-id}/media` with `video_url` and `media_type`.
   */
  async createVideoContainer(input: CreateVideoMediaInput): Promise<MediaContainerResponse> {
    const accountId = this.resolveAccountId();

    const response = await this.http.request<MediaContainerResponse>({
      path: `/${accountId}/media`,
      method: 'POST',
      params: {
        media_type: input.mediaType ?? 'REELS',
        video_url: input.videoUrl,
        caption: input.caption,
        cover_url: input.coverUrl,
        share_to_feed: input.shareToFeed,
      },
    });

    return response.data;
  }

  /**
   * Checks container processing status for video/reels uploads.
   *
   * Graph API: `GET /{ig-container-id}?fields=status_code`
   */
  async getContainerStatus(containerId: string): Promise<MediaContainerStatus> {
    this.assertNonEmptyId(containerId, 'containerId');

    const response = await this.http.request<MediaContainerStatus>({
      path: `/${containerId}`,
      params: {
        fields: 'id,status,status_code',
      },
    });

    return response.data;
  }

  /**
   * Publishes a prepared media container.
   *
   * Graph API: `POST /{ig-user-id}/media_publish?creation_id={container-id}`
   */
  async publish(containerId: string): Promise<PublishMediaResponse> {
    this.assertNonEmptyId(containerId, 'containerId');
    const accountId = this.resolveAccountId();

    const response = await this.http.request<PublishMediaResponse>({
      path: `/${accountId}/media_publish`,
      method: 'POST',
      params: {
        creation_id: containerId,
      },
    });

    return response.data;
  }

  /**
   * Polls container status until Graph API reports the container is ready to publish.
   *
   * Graph API: repeated `GET /{ig-container-id}?fields=status_code`
   */
  async waitForContainerReady(
    containerId: string,
    options: WaitForContainerReadyOptions = {},
  ): Promise<MediaContainerStatus> {
    this.assertNonEmptyId(containerId, 'containerId');

    const intervalMs = options.intervalMs ?? 2_000;
    const maxAttempts = options.maxAttempts ?? 30;
    const readyStatuses = new Set<NonNullable<MediaContainerStatus['status_code']>>([
      'FINISHED',
      'PUBLISHED',
    ]);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const status = await this.getContainerStatus(containerId);

      if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
        throw new ValidationError(`Container ${containerId} failed with status ${status.status_code}.`);
      }

      if (status.status_code && readyStatuses.has(status.status_code)) {
        return status;
      }

      if (attempt < maxAttempts - 1) {
        await sleep(intervalMs);
      }
    }

    throw new ValidationError(
      `Container ${containerId} did not become ready within ${maxAttempts} attempts.`,
    );
  }

  /**
   * Returns publishing quota usage and throws when no publish slots remain.
   */
  async assertPublishingQuotaAvailable(): Promise<PublishingQuotaSummary> {
    const response = await this.getContentPublishingLimit({
      fields: ['quota_usage', 'config'],
    });
    const summary = extractPublishingQuota(response);

    if (summary.total > 0 && summary.remaining <= 0) {
      throw new ValidationError(
        `Publishing quota exhausted (${summary.usage}/${summary.total}).`,
      );
    }

    return summary;
  }

  /**
   * Waits for a container to finish processing and publishes it.
   *
   * Optionally enforces publishing quota checks before waiting and publishing.
   */
  async publishWhenReady(
    containerId: string,
    options: PublishWhenReadyOptions = {},
  ): Promise<PublishMediaResponse> {
    if (options.enforceQuota) {
      await this.assertPublishingQuotaAvailable();
    }

    await this.waitForContainerReady(containerId, options);
    return this.publish(containerId);
  }

  /**
   * Creates a carousel item container used as a child of a carousel post.
   *
   * Graph API: `POST /{ig-user-id}/media` with `is_carousel_item=true`
   */
  async createCarouselItemContainer(input: CreateCarouselItemInput): Promise<MediaContainerResponse> {
    if (!input.imageUrl && !input.videoUrl) {
      throw new ValidationError('Either imageUrl or videoUrl must be provided for carousel items.');
    }

    const accountId = this.resolveAccountId();
    const response = await this.http.request<MediaContainerResponse>({
      path: `/${accountId}/media`,
      method: 'POST',
      params: {
        is_carousel_item: true,
        image_url: input.imageUrl,
        video_url: input.videoUrl,
        alt_text: input.altText,
        user_tags: input.userTags ? JSON.stringify(input.userTags) : undefined,
      },
    });

    return response.data;
  }

  /**
   * Creates a carousel container from previously uploaded carousel item containers.
   *
   * Graph API: `POST /{ig-user-id}/media` with `media_type=CAROUSEL`
   */
  async createCarouselContainer(input: CreateCarouselContainerInput): Promise<MediaContainerResponse> {
    if (!input.children.length) {
      throw new ValidationError('At least one carousel child container ID must be provided.');
    }

    if (input.children.length > 10) {
      throw new ValidationError('Carousel posts support up to 10 child containers.');
    }

    const accountId = this.resolveAccountId();
    const response = await this.http.request<MediaContainerResponse>({
      path: `/${accountId}/media`,
      method: 'POST',
      params: {
        media_type: 'CAROUSEL',
        caption: input.caption,
        share_to_feed: input.shareToFeed,
        collaborators: input.collaborators?.join(','),
        location_id: input.locationId,
        product_tags: input.productTags ? serializeProductTags(input.productTags) : undefined,
        children: serializeCarouselChildren(input.children),
      },
    });

    return response.data;
  }

  /**
   * Initializes a resumable upload session for large video files.
   *
   * Graph API: `POST /{ig-user-id}/media` with `upload_type=resumable`
   */
  async createResumableUploadSession(
    input: CreateResumableUploadInput,
  ): Promise<ResumableUploadSessionResponse> {
    const accountId = this.resolveAccountId();
    const response = await this.http.request<ResumableUploadSessionResponse>({
      path: `/${accountId}/media`,
      method: 'POST',
      params: {
        media_type: input.mediaType,
        upload_type: 'resumable',
        caption: input.caption,
        cover_url: input.coverUrl,
        share_to_feed: input.shareToFeed,
        collaborators: input.collaborators?.join(','),
        location_id: input.locationId,
      },
    });

    return response.data;
  }

  /**
   * Uploads binary video data to a resumable session container.
   *
   * Graph API: `POST https://rupload.facebook.com/ig-api-upload/{version}/{container-id}`
   */
  async uploadResumableVideo(input: UploadResumableVideoInput): Promise<{ success?: boolean; message?: string }> {
    this.assertNonEmptyId(input.containerId, 'containerId');

    return this.http.uploadResumableVideo({
      containerId: input.containerId,
      file: input.file,
      fileSize: input.fileSize,
      ...(input.offset !== undefined ? { offset: input.offset } : {}),
    });
  }

  /**
   * Replies publicly to an Instagram comment.
   *
   * Graph API: `POST /{ig-comment-id}/replies`
   */
  async replyToComment(commentId: string, input: ReplyToCommentInput): Promise<CommentReplyResponse> {
    this.assertNonEmptyId(commentId, 'commentId');

    if (!input.message.trim()) {
      throw new ValidationError('message must be a non-empty string.');
    }

    const response = await this.http.request<CommentReplyResponse>({
      path: `/${commentId}/replies`,
      method: 'POST',
      body: {
        message: input.message,
      },
    });

    return response.data;
  }

  /**
   * Returns the account's current content publishing quota usage.
   *
   * Graph API: `GET /{ig-user-id}/content_publishing_limit`
   */
  async getContentPublishingLimit(
    options: ContentPublishingLimitOptions = {},
  ): Promise<ContentPublishingLimitResponse> {
    const accountId = this.resolveAccountId();

    const response = await this.http.request<ContentPublishingLimitResponse>({
      path: `/${accountId}/content_publishing_limit`,
      params: {
        fields: options.fields?.join(','),
        since: options.since,
      },
    });

    return response.data;
  }

  /**
   * Deletes a comment by ID.
   *
   * Graph API: `DELETE /{ig-comment-id}`
   */
  async deleteComment(commentId: string): Promise<{ success: boolean }> {
    this.assertNonEmptyId(commentId, 'commentId');

    const response = await this.http.request<{ success: boolean }>({
      path: `/${commentId}`,
      method: 'DELETE',
    });

    return response.data;
  }

  /**
   * Hides or unhides a comment on media owned by the configured account.
   *
   * Graph API: `POST /{ig-comment-id}?hide={boolean}`
   */
  async setCommentHidden(commentId: string, hidden: boolean): Promise<{ success: boolean }> {
    this.assertNonEmptyId(commentId, 'commentId');

    const response = await this.http.request<{ success: boolean }>({
      path: `/${commentId}`,
      method: 'POST',
      params: {
        hide: hidden,
      },
    });

    return response.data;
  }

  /**
   * Lists replies on a comment.
   *
   * Graph API: `GET /{ig-comment-id}/replies`
   *
   * @see https://developers.facebook.com/docs/instagram-platform/comment-moderation
   */
  async listCommentReplies(
    commentId: string,
    options: ListMediaCommentsOptions = {},
  ): Promise<PaginatedResponse<InstagramComment>> {
    this.assertNonEmptyId(commentId, 'commentId');

    const response = await this.http.request<PaginatedResponse<InstagramComment>>({
      path: `/${commentId}/replies`,
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
   * Enables or disables commenting on a media object.
   *
   * Graph API: `POST /{ig-media-id}?comment_enabled={boolean}`
   *
   * @see https://developers.facebook.com/docs/instagram-platform/comment-moderation
   */
  async setCommentsEnabled(mediaId: string, enabled: boolean): Promise<{ success: boolean }> {
    this.assertNonEmptyId(mediaId, 'mediaId');

    const response = await this.http.request<{ success: boolean }>({
      path: `/${mediaId}`,
      method: 'POST',
      params: {
        comment_enabled: enabled,
      },
    });

    return response.data;
  }

  private assertNonEmptyId(value: string, fieldName: string): void {
    if (!value.trim()) {
      throw new ValidationError(`${fieldName} must be a non-empty string.`);
    }
  }
}
