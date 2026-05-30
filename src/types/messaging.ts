/**
 * Recipient descriptor for Instagram messaging requests.
 */
export interface MessageRecipient {
  /** Instagram-scoped user ID. */
  id?: string;
  /** Comment ID when sending a private reply. */
  commentId?: string;
}

/**
 * Text message payload.
 */
export interface TextMessagePayload {
  text: string;
}

/**
 * Media share attachment payload.
 */
export interface MediaShareMessagePayload {
  attachment: {
    type: 'MEDIA_SHARE';
    payload: {
      id: string;
    };
  };
}

/**
 * Outbound message request body accepted by Graph API.
 */
export interface SendMessageRequest {
  recipient: {
    id?: string;
    comment_id?: string;
  };
  message: {
    text?: string;
    attachment?: MediaShareMessagePayload['attachment'];
  };
}

/**
 * Response returned after sending a message.
 */
export interface SendMessageResponse {
  recipient_id?: string;
  message_id?: string;
}

/**
 * Input for sending a text direct message.
 */
export interface SendTextMessageInput {
  /** Instagram-scoped recipient ID. */
  recipientId: string;
  /** UTF-8 message text up to 1000 bytes. */
  text: string;
}

/**
 * Input for sharing published media in a direct message.
 */
export interface SendMediaShareInput {
  /** Instagram-scoped recipient ID. */
  recipientId: string;
  /** Published Instagram media ID to share. */
  mediaId: string;
}

/**
 * Input for sending a private reply to a commenter.
 */
export interface SendPrivateReplyInput {
  /** Comment ID to reply to privately. */
  commentId: string;
  /** Private reply text. */
  text: string;
}
