import type { MessagingResource } from '../../resources/MessagingResource.js';
import type { SendMessageResponse } from '../../types/messaging.js';
import type { WebhookChangeEvent } from '../../types/webhooks.js';
import { ValidationError } from '../../errors/index.js';

/**
 * Sends a private (Direct) reply to a person who commented on the app user's
 * media, reel, story, Live, or ad post.
 *
 * Private replies are webhook-driven: a `comments` event delivers a comment ID
 * that you respond to with {@link MessagingResource.sendPrivateReply}. Meta
 * limits private replies to one message within 7 days of the comment (during
 * the broadcast only, for Instagram Live).
 *
 * @see https://developers.facebook.com/docs/instagram-platform/private-replies
 */
export class PrivateRepliesUseCase {
  /**
   * @param messaging - Shared messaging resource used to send replies.
   */
  constructor(private readonly messaging: MessagingResource) {}

  /**
   * Sends a private reply to the author of a comment.
   *
   * Graph API: `POST /{ig-user-id}/messages` with `recipient.comment_id`.
   */
  sendToComment(commentId: string, text: string): Promise<SendMessageResponse> {
    return this.messaging.sendPrivateReply({ commentId, text });
  }

  /**
   * Sends a private reply in response to a `comments` / `live_comments` webhook
   * event by extracting the comment ID from either login-type payload shape.
   *
   * @throws {ValidationError} when no comment ID can be resolved from the event.
   */
  async replyToCommentEvent(
    event: WebhookChangeEvent,
    text: string,
  ): Promise<SendMessageResponse> {
    const value = (event.value ?? {}) as { id?: string; comment_id?: string };
    const commentId = value.comment_id ?? value.id;

    if (!commentId) {
      throw new ValidationError('Could not resolve a comment ID from the webhook event.');
    }

    return this.sendToComment(commentId, text);
  }
}
