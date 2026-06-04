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

  it('builds an Instagram Login authorization URL', () => {
    const oauth = new OAuthProvider({
      loginType: 'instagram',
      clientId: 'app-id',
      clientSecret: 'app-secret',
      redirectUri: 'https://example.com/callback',
    });

    const url = oauth.getAuthorizationUrl({ state: 'csrf-token' });

    expect(url).toContain('https://www.instagram.com/oauth/authorize');
    expect(url).toContain('client_id=app-id');
    expect(url).toContain('instagram_business_basic');
    expect(url).toContain('state=csrf-token');
    expect(url).not.toContain('api.instagram.com/oauth/authorize');
  });

  it('adds force_reauth and enable_fb_login to Instagram Login authorization URLs', () => {
    const oauth = new OAuthProvider({
      loginType: 'instagram',
      clientId: 'app-id',
      clientSecret: 'app-secret',
      redirectUri: 'https://example.com/callback',
    });

    const url = oauth.getAuthorizationUrl({
      forceReauth: true,
      enableFacebookLogin: false,
    });

    expect(url).toContain('force_reauth=true');
    expect(url).toContain('enable_fb_login=false');
    expect(url).not.toContain('auth_type=rerequest');
  });

  it('exchanges Instagram Login authorization codes through api.instagram.com', async () => {
    const mock = createMockAxios();
    const oauth = new OAuthProvider({
      loginType: 'instagram',
      clientId: 'app-id',
      clientSecret: 'app-secret',
      redirectUri: 'https://example.com/callback',
      axios: mock.axios,
    });

    mock.setResponseFor('api.instagram.com/oauth/access_token', {
      status: 200,
      data: {
        data: [
          {
            access_token: 'ig-short-lived-token',
            user_id: '17841405309211844',
            permissions: 'instagram_business_basic',
          },
        ],
      },
    });

    const token = await oauth.exchangeCodeForToken('auth-code');
    const request = mock.mockRequest.mock.calls[0]?.[0];

    expect(token.access_token).toBe('ig-short-lived-token');
    expect(token.user_id).toBe('17841405309211844');
    expect(request?.url).toBe('https://api.instagram.com/oauth/access_token');
  });

  it('exchanges and refreshes Instagram Login long-lived tokens through graph.instagram.com', async () => {
    const mock = createMockAxios();
    const oauth = new OAuthProvider({
      loginType: 'instagram',
      clientId: 'app-id',
      clientSecret: 'app-secret',
      redirectUri: 'https://example.com/callback',
      axios: mock.axios,
    });

    mock.setResponseFor('graph.instagram.com/access_token', {
      status: 200,
      data: { access_token: 'ig-long-lived-token', token_type: 'bearer', expires_in: 5_184_000 },
    });
    mock.setResponseFor('graph.instagram.com/refresh_access_token', {
      status: 200,
      data: { access_token: 'ig-refreshed-token', token_type: 'bearer', expires_in: 5_183_944 },
    });

    const exchanged = await oauth.exchangeForLongLivedToken('ig-short-lived-token');
    const refreshed = await oauth.refreshLongLivedToken('ig-long-lived-token');

    expect(exchanged.access_token).toBe('ig-long-lived-token');
    expect(refreshed.access_token).toBe('ig-refreshed-token');
    expect(mock.mockRequest.mock.calls[0]?.[0].url).toContain('grant_type=ig_exchange_token');
    expect(mock.mockRequest.mock.calls[1]?.[0].url).toContain('grant_type=ig_refresh_token');
  });

  it('rejects Facebook Page discovery in Instagram Login mode', async () => {
    const oauth = new OAuthProvider({
      loginType: 'instagram',
      clientId: 'app-id',
      clientSecret: 'app-secret',
      redirectUri: 'https://example.com/callback',
    });

    await expect(oauth.listConnectedAccounts('ig-token')).rejects.toThrow(
      'only available with Facebook Login',
    );
  });
});
