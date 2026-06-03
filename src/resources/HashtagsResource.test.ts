import { describe, expect, it } from 'vitest';
import { HttpClient } from '../http/HttpClient.js';
import { HashtagsResource } from '../resources/HashtagsResource.js';
import { hashtagRecentMedia, hashtagSearch } from '../test/fixtures/graphApi.js';
import { createMockAxios } from '../test/mockAxios.js';

const ACCOUNT_ID = '17841405309211844';

function createHashtagsResource(mock = createMockAxios()) {
  const http = new HttpClient({
    accessToken: 'page-token',
    apiVersion: 'v21.0',
    axios: mock.axios,
    retry: { maxRetries: 0, baseDelayMs: 0, retryableStatusCodes: [] },
  });

  return { hashtags: new HashtagsResource(http, ACCOUNT_ID), mock };
}

describe('HashtagsResource', () => {
  it('searches hashtags using the configured Instagram user ID', async () => {
    const { hashtags, mock } = createHashtagsResource();

    mock.setResponseFor('ig_hashtag_search', { status: 200, data: hashtagSearch });

    const response = await hashtags.search('#coke');
    const request = mock.mockRequest.mock.calls[0]?.[0];

    expect(response.data[0]?.id).toBe('17841593698074073');
    expect(request?.url).toContain('/ig_hashtag_search');
    expect(request?.url).toContain(`user_id=${ACCOUNT_ID}`);
    expect(request?.url).toContain('q=coke');
  });

  it('reads hashtag nodes by ID', async () => {
    const { hashtags, mock } = createHashtagsResource();

    mock.setResponseFor('/17841593698074073', {
      status: 200,
      data: { id: '17841593698074073', name: 'coke' },
    });

    const hashtag = await hashtags.getById('17841593698074073');
    const request = mock.mockRequest.mock.calls[0]?.[0];

    expect(hashtag.name).toBe('coke');
    expect(request?.url).toContain('fields=id%2Cname');
  });

  it('lists recent hashtag media with required user_id and fields', async () => {
    const { hashtags, mock } = createHashtagsResource();

    mock.setResponseFor('/recent_media', { status: 200, data: hashtagRecentMedia });

    const response = await hashtags.listRecentMedia('17841593698074073', {
      fields: ['id', 'media_type', 'comments_count', 'like_count'],
      limit: 10,
    });
    const request = mock.mockRequest.mock.calls[0]?.[0];

    expect(response.data[0]?.id).toBe('17880997618081620');
    expect(request?.url).toContain('/17841593698074073/recent_media');
    expect(request?.url).toContain(`user_id=${ACCOUNT_ID}`);
    expect(request?.url).toContain('limit=10');
    expect(request?.url).toContain('fields=id%2Cmedia_type%2Ccomments_count%2Clike_count');
  });

  it('uses updated account IDs for hashtag media requests', async () => {
    const { hashtags, mock } = createHashtagsResource();

    mock.setResponseFor('/top_media', { status: 200, data: hashtagRecentMedia });
    hashtags.setAccountId('17841400000000000');

    await hashtags.listTopMedia('17841593698074073');
    const request = mock.mockRequest.mock.calls[0]?.[0];

    expect(request?.url).toContain('user_id=17841400000000000');
  });
});
