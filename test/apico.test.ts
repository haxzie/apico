import { describe, expect, it, beforeEach, afterEach, mock } from 'bun:test';
import apico from '../src';

describe('apico', () => {
  // Create a mock fetch for testing
  const originalFetch = globalThis.fetch;
  let mockFetch: any;
  
  beforeEach(() => {
    // Reset the mock before each test
    mockFetch = mock((url: string, options: RequestInit = {}) => {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true, url, method: options.method }),
        text: () => Promise.resolve('text response'),
        blob: () => Promise.resolve(new Blob(['test'])),
      });
    });
    
    // Replace global fetch with mock
    globalThis.fetch = mockFetch;
  });
  
  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
  });
  
  it('should make a GET request', async () => {
    const response = await apico.get('https://example.com/api/test');
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.method).toBe('GET');
    expect(response.data.url).toBe('https://example.com/api/test');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
  
  it('should make a POST request with data', async () => {
    const testData = { name: 'Test User', email: 'test@example.com' };
    const response = await apico.post('https://example.com/api/users', testData);
    
    expect(response.status).toBe(200);
    expect(response.data.method).toBe('POST');
    
    // Verify the request was made with the correct data
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://example.com/api/users');
    expect(callArgs[1].method).toBe('POST');
    expect(callArgs[1].body).toBe(JSON.stringify(testData));
    expect(callArgs[1].headers['Content-Type']).toBe('application/json');
  });
  
  it('should handle query parameters', async () => {
    await apico.get('https://example.com/api/search', {
      params: {
        q: 'test query',
        page: 1,
        limit: 10
      }
    });
    
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://example.com/api/search?q=test%20query&page=1&limit=10');
  });
  
  it('should create a client with baseURL', async () => {
    const client = apico.createClient({
      baseURL: 'https://api.example.com'
    });
    
    await client.get('/users');
    
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://api.example.com/users');
  });
  
  it('should use request interceptors', async () => {
    const client = apico.createClient();
    
    client.beforeRequest((config) => {
      config.headers = {
        ...config.headers,
        'Authorization': 'Bearer test-token'
      };
      return config;
    });
    
    await client.get('https://example.com/api/protected');
    
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers['Authorization']).toBe('Bearer test-token');
  });
  
  it('should use response interceptors', async () => {
    const client = apico.createClient();
    
    client.onResponse((response) => {
      // Add property to response data
      const modifiedData = {
        ...response.data,
        intercepted: true
      };
      
      // Create a new response with the modified data
      return {
        ...response,
        data: modifiedData
      };
    });
    
    const response = await client.get('https://example.com/api/test');
    
    expect(response.data.intercepted).toBe(true);
  });
  
  it('should handle errors with safe methods', async () => {
    // Mock a failed request
    mockFetch.mockImplementationOnce(() => {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });
    
    const { response, error } = await apico.getSafe('https://example.com/api/not-found');
    
    expect(response).toBe(null);
    expect(error).not.toBe(null);
    expect(error?.status).toBe(404);
    expect(error?.response?.data.error).toBe('Not found');
  });
  
  it('should handle network errors', async () => {
    // Mock a network failure
    mockFetch.mockImplementationOnce(() => {
      return Promise.reject(new Error('Network error'));
    });
    
    try {
      await apico.get('https://example.com/api/test');
      // Should not reach here
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toBe('Network error');
      expect(err.isApicoError).toBe(true);
    }
  });
  
  it('should handle timeout errors', async () => {
    // Mock a request that never resolves to test timeout
    mockFetch.mockImplementationOnce(() => {
      return new Promise((resolve) => {
        // This won't resolve within the timeout
        setTimeout(resolve, 1000);
      });
    });
    
    try {
      await apico.get('https://example.com/api/slow', { timeout: 50 });
      // Should not reach here
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toContain('timeout');
      expect(err.isApicoError).toBe(true);
    }
  });
});