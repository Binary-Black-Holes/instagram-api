import { describe, expect, it } from 'vitest';
import { InstagramClient } from '../client/InstagramClient.js';
import { createMockAxios } from '../test/mockAxios.js';

describe('InstagramClient login modes', () => {
  it('keeps requiring an Instagram account ID for Facebook Login', () => {
    expect(
      () =>
        new InstagramClient({
          accessToken: 'page-token',
        }),
    ).toThrow('instagramAccountId is required');
  });

  it('uses /me as the default account context for Instagram Login', async () => {
    const mock = createMockAxios({
      status: 200,
      data: { id: '17841405309211844', username: 'example' },
    });
    const client = new InstagramClient({
      loginType: 'instagram',
      accessToken: 'ig-token',
      apiVersion: 'v25.0',
      axios: mock.axios,
      retry: { maxRetries: 0, baseDelayMs: 0, retryableStatusCodes: [] },
    });

    const profile = await client.users.getProfile({ fields: ['id', 'username'] });
    const request = mock.mockRequest.mock.calls[0]?.[0];

    expect(profile.username).toBe('example');
    expect(client.getInstagramAccountId()).toBe('me');
    expect(request?.url).toContain('https://graph.instagram.com/v25.0/me');
  });

  it('rejects Facebook Login-only resources in Instagram Login mode', async () => {
    const client = new InstagramClient({
      loginType: 'instagram',
      accessToken: 'ig-token',
    });

    await expect(client.hashtags.search('coke')).rejects.toThrow('only available');
    await expect(client.commerce.listAvailableCatalogs()).rejects.toThrow('only available');
    await expect(client.users.discoverBusiness({ username: 'example' })).rejects.toThrow(
      'only available',
    );
  });
});
