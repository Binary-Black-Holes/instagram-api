import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { webhookCommentEvent } from '../test/fixtures/graphApi.js';
import { InstagramWebhookHandler } from './handler.js';

const APP_SECRET = 'test-app-secret';

function signed(body: string): string {
  const digest = createHmac('sha256', APP_SECRET).update(body).digest('hex');
  return `sha256=${digest}`;
}

const messagingEvent = {
  object: 'instagram',
  entry: [
    {
      id: '17841405309211844',
      time: 1_704_067_200,
      messaging: [
        {
          sender: { id: 'SENDER_ID' },
          recipient: { id: 'IG_ID' },
          timestamp: 1_704_067_200,
          message: { mid: 'mid.123', text: 'hello' },
        },
      ],
    },
  ],
};

describe('InstagramWebhookHandler', () => {
  it('requires an app secret', () => {
    expect(() => new InstagramWebhookHandler({ appSecret: '' })).toThrow('appSecret is required');
  });

  it('verifies the GET challenge with the configured verify token', () => {
    const handler = new InstagramWebhookHandler({
      appSecret: APP_SECRET,
      verifyToken: 'verify-me',
    });

    const challenge = handler.handleVerification({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'verify-me',
      'hub.challenge': 'echo-this',
    });

    expect(challenge).toBe('echo-this');
  });

  it('rejects an invalid signature', async () => {
    const handler = new InstagramWebhookHandler({ appSecret: APP_SECRET });
    const body = JSON.stringify(webhookCommentEvent);

    await expect(
      handler.handleEvent(body, { signatureHeader: 'sha256=bad' }),
    ).rejects.toThrow('Invalid webhook signature');
  });

  it('dispatches field-change events to field and wildcard listeners', async () => {
    const handler = new InstagramWebhookHandler({ appSecret: APP_SECRET });
    const onComment = vi.fn();
    const onAnyChange = vi.fn();
    handler.onComment(onComment).onChange(onAnyChange);

    const body = JSON.stringify(webhookCommentEvent);
    const result = await handler.handleEvent(body, { signatureHeader: signed(body) });

    expect(result.changeCount).toBe(1);
    expect(onComment).toHaveBeenCalledTimes(1);
    expect(onAnyChange).toHaveBeenCalledTimes(1);
    const event = onComment.mock.calls[0]?.[0];
    expect(event.field).toBe('comments');
    expect(event.entryId).toBe('17841405309211844');
    expect(event.value.text).toBe('Nice post!');
  });

  it('dispatches messaging events with resolved subtype', async () => {
    const handler = new InstagramWebhookHandler({ appSecret: APP_SECRET });
    const onMessage = vi.fn();
    const onMessaging = vi.fn();
    handler.onMessage(onMessage).onMessaging(onMessaging);

    const body = JSON.stringify(messagingEvent);
    const result = await handler.handleEvent(body, { signatureHeader: signed(body) });

    expect(result.messagingCount).toBe(1);
    expect(onMessaging).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage.mock.calls[0]?.[0].type).toBe('message');
    expect(onMessage.mock.calls[0]?.[0].messaging.message.text).toBe('hello');
  });

  it('skips signature verification when requireSignature is false', async () => {
    const handler = new InstagramWebhookHandler({
      appSecret: APP_SECRET,
      requireSignature: false,
    });
    const onComment = vi.fn();
    handler.onComment(onComment);

    await handler.handleEvent(JSON.stringify(webhookCommentEvent));

    expect(onComment).toHaveBeenCalledTimes(1);
  });

  it('routes listener errors to onError listeners', async () => {
    const handler = new InstagramWebhookHandler({
      appSecret: APP_SECRET,
      requireSignature: false,
    });
    const onError = vi.fn();
    handler
      .onComment(() => {
        throw new Error('boom');
      })
      .onError(onError);

    await handler.handleEvent(JSON.stringify(webhookCommentEvent));

    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0]?.[0] as Error).message).toBe('boom');
  });

  it('propagates listener errors when no onError listener is registered', async () => {
    const handler = new InstagramWebhookHandler({
      appSecret: APP_SECRET,
      requireSignature: false,
    });
    handler.onComment(() => {
      throw new Error('boom');
    });

    await expect(handler.handleEvent(JSON.stringify(webhookCommentEvent))).rejects.toThrow('boom');
  });
});
