import { describe, expect, it } from 'vitest';
import { HttpClient } from '../http/HttpClient.js';
import { WebhooksResource } from '../resources/WebhooksResource.js';
import { createMockAxios } from '../test/mockAxios.js';

const FACEBOOK_IG_ACCOUNT_ID = 'ig-999';
const INSTAGRAM_OAUTH_USER_ID = '12345';

function createWebhooksResource(options: {
  loginType?: 'facebook' | 'instagram';
  accountId: string;
  mock?: ReturnType<typeof createMockAxios>;
}) {
  const mock = options.mock ?? createMockAxios();
  const http = new HttpClient({
    accessToken: 'token',
    apiVersion: 'v21.0',
    ...(options.loginType ? { loginType: options.loginType } : {}),
    axios: mock.axios,
    retry: { maxRetries: 0, baseDelayMs: 0, retryableStatusCodes: [] },
  });

  return { webhooks: new WebhooksResource(http, options.accountId), mock };
}

function expectSubscribedAppsPath(url: string | undefined, expectedAccountSegment: string): void {
  expect(url).toContain(`/${expectedAccountSegment}/subscribed_apps`);
}

describe('WebhooksResource', () => {
  it.each([
    {
      loginType: 'instagram' as const,
      accountId: INSTAGRAM_OAUTH_USER_ID,
      expectedPath: 'me',
      graphHost: 'graph.instagram.com',
    },
    {
      loginType: 'instagram' as const,
      accountId: 'me',
      expectedPath: 'me',
      graphHost: 'graph.instagram.com',
    },
    {
      loginType: 'facebook' as const,
      accountId: FACEBOOK_IG_ACCOUNT_ID,
      expectedPath: FACEBOOK_IG_ACCOUNT_ID,
      graphHost: 'graph.facebook.com',
    },
  ])(
    'subscribe uses /$expectedPath/subscribed_apps for loginType=$loginType',
    async ({ loginType, accountId, expectedPath, graphHost }) => {
      const { webhooks, mock } = createWebhooksResource({ loginType, accountId });

      mock.setResponseFor('subscribed_apps', { status: 200, data: { success: true } });

      const response = await webhooks.subscribe({
        fields: ['messages', 'messaging_postbacks', 'message_echoes'],
      });
      const request = mock.mockRequest.mock.calls[0]?.[0];

      expect(response.success).toBe(true);
      expect(request?.url).toContain(graphHost);
      expectSubscribedAppsPath(request?.url, expectedPath);
      expect(request?.url).not.toContain(`/${INSTAGRAM_OAUTH_USER_ID}/subscribed_apps`);
    },
  );

  it.each([
    {
      loginType: 'instagram' as const,
      accountId: INSTAGRAM_OAUTH_USER_ID,
      expectedPath: 'me',
    },
    {
      loginType: 'instagram' as const,
      accountId: 'me',
      expectedPath: 'me',
    },
    {
      loginType: 'facebook' as const,
      accountId: FACEBOOK_IG_ACCOUNT_ID,
      expectedPath: FACEBOOK_IG_ACCOUNT_ID,
    },
  ])(
    'unsubscribe uses /$expectedPath/subscribed_apps for loginType=$loginType',
    async ({ loginType, accountId, expectedPath }) => {
      const { webhooks, mock } = createWebhooksResource({ loginType, accountId });

      mock.setResponseFor('subscribed_apps', { status: 200, data: { success: true } });

      await webhooks.unsubscribe();
      const request = mock.mockRequest.mock.calls[0]?.[0];

      expect(request?.method).toBe('DELETE');
      expectSubscribedAppsPath(request?.url, expectedPath);
    },
  );

  it.each([
    {
      loginType: 'instagram' as const,
      accountId: INSTAGRAM_OAUTH_USER_ID,
      expectedPath: 'me',
    },
    {
      loginType: 'instagram' as const,
      accountId: 'me',
      expectedPath: 'me',
    },
    {
      loginType: 'facebook' as const,
      accountId: FACEBOOK_IG_ACCOUNT_ID,
      expectedPath: FACEBOOK_IG_ACCOUNT_ID,
    },
  ])(
    'listSubscriptions uses /$expectedPath/subscribed_apps for loginType=$loginType',
    async ({ loginType, accountId, expectedPath }) => {
      const { webhooks, mock } = createWebhooksResource({ loginType, accountId });

      mock.setResponseFor('subscribed_apps', { status: 200, data: { data: [] } });

      await webhooks.listSubscriptions();
      const request = mock.mockRequest.mock.calls[0]?.[0];

      expect(request?.method).toBe('GET');
      expectSubscribedAppsPath(request?.url, expectedPath);
    },
  );

  it('rejects subscribe calls with no fields', async () => {
    const { webhooks } = createWebhooksResource({
      loginType: 'instagram',
      accountId: 'me',
    });

    await expect(webhooks.subscribe({ fields: [] })).rejects.toThrow(
      'At least one webhook field must be provided.',
    );
  });
});
