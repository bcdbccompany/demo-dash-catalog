import axios from 'axios';

// HTTP client with interceptors and retry logic
export const httpClient = axios.create({
  timeout: 15000, // Increased timeout for better test stability
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request interceptor
httpClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with retry logic
httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Don't retry on 4xx errors or if already retried
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return Promise.reject(error);
    }
    
    // Retry once on network errors or 5xx
    if (!originalRequest._retry && (error.code === 'NETWORK_ERROR' || error.response?.status >= 500)) {
      originalRequest._retry = true;
      return httpClient(originalRequest);
    }
    
    return Promise.reject(error);
  }
);

// Simple cache for API responses
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const cachedRequest = async <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
  const cached = cache.get(key);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await requestFn();
  cache.set(key, { data, timestamp: now });
  return data;
};

export const clearCache = () => cache.clear();