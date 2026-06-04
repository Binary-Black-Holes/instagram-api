import { describe, expect, it } from 'vitest';
import { InstagramClient } from '../client/InstagramClient.js';
import { createMockAxios } from '../test/mockAxios.js';
import type { WebhookChangeEvent, WebhookMessagingEvent } from '../types/webhooks.js';

const ACCOUNT_ID = '17841405309211844';

function createClient(mock = createMockAxios()) {
  const client = new InstagramClient({
    accessToken: 'page-token',
    instagramAccountId: ACCOUNT_ID,
    axios: mock.axios,
    retry: { maxRetries: 0, baseDelayMs: 0, retryableStatusCodes: [] },
  });
  return { client, mock };
}

function lastRequest(mock: ReturnType<typeof createMockAxios>) {
  const calls = mock.mockRequest.mock.calls;
  return calls[calls.length - 1]?.[0];
}

describe('InstagramUseCases wiring', () => {
  it('is exposed on the client and shares resource instances', () => {
    const { client } = createClient();
    expect(client.useCases.commentModeration).toBeDefined();
    expect(client.useCases.privateReplies).toBeDefined();
    expect(client.useCases.selfMessaging).toBeDefined();
  });
});

describe('CommentModerationUseCase', () => {
  it('replies, hides, deletes, and toggles comments via Graph endpoints', async () => {
    const { client, mock } = createClient();
    mock.setResponseFor('/replies', { status: 200, data: { id: 'reply-1' } });
    mock.setResponseFor(/\/comment-1$/, { status: 200, data: { success: true } });
    mock.setResponseFor(/\/media-1$/, { status: 200, data: { success: true } });

    const reply = await client.useCases.commentModeration.reply('comment-1', 'Thanks!');
    expect(reply.id).toBe('reply-1');

    await client.useCases.commentModeration.hide('comment-1');
    expect(lastRequest(mock)?.url).toContain('hide=true');

    await client.useCases.commentModeration.unhide('comment-1');
    expect(lastRequest(mock)?.url).toContain('hide=false');

    await client.useCases.commentModeration.disableComments('media-1');
    expect(lastRequest(mock)?.url).toContain('comment_enabled=false');

    await client.useCases.commentModeration.enableComments('media-1');
    expect(lastRequest(mock)?.url).toContain('comment_enabled=true');

    await client.useCases.commentModeration.delete('comment-1');
    expect(lastRequest(mock)?.method).toBe('DELETE');
  });

  it('lists replies on a comment', async () => {
    const { client, mock } = createClient();
    mock.setResponseFor('/comment-1/replies', {
      status: 200,
      data: { data: [{ id: 'reply-1', text: 'hi' }] },
    });

    const replies = await client.useCases.commentModeration.getReplies('comment-1');
    expect(replies.data[0]?.id).toBe('reply-1');
  });

  it('normalizes Facebook Login comment webhook payloads', () => {
    const { client } = createClient();
    const event: WebhookChangeEvent = {
      field: 'comments',
      value: {
        from: { id: 'user-1', username: 'alice' },
        comment_id: 'c-99',
        parent_id: 'p-1',
        text: 'great',
        media: { id: 'm-1', media_product_type: 'FEED' },
      },
      entry: {},
      payload: {},
    };

    const comment = client.useCases.commentModeration.fromWebhookEvent(event);
    expect(comment.commentId).toBe('c-99');
    expect(comment.parentId).toBe('p-1');
    expect(comment.fromUsername).toBe('alice');
    expect(comment.mediaId).toBe('m-1');
    expect(comment.isSelf).toBe(false);
  });

  it('normalizes Instagram Login comment webhook payloads and detects self comments', () => {
    const { client } = createClient();
    const event: WebhookChangeEvent = {
      field: 'comments',
      value: {
        id: 'c-flat',
        from: { id: 'user-1', username: 'alice', self_ig_scoped_id: 'self-1' },
        text: 'self comment',
        media: { id: 'm-2' },
      },
      entry: {},
      payload: {},
    };

    const comment = client.useCases.commentModeration.fromWebhookEvent(event);
    expect(comment.commentId).toBe('c-flat');
    expect(comment.isSelf).toBe(true);
  });

  it('rejects non-comment webhook events', () => {
    const { client } = createClient();
    expect(() =>
      client.useCases.commentModeration.fromWebhookEvent({
        field: 'mentions',
        value: {},
        entry: {},
        payload: {},
      }),
    ).toThrow("Expected a 'comments'");
  });
});

describe('PrivateRepliesUseCase', () => {
  it('sends a private reply by comment ID', async () => {
    const { client, mock } = createClient();
    mock.setResponseFor('/messages', {
      status: 200,
      data: { recipient_id: '526', message_id: 'm_1' },
    });

    const result = await client.useCases.privateReplies.sendToComment('c-1', 'hi there');
    expect(result.message_id).toBe('m_1');
    const req = lastRequest(mock);
    expect(req?.url).toContain(`/${ACCOUNT_ID}/messages`);
    expect(req?.data.recipient.comment_id).toBe('c-1');
  });

  it('replies from a webhook event', async () => {
    const { client, mock } = createClient();
    mock.setResponseFor('/messages', { status: 200, data: { message_id: 'm_2' } });

    const event: WebhookChangeEvent = {
      field: 'comments',
      value: { comment_id: 'c-7' },
      entry: {},
      payload: {},
    };

    await client.useCases.privateReplies.replyToCommentEvent(event, 'thanks for commenting');
    expect(lastRequest(mock)?.data.recipient.comment_id).toBe('c-7');
  });

  it('throws when no comment ID is present', async () => {
    const { client } = createClient();
    await expect(
      client.useCases.privateReplies.replyToCommentEvent(
        { field: 'comments', value: {}, entry: {}, payload: {} },
        'x',
      ),
    ).rejects.toThrow('Could not resolve a comment ID');
  });
});

describe('SelfMessagingUseCase', () => {
  it('sends a message to self', async () => {
    const { client, mock } = createClient();
    mock.setResponseFor('/messages', { status: 200, data: { message_id: 'm_3' } });

    await client.useCases.selfMessaging.sendToSelf('scoped-1', 'hello self');
    const req = lastRequest(mock);
    expect(req?.data.recipient.id).toBe('scoped-1');
    expect(req?.data.message.text).toBe('hello self');
  });

  it('detects self and echo events', () => {
    const { client } = createClient();
    const echoEvent: WebhookMessagingEvent = {
      type: 'message_echo',
      messaging: {
        sender: { id: 'ig-user' },
        recipient: { id: 'scoped-1' },
        message: { mid: 'm', text: 'hi', is_echo: true, is_self: true },
      },
      entry: {},
      payload: {},
    };

    expect(client.useCases.selfMessaging.isSelfEvent(echoEvent)).toBe(true);
    expect(client.useCases.selfMessaging.isEcho(echoEvent)).toBe(true);
  });

  it('replies to a self event using the sender ID', async () => {
    const { client, mock } = createClient();
    mock.setResponseFor('/messages', { status: 200, data: { message_id: 'm_4' } });

    const event: WebhookMessagingEvent = {
      type: 'postback',
      messaging: {
        sender: { id: 'ig-user' },
        recipient: { id: 'scoped-1' },
        is_self: true,
        postback: { title: 'Start', payload: 'GO', mid: 'm' },
      },
      entry: {},
      payload: {},
    };

    await client.useCases.selfMessaging.replyToSelfEvent(event, 'ack');
    expect(lastRequest(mock)?.data.recipient.id).toBe('ig-user');
  });
});
