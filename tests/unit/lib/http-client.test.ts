import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
let httpClient: any; let cachedRequest: any; let clearCache: any;

// Mock axios using hoisted instance to avoid initialization order issues
const { mockAxiosInstance } = vi.hoisted(() => {
  const fn: any = vi.fn((config: any) => fn.request(config));
  fn.interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  };
  fn.request = vi.fn();
  return { mockAxiosInstance: fn };
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance)
  }
}));

const mockedAxios = vi.mocked(axios);

describe('HTTP Client', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.resetModules();
    const mod = await import('@/lib/http-client');
    httpClient = mod.httpClient;
    cachedRequest = mod.cachedRequest;
    clearCache = mod.clearCache;
    clearCache();
  });

  describe('Request Interceptor', () => {
    it('adds auth token to headers when available', () => {
      localStorage.setItem('auth', 'demo-token');
      
      const config = { headers: {} };
      // Get the interceptor function that was registered
      const interceptorCalls = mockAxiosInstance.interceptors.request.use.mock.calls;
      const requestInterceptor = interceptorCalls[0][0]; // First call, first argument (fulfilled function)
      
      const result = requestInterceptor(config);
      
      expect(result.headers.Authorization).toBe('Bearer demo-token');
    });

    it('does not add auth header when no token', () => {
      const config = { headers: {} };
      const interceptorCalls = mockAxiosInstance.interceptors.request.use.mock.calls;
      const requestInterceptor = interceptorCalls[0][0];
      
      const result = requestInterceptor(config);
      
      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor', () => {
    it('returns response on success', async () => {
      const response = { data: { test: 'data' }, status: 200 };
      const interceptorCalls = mockAxiosInstance.interceptors.response.use.mock.calls;
      const responseInterceptor = interceptorCalls[0][0]; // Success interceptor
      
      const result = responseInterceptor(response);
      
      expect(result).toBe(response);
    });

    it('does not retry on 4xx errors', async () => {
      const error = {
        response: { status: 404 },
        config: {}
      };
      
      const interceptorCalls = mockAxiosInstance.interceptors.response.use.mock.calls;
      const errorInterceptor = interceptorCalls[0][1]; // Error interceptor
      
      await expect(errorInterceptor(error)).rejects.toBe(error);
    });

    it('retries once on 5xx errors', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: 'success' });
      
      const error = {
        response: { status: 500 },
        config: { _retry: false }
      };
      
      const interceptorCalls = mockAxiosInstance.interceptors.response.use.mock.calls;
      const errorInterceptor = interceptorCalls[0][1];
      
      await errorInterceptor(error);
      
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({ _retry: true })
      );
    });

    it('does not retry twice', async () => {
      const error = {
        response: { status: 500 },
        config: { _retry: true }
      };
      
      const interceptorCalls = mockAxiosInstance.interceptors.response.use.mock.calls;
      const errorInterceptor = interceptorCalls[0][1];
      
      await expect(errorInterceptor(error)).rejects.toBe(error);
    });
  });

  describe('Cached Request', () => {
    it('returns cached data when available and fresh', async () => {
      const mockFn = vi.fn().mockResolvedValue('new-data');
      
      // Make first request
      const result1 = await cachedRequest('test-key', mockFn);
      expect(result1).toBe('new-data');
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      // Make second request - should use cache
      const result2 = await cachedRequest('test-key', mockFn);
      expect(result2).toBe('new-data');
      expect(mockFn).toHaveBeenCalledTimes(1); // Not called again
    });

    it('makes new request when cache is expired', async () => {
      const mockFn = vi.fn()
        .mockResolvedValueOnce('old-data')
        .mockResolvedValueOnce('new-data');
      
      // Make first request
      await cachedRequest('test-key', mockFn);
      
      // Mock time passing
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 6 * 60 * 1000); // 6 minutes later
      
      // Make second request - cache should be expired
      const result = await cachedRequest('test-key', mockFn);
      expect(result).toBe('new-data');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('clears cache when clearCache is called', async () => {
      const mockFn = vi.fn().mockResolvedValue('data');
      
      // Make first request
      await cachedRequest('test-key', mockFn);
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      // Clear cache
      clearCache();
      
      // Make second request - should not use cache
      await cachedRequest('test-key', mockFn);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });
});