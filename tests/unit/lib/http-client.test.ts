import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { httpClient, cachedRequest, clearCache } from '@/lib/http-client';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn(), handlers: [{ fulfilled: vi.fn((config) => config) }] },
        response: { use: vi.fn(), handlers: [{ fulfilled: vi.fn((response) => response), rejected: vi.fn() }] }
      },
      request: vi.fn()
    }))
  }
}));

const mockedAxios = vi.mocked(axios);

describe('HTTP Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
    localStorage.clear();
  });

  describe('Request Interceptor', () => {
    it('adds auth token to headers when available', () => {
      localStorage.setItem('auth', 'demo-token');
      
      const config = { headers: {} };
      const interceptor = httpClient.interceptors.request.handlers[0];
      
      const result = (interceptor as any).fulfilled(config);
      
      expect(result.headers.Authorization).toBe('Bearer demo-token');
    });

    it('does not add auth header when no token', () => {
      const config = { headers: {} };
      const interceptor = httpClient.interceptors.request.handlers[0];
      
      const result = (interceptor as any).fulfilled(config);
      
      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor', () => {
    it('returns response on success', async () => {
      const response = { data: { test: 'data' }, status: 200 };
      const interceptor = httpClient.interceptors.response.handlers[0];
      
      const result = (interceptor as any).fulfilled(response);
      
      expect(result).toBe(response);
    });

    it('does not retry on 4xx errors', async () => {
      const error = {
        response: { status: 404 },
        config: {}
      };
      
      const interceptor = httpClient.interceptors.response.handlers[0];
      
      await expect((interceptor as any).rejected(error)).rejects.toBe(error);
    });

    it('retries once on 5xx errors', async () => {
      const mockRequest = vi.fn().mockResolvedValue({ data: 'success' });
      httpClient.request = mockRequest;
      
      const error = {
        response: { status: 500 },
        config: { _retry: false }
      };
      
      const interceptor = httpClient.interceptors.response.handlers[0];
      
      await (interceptor as any).rejected(error);
      
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ _retry: true })
      );
    });

    it('does not retry twice', async () => {
      const error = {
        response: { status: 500 },
        config: { _retry: true }
      };
      
      const interceptor = httpClient.interceptors.response.handlers[0];
      
      await expect((interceptor as any).rejected(error)).rejects.toBe(error);
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