import type { RequestConfig } from './types';

/**
 * Builds a URL with query parameters
 */
export function buildURL(url: string, params?: Record<string, string | number | boolean | undefined>): string {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  if (!queryString) {
    return url;
  }

  // Check if URL already has query parameters
  return url.includes('?') 
    ? `${url}&${queryString}`
    : `${url}?${queryString}`;
}

/**
 * Combines base URL with path
 */
export function combineURLs(baseURL: string, relativeURL: string): string {
  const stripTrailingSlash = (str: string) => str.endsWith('/') ? str.slice(0, -1) : str;
  const addLeadingSlash = (str: string) => str.startsWith('/') ? str : `/${str}`;
  
  return relativeURL
    ? `${stripTrailingSlash(baseURL)}${addLeadingSlash(relativeURL)}`
    : baseURL;
}

/**
 * Merges default headers with request-specific headers
 */
export function mergeHeaders(
  defaultHeaders: Record<string, string> = {},
  requestHeaders: Record<string, string> = {}
): Record<string, string> {
  return { ...defaultHeaders, ...requestHeaders };
}

/**
 * Determines the appropriate content type header based on the request data
 */
export function getContentTypeHeader(data: any): string | undefined {
  if (data === undefined || data === null) {
    return undefined;
  }
  
  if (data instanceof FormData || data instanceof URLSearchParams) {
    // Browser will set the content type automatically for FormData with boundary
    return undefined;
  }
  
  if (data instanceof Blob || data instanceof ArrayBuffer) {
    return 'application/octet-stream';
  }
  
  if (typeof data === 'object') {
    return 'application/json';
  }
  
  return 'text/plain';
}

/**
 * Prepares the request body for different data types
 */
export function prepareRequestBody(data: any): BodyInit | null {
  if (data === undefined || data === null) {
    return null;
  }
  
  // These types are already acceptable for fetch
  if (
    typeof data === 'string' ||
    data instanceof Blob ||
    data instanceof ArrayBuffer ||
    data instanceof FormData ||
    data instanceof URLSearchParams ||
    data instanceof ReadableStream
  ) {
    return data as BodyInit;
  }
  
  // Convert objects to JSON string
  return JSON.stringify(data);
}

/**
 * Handles request timeout with AbortController
 */
export function createTimeoutController(timeout?: number): { 
  controller: AbortController, 
  timeoutId: number | undefined 
} {
  const controller = new AbortController();
  
  if (!timeout || timeout <= 0) {
    return { controller, timeoutId: undefined };
  }
  
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Request timeout of ${timeout}ms exceeded`));
  }, timeout) as unknown as number;
  
  return { controller, timeoutId };
}

/**
 * Builds the final request configuration by merging defaults and specifics
 */
export function buildRequestConfig(
  config: RequestConfig, 
  defaults: RequestConfig = {}
): RequestConfig {
  const mergedConfig: RequestConfig = {
    ...defaults,
    ...config,
    headers: mergeHeaders(defaults.headers, config.headers)
  };
  
  return mergedConfig;
}