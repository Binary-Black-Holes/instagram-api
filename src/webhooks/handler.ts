import type {
  InstagramMessagingEventType,
  InstagramWebhookEntry,
  InstagramWebhookMessagingEvent,
  InstagramWebhookHandlerConfig,
  InstagramWebhookPayload,
  WebhookChallengeQuery,
  WebhookChangeListener,
  WebhookErrorListener,
  WebhookField,
  WebhookMessagingListener,
} from '../types/webhooks.js';
import { ValidationError } from '../errors/index.js';
import { parseWebhookPayload } from './parse.js';
import { verifyWebhookChallenge, verifyWebhookSignature } from './verify.js';

/**
 * Options for {@link InstagramWebhookHandler.handleEvent}.
 */
export interface HandleEventOptions {
  /** Value of the `X-Hub-Signature-256` header. */
  signatureHeader?: string;
  /** Override the handler's default signature requirement for this call. */
  requireSignature?: boolean;
}

/**
 * Result returned from {@link InstagramWebhookHandler.handleEvent}.
 */
export interface HandleEventResult {
  /** Parsed and dispatched webhook payload. */
  payload: InstagramWebhookPayload;
  /** Number of field-change events dispatched. */
  changeCount: number;
  /** Number of messaging events dispatched. */
  messagingCount: number;
}

/**
 * Resolves the discrete subtype of a messaging webhook event.
 */
function resolveMessagingEventType(
  event: InstagramWebhookMessagingEvent,
): InstagramMessagingEventType {
  if (event.message) {
    return event.message.is_echo ? 'message_echo' : 'message';
  }
  if (event.reaction) return 'reaction';
  if (event.postback) return 'postback';
  if (event.read) return 'read';
  if (event.referral) return 'referral';
  return 'unknown';
}

/**
 * Framework-agnostic Instagram webhook handler.
 *
 * Combines the GET verification challenge, `X-Hub-Signature-256` verification,
 * payload parsing, and typed event dispatch into a single object so apps can
 * wire Instagram webhooks into Express, Fastify, Next.js, or any HTTP server
 * without re-implementing the boilerplate.
 *
 * @example
 * ```ts
 * const handler = new InstagramWebhookHandler({
 *   appSecret: process.env.META_APP_SECRET!,
 *   verifyToken: process.env.WEBHOOK_VERIFY_TOKEN!,
 * });
 *
 * handler.onComment(({ value }) => console.log('new comment', value));
 * handler.onMessage(({ messaging }) => console.log('dm', messaging.message?.text));
 *
 * // GET /webhooks/instagram
 * app.get('/webhooks/instagram', (req, res) => {
 *   try {
 *     res.send(handler.handleVerification(req.query));
 *   } catch {
 *     res.sendStatus(403);
 *   }
 * });
 *
 * // POST /webhooks/instagram (raw body required)
 * app.post('/webhooks/instagram', async (req, res) => {
 *   try {
 *     await handler.handleEvent(req.rawBody, {
 *       signatureHeader: req.header('x-hub-signature-256'),
 *     });
 *     res.sendStatus(200);
 *   } catch {
 *     res.sendStatus(400);
 *   }
 * });
 * ```
 *
 * @see https://developers.facebook.com/docs/instagram-platform/webhooks
 */
export class InstagramWebhookHandler {
  private readonly appSecret: string;
  private readonly verifyToken: string | undefined;
  private readonly requireSignature: boolean;

  private readonly changeListeners = new Map<string, Set<WebhookChangeListener>>();
  private readonly anyChangeListeners = new Set<WebhookChangeListener>();
  private readonly messagingListeners = new Set<WebhookMessagingListener>();
  private readonly messagingTypeListeners = new Map<
    InstagramMessagingEventType,
    Set<WebhookMessagingListener>
  >();
  private readonly errorListeners = new Set<WebhookErrorListener>();

  /**
   * @param config - Handler configuration.
   */
  constructor(config: InstagramWebhookHandlerConfig) {
    if (!config.appSecret?.trim()) {
      throw new ValidationError('appSecret is required to construct an InstagramWebhookHandler.');
    }

    this.appSecret = config.appSecret;
    this.verifyToken = config.verifyToken;
    this.requireSignature = config.requireSignature ?? true;
  }

  /**
   * Registers a listener for a specific field-change webhook (e.g. `comments`,
   * `mentions`, `live_comments`).
   *
   * @returns This handler for chaining.
   */
  on(field: WebhookField | string, listener: WebhookChangeListener): this {
    const existing = this.changeListeners.get(field) ?? new Set<WebhookChangeListener>();
    existing.add(listener);
    this.changeListeners.set(field, existing);
    return this;
  }

  /**
   * Registers a listener invoked for every field-change webhook regardless of field.
   *
   * @returns This handler for chaining.
   */
  onChange(listener: WebhookChangeListener): this {
    this.anyChangeListeners.add(listener);
    return this;
  }

  /** Convenience listener for the `comments` field. */
  onComment(listener: WebhookChangeListener): this {
    return this.on('comments', listener);
  }

  /** Convenience listener for the `live_comments` field. */
  onLiveComment(listener: WebhookChangeListener): this {
    return this.on('live_comments', listener);
  }

