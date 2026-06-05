import { describe, expect, it, vi } from 'vitest';
import { HttpClient } from './HttpClient.js';
import {
  createAxiosTransport,
  type HttpTransport,
  type HttpTransportRequestConfig,
} from './HttpTransport.js';
import { createMockAxios } from '../test/mockAxios.js';

describe('HttpTransport', () => {
  it('supports a custom transport implementation', async () => {
    const transport: HttpTransport = {
      request: vi.fn(async (_config: HttpTransportRequestConfig) => ({
        status: 200,
        data: { id: 'custom-transport' },
        headers: {},
      })) as HttpTransport['request'],
    };
    const http = new HttpClient({
      accessToken: 'token',
      apiVersion: 'v21.0',
      httpTransport: transport,
      retry: { maxRetries: 0, baseDelayMs: 0, retryableStatusCodes: [] },
    });

    const response = await http.request<{ id: string }>({ path: '/17841405309211844' });

    expect(response.data.id).toBe('custom-transport');
    expect(transport.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: expect.stringContaining('/17841405309211844'),
      }),
    );
  });

  it('wraps Axios instances via createAxiosTransport', async () => {
    const mock = createMockAxios({ status: 200, data: { id: 'axios-transport' } });
    const http = new HttpClient({
      accessToken: 'token',
      apiVersion: 'v21.0',
      httpTransport: createAxiosTransport(mock.axios),
      retry: { maxRetries: 0, baseDelayMs: 0, retryableStatusCodes: [] },
    });

    const response = await http.request<{ id: string }>({ path: '/17841405309211844' });

    expect(response.data.id).toBe('axios-transport');
  });

  it('supports fetch-based transports', async () => {
    const fetchFn = vi.fn(async () =>
      Response.json(
        { id: 'fetch-transport' },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const http = new HttpClient({
      accessToken: 'token',
      apiVersion: 'v21.0',
      fetch: fetchFn,
      retry: { maxRetries: 0, baseDelayMs: 0, retryableStatusCodes: [] },
    });

    const response = await http.request<{ id: string }>({ path: '/17841405309211844' });

    expect(response.data.id).toBe('fetch-transport');
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining('/17841405309211844'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
        }),
      }),
    );
  });
});
