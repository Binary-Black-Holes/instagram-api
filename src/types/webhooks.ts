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
 *
 * Instagram messaging webhooks deliver several event shapes through the
 * `messaging` array. The relevant property (`message`, `reaction`, `postback`,
 * `read`, or `referral`) indicates the event subtype.
 *
 * @see https://developers.facebook.com/docs/instagram-platform/webhooks
 */
export interface InstagramWebhookMessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    /** `true` when the business account messaged itself (self messaging). */
    is_self?: boolean;
    attachments?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
  /** `true` when the event is a self-messaging event (postbacks and others). */
  is_self?: boolean;
  reaction?: {
    mid?: string;
    action?: string;
    reaction?: string;
    emoji?: string;
    [key: string]: unknown;
  };
  postback?: {
    mid?: string;
    title?: string;
    payload?: string;
    [key: string]: unknown;
  };
  read?: {
    mid?: string;
    [key: string]: unknown;
  };
  referral?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Discrete messaging event subtype resolved from an
 * {@link InstagramWebhookMessagingEvent}.
 */
export type InstagramMessagingEventType =
  | 'message'
  | 'message_echo'
  | 'reaction'
  | 'postback'
  | 'read'
  | 'referral'
  | 'unknown';

/**
 * Context passed to field-change webhook listeners (e.g. `comments`,
 * `mentions`, `live_comments`).
 */
export interface WebhookChangeEvent {
  /** Field that changed, e.g. `comments`. */
  field: WebhookField | string;
  /** Field-specific change payload. */
  value: Record<string, unknown>;
  /** Instagram professional account ID the event belongs to. */
  entryId?: string | undefined;
  /** Unix timestamp (seconds) the change occurred. */
  time?: number | undefined;
  /** Full entry the change was delivered in. */
  entry: InstagramWebhookEntry;
  /** Full webhook payload. */
  payload: InstagramWebhookPayload;
}

/**
 * Context passed to messaging webhook listeners.
 */
export interface WebhookMessagingEvent {
  /** Resolved messaging event subtype. */
  type: InstagramMessagingEventType;
  /** Raw messaging event payload. */
  messaging: InstagramWebhookMessagingEvent;
  /** Instagram professional account ID the event belongs to. */
  entryId?: string | undefined;
  /** Full entry the messaging event was delivered in. */
  entry: InstagramWebhookEntry;
  /** Full webhook payload. */
  payload: InstagramWebhookPayload;
}

/**
 * Listener invoked for a field-change webhook event.
 */
export type WebhookChangeListener = (event: WebhookChangeEvent) => void | Promise<void>;

/**
 * Listener invoked for a messaging webhook event.
 */
export type WebhookMessagingListener = (event: WebhookMessagingEvent) => void | Promise<void>;

/**
 * Listener invoked when a registered webhook listener throws.
 */
export type WebhookErrorListener = (
  error: unknown,
  context: { payload: InstagramWebhookPayload },
) => void | Promise<void>;

/**
 * Configuration for {@link InstagramWebhookHandler}.
 */
export interface InstagramWebhookHandlerConfig {
  /** Meta application secret used to verify `X-Hub-Signature-256`. */
  appSecret: string;
  /** Verify token configured in the Meta app dashboard for GET challenges. */
  verifyToken?: string;
  /**
   * When `true` (default), signature verification is required for
   * {@link InstagramWebhookHandler.handleEvent}. Set to `false` only for local
   * testing where signatures are unavailable.
   */
  requireSignature?: boolean;
}
