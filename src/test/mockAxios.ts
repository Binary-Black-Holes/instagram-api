import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { vi } from 'vitest';

export type MockAxiosResponse = {
  status: number;
  data: unknown;
  headers?: Record<string, string>;
};

type Route = {
  matcher: string | RegExp | ((url: string, config?: InternalAxiosRequestConfig) => boolean);
  response: MockAxiosResponse;
};

/**
 * Creates a mock Axios instance for integration-style unit tests.
 */
export function createMockAxios(defaultResponse: MockAxiosResponse = { status: 200, data: {} }): {
  axios: AxiosInstance;
  mockRequest: ReturnType<typeof vi.fn>;
  setResponse: (response: MockAxiosResponse) => void;
  setResponseFor: (
    matcher: string | RegExp | ((url: string, config?: InternalAxiosRequestConfig) => boolean),
    response: MockAxiosResponse,
  ) => void;
} {
  const axiosInstance = axios.create();
  const routes: Route[] = [];
  let fallbackResponse = defaultResponse;

  const matchesRoute = (route: Route, url: string, config?: InternalAxiosRequestConfig): boolean => {
    if (typeof route.matcher === 'string') {
      return url.includes(route.matcher);
    }

    if (route.matcher instanceof RegExp) {
      return route.matcher.test(url);
    }

    return route.matcher(url, config);
  };

  const resolveResponse = (url: string, config?: InternalAxiosRequestConfig): MockAxiosResponse => {
    for (const route of routes) {
      if (matchesRoute(route, url, config)) {
        return route.response;
      }
    }

    return fallbackResponse;
  };

  const mockRequest = vi.fn(async (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? '';
    const response = resolveResponse(url, config);

    return {
      status: response.status,
      data: response.data,
      headers: response.headers ?? {},
      config,
      statusText: String(response.status),
    };
  });

  axiosInstance.request = mockRequest as typeof axiosInstance.request;
  axiosInstance.get = ((url: string, config?: InternalAxiosRequestConfig) =>
    mockRequest({ method: 'GET', url, ...config } as InternalAxiosRequestConfig)) as typeof axiosInstance.get;
  axiosInstance.post = ((url: string, data?: unknown, config?: InternalAxiosRequestConfig) =>
    mockRequest({ method: 'POST', url, data, ...config } as InternalAxiosRequestConfig)) as typeof axiosInstance.post;
  axiosInstance.delete = ((url: string, config?: InternalAxiosRequestConfig) =>
    mockRequest({ method: 'DELETE', url, ...config } as InternalAxiosRequestConfig)) as typeof axiosInstance.delete;

  return {
    axios: axiosInstance,
    mockRequest,
    setResponse(response: MockAxiosResponse) {
      fallbackResponse = response;
    },
    setResponseFor(matcher, response) {
      routes.unshift({ matcher, response });
    },
  };
}
