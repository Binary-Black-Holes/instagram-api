import type { MessagingResource } from '../../resources/MessagingResource.js';
import type { SendMessageResponse } from '../../types/messaging.js';
import type { WebhookMessagingEvent } from '../../types/webhooks.js';
import { ValidationError } from '../../errors/index.js';

/**
 * Self messaging lets a single Instagram professional account act as both the
 * business and the Instagram user, which is useful for previewing messaging
 * automation. Because the business is messaging itself, the 24-hour response
 * window does not apply.
 *
 * Self messages arrive as echo webhooks with `is_echo: true` and `is_self:
 * true`; postbacks arrive with `is_self: true`.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/self-messaging
 */
export class SelfMessagingUseCase {
  /**
   * @param messaging - Shared messaging resource used to send messages.
   */
  constructor(private readonly messaging: MessagingResource) {}

  /**
   * Sends a message from the professional account to itself.
   *
   * Graph API: `POST /{ig-user-id}/messages`
   *
   * @param recipientId - The Instagram-scoped ID received from the echo webhook.
   * @param text - Message text.
   */
  sendToSelf(recipientId: string, text: string): Promise<SendMessageResponse> {
    return this.messaging.sendTextMessage({ recipientId, text });
  }

  /**
   * Returns `true` when a messaging webhook event represents a self message or
   * self postback (`is_self: true` at the event or message level).
   */
  isSelfEvent(event: WebhookMessagingEvent): boolean {
    return Boolean(event.messaging.is_self ?? event.messaging.message?.is_self);
  }

  /**
   * Returns `true` when a messaging webhook event is an echo (a message the
   * account itself sent).
   */
  isEcho(event: WebhookMessagingEvent): boolean {
    return Boolean(event.messaging.message?.is_echo);
  }

  /**
   * Replies to a self-messaging webhook event using the sender's
   * Instagram-scoped ID as the recipient.
   *
   * @throws {ValidationError} when the event has no resolvable sender ID.
   */
  async replyToSelfEvent(
    event: WebhookMessagingEvent,
    text: string,
  ): Promise<SendMessageResponse> {
    const recipientId = event.messaging.sender?.id;

    if (!recipientId) {
      throw new ValidationError('Could not resolve a sender ID from the self-messaging event.');
    }

    return this.sendToSelf(recipientId, text);
  }
}
