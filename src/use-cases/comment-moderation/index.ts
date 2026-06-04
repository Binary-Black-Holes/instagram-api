import type { MediaResource } from '../../resources/MediaResource.js';
import type {
  InstagramComment,
  ListMediaCommentsOptions,
} from '../../types/media.js';
import type { CommentReplyResponse } from '../../types/media.js';
import type { PaginatedResponse } from '../../types/common.js';
import type { WebhookChangeEvent } from '../../types/webhooks.js';
import { ValidationError } from '../../errors/index.js';

/**
 * Normalized comment data extracted from a `comments` / `live_comments`
 * webhook notification.
 *
 * Meta delivers two payload shapes — one for Facebook Login for Business and a
 * flattened one for Business Login for Instagram. This shape unifies both.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/comment-moderation
 */
export interface ModeratedComment {
  /** ID of the comment that triggered the notification. */
  commentId?: string | undefined;
  /** Parent comment ID when the comment is a reply. */
  parentId?: string | undefined;
  /** Comment text, when present. */
  text?: string | undefined;
  /** Instagram-scoped ID of the commenter. */
  fromId?: string | undefined;
  /** Username of the commenter. */
  fromUsername?: string | undefined;
  /** ID of the media that was commented on. */
  mediaId?: string | undefined;
  /** Media product type, when present. */
  mediaProductType?: string | undefined;
  /**
   * `true` when the comment was made by the app user on their own media
   * (self-comment webhook), detected via `from.self_ig_scoped_id`.
   */
  isSelf: boolean;
}

interface RawCommentValue {
  id?: string;
  comment_id?: string;
  parent_id?: string;
  text?: string;
  from?: {
    id?: string;
    username?: string;
    self_ig_scoped_id?: string;
  };
  media?: {
    id?: string;
    media_product_type?: string;
  };
}

/**
 * High-level comment moderation workflows for an Instagram professional account.
 *
 * Composes {@link MediaResource} comment endpoints into the operations
 * described in Meta's Comment Moderation guide: reading comments and replies,
 * replying, hiding/unhiding, deleting, and toggling comments on a media object.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/comment-moderation
 */
export class CommentModerationUseCase {
  /**
   * @param media - Shared media resource used for comment operations.
   */
  constructor(private readonly media: MediaResource) {}

  /**
   * Lists comments on a media object.
   *
   * Graph API: `GET /{ig-media-id}/comments`
   */
  getComments(
    mediaId: string,
    options?: ListMediaCommentsOptions,
  ): Promise<PaginatedResponse<InstagramComment>> {
    return this.media.listComments(mediaId, options);
  }

  /**
   * Retrieves every comment on a media object, following pagination cursors.
   */
  getAllComments(
    mediaId: string,
    options?: ListMediaCommentsOptions,
  ): Promise<InstagramComment[]> {
    return this.media.listAllComments(mediaId, options);
  }

  /**
   * Lists replies on a comment.
   *
   * Graph API: `GET /{ig-comment-id}/replies`
   */
  getReplies(
    commentId: string,
    options?: ListMediaCommentsOptions,
  ): Promise<PaginatedResponse<InstagramComment>> {
    return this.media.listCommentReplies(commentId, options);
  }

  /**
   * Publicly replies to a comment.
   *
   * Graph API: `POST /{ig-comment-id}/replies`
   */
  reply(commentId: string, message: string): Promise<CommentReplyResponse> {
    return this.media.replyToComment(commentId, { message });
  }

  /**
   * Hides a comment.
   *
   * Graph API: `POST /{ig-comment-id}?hide=true`
   */
  hide(commentId: string): Promise<{ success: boolean }> {
    return this.media.setCommentHidden(commentId, true);
  }

  /**
   * Unhides a previously hidden comment.
   *
   * Graph API: `POST /{ig-comment-id}?hide=false`
   */
  unhide(commentId: string): Promise<{ success: boolean }> {
    return this.media.setCommentHidden(commentId, false);
  }

  /**
   * Deletes a comment.
   *
   * Graph API: `DELETE /{ig-comment-id}`
   */
  delete(commentId: string): Promise<{ success: boolean }> {
    return this.media.deleteComment(commentId);
  }

  /**
   * Disables commenting on a media object.
   *
   * Graph API: `POST /{ig-media-id}?comment_enabled=false`
   */
  disableComments(mediaId: string): Promise<{ success: boolean }> {
    return this.media.setCommentsEnabled(mediaId, false);
  }

  /**
   * Enables commenting on a media object.
   *
   * Graph API: `POST /{ig-media-id}?comment_enabled=true`
   */
  enableComments(mediaId: string): Promise<{ success: boolean }> {
    return this.media.setCommentsEnabled(mediaId, true);
  }

  /**
   * Normalizes a `comments` / `live_comments` webhook change event into a
   * single {@link ModeratedComment} regardless of login type payload shape.
   *
   * @throws {ValidationError} when the event is not a comment change event.
   */
  fromWebhookEvent(event: WebhookChangeEvent): ModeratedComment {
    if (event.field !== 'comments' && event.field !== 'live_comments') {
      throw new ValidationError(
        `Expected a 'comments' or 'live_comments' webhook event, received '${String(event.field)}'.`,
      );
    }

    const value = (event.value ?? {}) as RawCommentValue;

    return {
      commentId: value.comment_id ?? value.id,
      parentId: value.parent_id,
      text: value.text,
      fromId: value.from?.id,
      fromUsername: value.from?.username,
      mediaId: value.media?.id,
      mediaProductType: value.media?.media_product_type,
      isSelf: Boolean(value.from?.self_ig_scoped_id),
    };
  }
}