  /** Convenience listener for the `mentions` field. */
  onMention(listener: WebhookChangeListener): this {
    return this.on('mentions', listener);
  }

  /**
   * Registers a listener invoked for every messaging webhook event.
   *
   * @returns This handler for chaining.
   */
  onMessaging(listener: WebhookMessagingListener): this {
    this.messagingListeners.add(listener);
    return this;
  }

  /** Convenience listener for inbound messages (non-echo). */
  onMessage(listener: WebhookMessagingListener): this {
    return this.onMessagingType('message', listener);
  }

  /** Convenience listener for message echoes (messages your account sent). */
  onMessageEcho(listener: WebhookMessagingListener): this {
    return this.onMessagingType('message_echo', listener);
  }

  /** Convenience listener for message reactions. */
  onReaction(listener: WebhookMessagingListener): this {
    return this.onMessagingType('reaction', listener);
  }

  /** Convenience listener for postbacks (e.g. ice breakers, quick replies). */
  onPostback(listener: WebhookMessagingListener): this {
    return this.onMessagingType('postback', listener);
  }

  /** Convenience listener for read receipts. */
  onRead(listener: WebhookMessagingListener): this {
    return this.onMessagingType('read', listener);
  }

  /**
   * Registers a listener for a specific resolved messaging event subtype.
   *
   * @returns This handler for chaining.
   */
  onMessagingType(
    type: InstagramMessagingEventType,
    listener: WebhookMessagingListener,
  ): this {
    const existing =
      this.messagingTypeListeners.get(type) ?? new Set<WebhookMessagingListener>();
    existing.add(listener);
    this.messagingTypeListeners.set(type, existing);
    return this;
  }

  /**
   * Registers a listener invoked when a dispatched listener throws. When no
   * error listener is registered, dispatch errors propagate from
   * {@link handleEvent}.
   *
   * @returns This handler for chaining.
   */
  onError(listener: WebhookErrorListener): this {
    this.errorListeners.add(listener);
    return this;
  }

  /**
   * Validates a Meta webhook GET verification challenge and returns the value
   * to echo back.
   *
   * @param query - Verification query parameters from Meta.
   * @param verifyToken - Optional override for the configured verify token.
   * @returns The `hub.challenge` value to return with a 200 response.
   */
  handleVerification(query: WebhookChallengeQuery, verifyToken?: string): string {
    const token = verifyToken ?? this.verifyToken;
    if (!token) {
      throw new ValidationError(
        'A verify token is required. Provide one in the handler config or to handleVerification().',
      );
    }

    return verifyWebhookChallenge(query, token);
  }

  /**
   * Verifies, parses, and dispatches an Instagram webhook POST payload.
   *
   * @param rawBody - The raw request body bytes (before JSON parsing).
   * @param options - Signature header and verification options.
   * @returns Dispatch summary including the parsed payload.
   */
  async handleEvent(
    rawBody: string | Buffer,
    options: HandleEventOptions = {},
  ): Promise<HandleEventResult> {
    const requireSignature = options.requireSignature ?? this.requireSignature;
    if (requireSignature) {
      if (!verifyWebhookSignature(rawBody, options.signatureHeader, this.appSecret)) {
        throw new ValidationError('Invalid webhook signature.');
      }
    }

    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const payload = parseWebhookPayload(body);

    let changeCount = 0;
    let messagingCount = 0;

    for (const entry of payload.entry ?? []) {
      changeCount += await this.dispatchChanges(entry, payload);
      messagingCount += await this.dispatchMessaging(entry, payload);
    }

    return { payload, changeCount, messagingCount };
  }

  private async dispatchChanges(
    entry: InstagramWebhookEntry,
    payload: InstagramWebhookPayload,
  ): Promise<number> {
    let count = 0;
    for (const change of entry.changes ?? []) {
      if (!change.field) {
        continue;
      }

      const event = {
        field: change.field,
        value: change.value ?? {},
        entryId: entry.id,
        time: entry.time,
        entry,
        payload,
      };

      const listeners = [
        ...(this.changeListeners.get(change.field) ?? []),
        ...this.anyChangeListeners,
      ];

      for (const listener of listeners) {
        await this.invoke(() => listener(event), payload);
      }
      count += 1;
    }
    return count;
  }

  private async dispatchMessaging(
    entry: InstagramWebhookEntry,
    payload: InstagramWebhookPayload,
  ): Promise<number> {
    let count = 0;
    for (const messaging of entry.messaging ?? []) {
      const type = resolveMessagingEventType(messaging);
      const event = {
        type,
        messaging,
        entryId: entry.id,
        entry,
        payload,
      };

      const listeners = [
        ...this.messagingListeners,
        ...(this.messagingTypeListeners.get(type) ?? []),
      ];

      for (const listener of listeners) {
        await this.invoke(() => listener(event), payload);
      }
      count += 1;
    }
    return count;
  }

  private async invoke(
    run: () => void | Promise<void>,
    payload: InstagramWebhookPayload,
  ): Promise<void> {
    try {
      await run();
    } catch (error) {
      if (this.errorListeners.size === 0) {
        throw error;
      }
      for (const listener of this.errorListeners) {
        await listener(error, { payload });
      }
    }
  }
}
