/**
 * Webhook fields supported by Instagram Platform subscriptions.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/webhooks
 */
export type WebhookField =
  | 'comments'
  | 'live_comments'
  | 'mentions'
  | 'messages'
  | 'message_echoes'
  | 'message_reactions'
  | 'messaging_postbacks'
  | 'messaging_seen'
  | 'messaging_handover'
  | 'standby';

/**
 * Options for subscribing to Instagram webhooks.
 */
export interface SubscribeWebhooksOptions {
  /** Webhook fields to subscribe to. */
  fields: WebhookField[];
}

/**
 * Response returned after subscribing or unsubscribing from webhooks.
 */
export interface WebhookSubscriptionResponse {
  success: boolean;
}

/**
 * Subscribed app metadata returned by Graph API.
 */
export interface SubscribedApp {
  id?: string;
  name?: string;
  subscribed_fields?: WebhookField[];
}

/**
 * Response from listing webhook subscriptions.
 */
export interface SubscribedAppsResponse {
  data: SubscribedApp[];
}

/**
 * Query parameters sent during Meta webhook verification.
 */
export interface WebhookChallengeQuery {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

/**
 * Generic Instagram webhook event envelope.
 */
export interface InstagramWebhookPayload {
  object?: string;
  entry?: InstagramWebhookEntry[];
}

/**
 * Single webhook entry in an Instagram event payload.
 */
export interface InstagramWebhookEntry {
  id?: string;
  time?: number;
  changes?: InstagramWebhookChange[];
  messaging?: InstagramWebhookMessagingEvent[];
}

/**
 * Field change notification inside a webhook entry.
 */
export interface InstagramWebhookChange {
  field?: WebhookField | string;
  value?: Record<string, unknown>;
}

/**
 * Messaging event notification inside a webhook entry.
 */
export interface InstagramWebhookMessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
  };
}
