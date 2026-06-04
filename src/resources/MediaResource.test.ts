import { describe, expect, it } from 'vitest';
import { HttpClient } from '../http/HttpClient.js';
import { MediaResource } from '../resources/MediaResource.js';
import { WebhooksResource } from '../resources/WebhooksResource.js';
import {
  containerFinished,
  containerInProgress,
  mediaContainerCreated,
  mediaPublished,
  publishingQuota,
} from '../test/fixtures/graphApi.js';
import { createMockAxios } from '../test/mockAxios.js';

const ACCOUNT_ID = '17841405309211844';

function createMediaResource(mock = createMockAxios()) {
  const http = new HttpClient({
    accessToken: 'page-token',
    apiVersion: 'v21.0',
    axios: mock.axios,
    retry: { maxRetries: 0, baseDelayMs: 0, retryableStatusCodes: [] },
  });

  return { media: new MediaResource(http, ACCOUNT_ID), mock };
}

describe('MediaResource', () => {
  it('creates an image container and publishes it', async () => {
    const { media, mock } = createMediaResource();

    mock.setResponseFor('/media', { status: 200, data: mediaContainerCreated });
    mock.setResponseFor('/media_publish', { status: 200, data: mediaPublished });

    const container = await media.createImageContainer({
      imageUrl: 'https://cdn.example/image.jpg',
      caption: 'Hello',
    });
    const published = await media.publish(container.id);

    expect(container.id).toBe('17889455560051444');
    expect(published.id).toBe('17920238422030506');
  });

  it('polls container status until finished', async () => {
    const { media, mock } = createMediaResource();
    let calls = 0;

    mock.setResponseFor(/\/17889455560051444/, {
      status: 200,
      get data() {
        calls += 1;
        return calls < 2 ? containerInProgress : containerFinished;
      },
    });

    const status = await media.waitForContainerReady('17889455560051444', {
      intervalMs: 0,
      maxAttempts: 3,
    });

    expect(status.status_code).toBe('FINISHED');
    expect(calls).toBe(2);
  });

  it('checks publishing quota before publishWhenReady', async () => {
    const { media, mock } = createMediaResource();

    mock.setResponseFor('content_publishing_limit', { status: 200, data: publishingQuota });
    mock.setResponseFor(/\/17889455560051444/, { status: 200, data: containerFinished });
    mock.setResponseFor('/media_publish', { status: 200, data: mediaPublished });

    const published = await media.publishWhenReady('17889455560051444', {
      enforceQuota: true,
      intervalMs: 0,
    });

    expect(published.id).toBe('17920238422030506');
  });

  it('lists comment replies and toggles comments on media', async () => {
    const { media, mock } = createMediaResource();

    mock.setResponseFor('/comment-1/replies', {
      status: 200,
      data: { data: [{ id: 'reply-1', text: 'hi' }] },
    });
    mock.setResponseFor(/\/media-1$/, { status: 200, data: { success: true } });

    const replies = await media.listCommentReplies('comment-1');
    expect(replies.data[0]?.id).toBe('reply-1');

    await media.setCommentsEnabled('media-1', false);
    const disableCall = mock.mockRequest.mock.calls.at(-1)?.[0];
    expect(disableCall?.url).toContain('comment_enabled=false');
    expect(disableCall?.method).toBe('POST');
  });

  it('rejects publishWhenReady when quota is exhausted', async () => {
    const { media, mock } = createMediaResource();

    mock.setResponseFor('content_publishing_limit', {
      status: 200,
      data: {
        data: [
          {
            quota_usage: 50,
            config: { quota_total: 50, quota_duration: 86400 },
          },
        ],
      },
    });

    await expect(
      media.publishWhenReady('17889455560051444', {
        enforceQuota: true,
        intervalMs: 0,
      }),
    ).rejects.toThrow('Publishing quota exhausted');
  });
});

describe('WebhooksResource', () => {
  it('subscribes to webhook fields', async () => {
    const mock = createMockAxios();
    const http = new HttpClient({
      accessToken: 'page-token',
      apiVersion: 'v21.0',
      axios: mock.axios,
    });
    const webhooks = new WebhooksResource(http, ACCOUNT_ID);

    mock.setResponseFor('subscribed_apps', { status: 200, data: { success: true } });

    const response = await webhooks.subscribe({ fields: ['comments', 'messages'] });

    expect(response.success).toBe(true);
    expect(mock.mockRequest).toHaveBeenCalled();
  });
});
