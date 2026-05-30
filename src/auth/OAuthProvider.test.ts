import { describe, expect, it } from 'vitest';
import { OAuthProvider } from '../auth/OAuthProvider.js';
import { connectedAccounts } from '../test/fixtures/graphApi.js';
import { createMockAxios } from '../test/mockAxios.js';

describe('OAuthProvider', () => {
  it('builds an authorization URL with default scopes', () => {
    const oauth = new OAuthProvider({
      clientId: 'app-id',
      clientSecret: 'app-secret',
      redirectUri: 'https://example.com/callback',
    });

    const url = oauth.getAuthorizationUrl({ state: 'csrf-token' });

    expect(url).toContain('https://www.facebook.com/v21.0/dialog/oauth');
    expect(url).toContain('client_id=app-id');
    expect(url).toContain('instagram_basic');
  });

  it('lists connected accounts from /me/accounts', async () => {
    const mock = createMockAxios();
    const oauth = new OAuthProvider({
      clientId: 'app-id',
      clientSecret: 'app-secret',
      redirectUri: 'https://example.com/callback',
      axios: mock.axios,
    });

    mock.setResponseFor('me/accounts', { status: 200, data: connectedAccounts });

    const accounts = await oauth.listConnectedAccounts('USER_TOKEN');

    expect(accounts.data[0]?.instagram_business_account?.id).toBe('17841405309211844');
    expect(accounts.data[0]?.access_token).toBe('PAGE_TOKEN');
  });

  it('exchanges authorization codes via POST oauth/access_token', async () => {
    const mock = createMockAxios();
    const oauth = new OAuthProvider({
      clientId: 'app-id',
      clientSecret: 'app-secret',
      redirectUri: 'https://example.com/callback',
      axios: mock.axios,
    });

    mock.setResponseFor('oauth/access_token', {
      status: 200,
      data: { access_token: 'short-lived-token', token_type: 'bearer' },
    });

    const token = await oauth.exchangeCodeForToken('auth-code');

    expect(token.access_token).toBe('short-lived-token');
  });
});
