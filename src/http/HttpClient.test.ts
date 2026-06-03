import { describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../http/HttpClient.js';
import { createMockAxios } from '../test/mockAxios.js';

describe('HttpClient hooks', () => {
  it('emits request and response lifecycle hooks', async () => {
    const mock = createMockAxios({ status: 200, data: { id: '123' } });
    const onRequest = vi.fn();
    const onResponse = vi.fn();

    const http = new HttpClient({
      accessToken: 'token',
      apiVersion: 'v21.0',
      axios: mock.axios,
      hooks: { onRequest, onResponse },
    });

    const response = await http.request<{ id: string }>({ path: '/17841405309211844' });

    expect(response.data.id).toBe('123');
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/17841405309211844',
      }),
    );
    expect(onResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/17841405309211844',
        status: 200,
      }),
    );
  });

  it('builds Instagram Login Graph API URLs on graph.instagram.com', async () => {
    const mock = createMockAxios({ status: 200, data: { id: '17841405309211844' } });
    const http = new HttpClient({
      loginType: 'instagram',
      accessToken: 'ig-token',
      apiVersion: 'v25.0',
      axios: mock.axios,
      retry: { maxRetries: 0, baseDelayMs: 0, retryableStatusCodes: [] },
    });

    await http.request<{ id: string }>({ path: '/me', params: { fields: 'id,username' } });
    const request = mock.mockRequest.mock.calls[0]?.[0];

    expect(request?.url).toContain('https://graph.instagram.com/v25.0/me');
    expect(request?.url).toContain('fields=id%2Cusername');
    expect(request?.url).toContain('access_token=ig-token');
  });
});
