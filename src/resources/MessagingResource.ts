import type {
  SendMediaShareInput,
  SendMessageResponse,
  SendPrivateReplyInput,
  SendTextMessageInput,
} from '../types/messaging.js';
import { ValidationError } from '../errors/index.js';
import { BaseResource } from './BaseResource.js';

/**
 * Instagram Direct messaging resource.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api
 * @see https://developers.facebook.com/docs/instagram-platform/private-replies
 */
export class MessagingResource extends BaseResource {
  /**
   * Sends a text direct message to an Instagram-scoped user ID.
   *
   * Graph API: `POST /{ig-user-id}/messages`
   */
  async sendTextMessage(input: SendTextMessageInput): Promise<SendMessageResponse> {
    if (!input.recipientId.trim()) {
      throw new ValidationError('recipientId must be a non-empty string.');
    }

    if (!input.text.trim()) {
      throw new ValidationError('text must be a non-empty string.');
    }

    return this.sendMessage({
      recipient: { id: input.recipientId },
      message: { text: input.text },
    });
  }

  /**
   * Shares published media in a direct message thread.
   *
   * Graph API: `POST /{ig-user-id}/messages`
   */
  async sendMediaShare(input: SendMediaShareInput): Promise<SendMessageResponse> {
    if (!input.recipientId.trim()) {
      throw new ValidationError('recipientId must be a non-empty string.');
    }

    if (!input.mediaId.trim()) {
      throw new ValidationError('mediaId must be a non-empty string.');
    }

    return this.sendMessage({
      recipient: { id: input.recipientId },
      message: {
        attachment: {
          type: 'MEDIA_SHARE',
          payload: { id: input.mediaId },
        },
      },
    });
  }

  /**
   * Sends a private reply to a user who commented on media.
   *
   * Graph API: `POST /{ig-user-id}/messages`
   */
  async sendPrivateReply(input: SendPrivateReplyInput): Promise<SendMessageResponse> {
    if (!input.commentId.trim()) {
      throw new ValidationError('commentId must be a non-empty string.');
    }

    if (!input.text.trim()) {
      throw new ValidationError('text must be a non-empty string.');
    }

    return this.sendMessage({
      recipient: { comment_id: input.commentId },
      message: { text: input.text },
    });
  }

  private async sendMessage(body: {
    recipient: { id?: string; comment_id?: string };
    message: {
      text?: string;
      attachment?: {
        type: 'MEDIA_SHARE';
        payload: { id: string };
      };
    };
  }): Promise<SendMessageResponse> {
    const accountId = this.resolveAccountId();
    const response = await this.http.request<SendMessageResponse>({
      path: `/${accountId}/messages`,
      method: 'POST',
      body,
    });

    return response.data;
  }
}
