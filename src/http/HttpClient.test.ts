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
});
