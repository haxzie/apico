import type {
  ApicoError,
  ApicoInstance,
  ApicoResponse,
  BeforeRequestInterceptor,
  ErrorInterceptor,
  RequestConfig,
  RequestResult,
  ResponseInterceptor,
} from "./types";

import {
  buildRequestConfig,
  buildURL,
  combineURLs,
  createTimeoutController,
  getContentTypeHeader,
  prepareRequestBody,
  calculatePerformanceMetrics,
} from "./utils";

import type { PerformanceMetrics } from "./utils";

/**
 * Create an Apico error object
 */
function createApicoError(
  message: string,
  config: RequestConfig,
  response?: ApicoResponse,
  status?: number
): ApicoError {
  const error = new Error(message) as ApicoError;
  error.config = config;
  error.response = response;
  error.status = status || response?.status;
  error.isApicoError = true;
  return error;
}

/**
 * Create a response object from fetch Response
 */
async function createApicoResponse<T>(
  response: Response,
  config: RequestConfig,
  performanceMetrics?: PerformanceMetrics
): Promise<ApicoResponse<T>> {
  const responseType = config.responseType || "json";

  // Record the time when we start processing the response body
  const processingStartTime = performance.now();
  performanceMetrics = performanceMetrics || { startTime: 0 };

  // Set firstByteTime if it wasn't set (fallback)
  if (!performanceMetrics.firstByteTime) {
    performanceMetrics.firstByteTime = processingStartTime;
  }

  let data: T;
  try {
    if (
      responseType === "json" &&
      response.headers.get("content-type")?.includes("application/json")
    ) {
      data = await response.json();
    } else if (
      responseType === "text" ||
      response.headers.get("content-type")?.includes("text/")
    ) {
      data = (await response.text()) as unknown as T;
    } else if (responseType === "blob") {
      data = (await response.blob()) as unknown as T;
    } else if (responseType === "arrayBuffer") {
      data = (await response.arrayBuffer()) as unknown as T;
    } else if (responseType === "formData") {
      data = (await response.formData()) as unknown as T;
    } else {
      // Default to json, but handle non-json responses gracefully
      try {
        data = await response.json();
      } catch {
        data = (await response.text()) as unknown as T;
      }
    }
  } catch (e) {
    // If we can't parse the response, use null as data
    data = null as unknown as T;
  }

  // Calculate final timing after response is fully processed
  performanceMetrics.endTime = performance.now();
  const performanceData = calculatePerformanceMetrics(
    performanceMetrics,
    response
  );

  return {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    config,
    originalResponse: response,
    performance: performanceData,
  };
}

/**
 * Create an Apico instance (client)
 */
export function createApicoInstance(
  defaultConfig: RequestConfig = {}
): ApicoInstance {
  // Store default config
  const defaults: RequestConfig = {
    headers: {
      Accept: "application/json, text/plain, */*",
    },
    method: "GET",
    ...defaultConfig,
  };

  // Interceptors
  const beforeRequestInterceptors: BeforeRequestInterceptor[] = [];
  const responseInterceptors: ResponseInterceptor[] = [];
  const errorInterceptors: ErrorInterceptor[] = [];

  // Core request method
  async function request<T = any>(
    config: RequestConfig
  ): Promise<ApicoResponse<T>> {
    // Build final config with defaults
    let requestConfig = buildRequestConfig(config, defaults);

    // Run request interceptors
    for (const interceptor of beforeRequestInterceptors) {
      requestConfig = await interceptor(requestConfig);
    }

    // Build URL
    let url = requestConfig.url || "";
    if (requestConfig.baseURL) {
      url = combineURLs(requestConfig.baseURL, url);
    }

    // Add query parameters
    if (requestConfig.params) {
      url = buildURL(url, requestConfig.params);
    }

    // Set up timeout
    const { controller, timeoutId } = createTimeoutController(
      requestConfig.timeout
    );

    try {
      // Prepare body based on method
      const method = (requestConfig.method || "GET").toUpperCase();
      let body: BodyInit | null = null;

      if (
        ["POST", "PUT", "PATCH"].includes(method) &&
        requestConfig.data !== undefined
      ) {
        body = prepareRequestBody(requestConfig.data);

        // Auto-set content-type header if not already set
        if (
          !requestConfig.headers?.["Content-Type"] &&
          !requestConfig.headers?.["content-type"]
        ) {
          const contentType = getContentTypeHeader(requestConfig.data);
          if (contentType) {
            requestConfig.headers = requestConfig.headers || {};
            requestConfig.headers["Content-Type"] = contentType;
          }
        }
      }

      // Execute request
      const response = await fetch(url, {
        method,
        body,
        headers: requestConfig.headers as HeadersInit,
        credentials: requestConfig.credentials,
        cache: requestConfig.cache,
        redirect: requestConfig.redirect,
        referrer: requestConfig.referrer,
        referrerPolicy: requestConfig.referrerPolicy,
        integrity: requestConfig.integrity,
        keepalive: requestConfig.keepalive,
        signal: controller.signal,
        mode: requestConfig.mode,
      });

      // Clear timeout if set
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      // Create response object
      let apicoResponse = await createApicoResponse<T>(response, requestConfig);

      // Process through response interceptors
      for (const interceptor of responseInterceptors) {
        apicoResponse = await interceptor(apicoResponse);
      }

      // Handle HTTP error status codes
      if (!response.ok) {
        let error = createApicoError(
          `Request failed with status code ${response.status}`,
          requestConfig,
          apicoResponse,
          response.status
        );

        // Process through error interceptors
        for (const interceptor of errorInterceptors) {
          error = await interceptor(error);
        }

        throw error;
      }

      return apicoResponse;
    } catch (err) {
      // Clear timeout if set
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      // Handle AbortError (timeout)
      if (err instanceof DOMException && err.name === "AbortError") {
        const error = createApicoError("Request aborted", requestConfig);

        // Process through error interceptors
        let processedError = error;
        for (const interceptor of errorInterceptors) {
          processedError = await interceptor(processedError);
        }

        throw processedError;
      }

      // If already an ApicoError, just rethrow
      if ((err as ApicoError).isApicoError) {
        throw err;
      }

      // Convert any other error to ApicoError
      const error = createApicoError(
        (err as Error).message || "Network Error",
        requestConfig
      );

      // Process through error interceptors
      let processedError = error;
      for (const interceptor of errorInterceptors) {
        processedError = await interceptor(processedError);
      }

      throw processedError;
    }
  }

  // Safe request - returns object with {response, error} instead of throwing
  async function requestSafe<T = any>(
    config: RequestConfig
  ): Promise<RequestResult<T>> {
    try {
      const response = await request<T>(config);
      return { response, error: null };
    } catch (err) {
      return { response: null, error: err as ApicoError };
    }
  }

  // HTTP method shortcuts
  function get<T = any>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Promise<ApicoResponse<T>> {
    return request<T>({ ...config, url, method: "GET" });
  }

  function delete_<T = any>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Promise<ApicoResponse<T>> {
    return request<T>({ ...config, url, method: "DELETE" });
  }

  function head<T = any>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Promise<ApicoResponse<T>> {
    return request<T>({ ...config, url, method: "HEAD" });
  }

  function options<T = any>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Promise<ApicoResponse<T>> {
    return request<T>({ ...config, url, method: "OPTIONS" });
  }

  function post<T = any>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Promise<ApicoResponse<T>> {
    return request<T>({ ...config, url, method: "POST", data });
  }

  function put<T = any>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Promise<ApicoResponse<T>> {
    return request<T>({ ...config, url, method: "PUT", data });
  }

  function patch<T = any>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Promise<ApicoResponse<T>> {
    return request<T>({ ...config, url, method: "PATCH", data });
  }

  // Safe method variants
  function getSafe<T = any>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Promise<RequestResult<T>> {
    return requestSafe<T>({ ...config, url, method: "GET" });
  }

  function deleteSafe<T = any>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Promise<RequestResult<T>> {
    return requestSafe<T>({ ...config, url, method: "DELETE" });
  }

  function headSafe<T = any>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Promise<RequestResult<T>> {
    return requestSafe<T>({ ...config, url, method: "HEAD" });
  }

  function optionsSafe<T = any>(
    url: string,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Promise<RequestResult<T>> {
    return requestSafe<T>({ ...config, url, method: "OPTIONS" });
  }

  function postSafe<T = any>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Promise<RequestResult<T>> {
    return requestSafe<T>({ ...config, url, method: "POST", data });
  }

  function putSafe<T = any>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Promise<RequestResult<T>> {
    return requestSafe<T>({ ...config, url, method: "PUT", data });
  }

  function patchSafe<T = any>(
    url: string,
    data?: any,
    config?: Omit<RequestConfig, "url" | "method" | "data">
  ): Promise<RequestResult<T>> {
    return requestSafe<T>({ ...config, url, method: "PATCH", data });
  }

  // Interceptor management
  function beforeRequest(interceptor: BeforeRequestInterceptor): () => void {
    beforeRequestInterceptors.push(interceptor);
    return () => {
      const index = beforeRequestInterceptors.indexOf(interceptor);
      if (index !== -1) {
        beforeRequestInterceptors.splice(index, 1);
      }
    };
  }

  function onResponse(interceptor: ResponseInterceptor): () => void {
    responseInterceptors.push(interceptor);
    return () => {
      const index = responseInterceptors.indexOf(interceptor);
      if (index !== -1) {
        responseInterceptors.splice(index, 1);
      }
    };
  }

  function onError(interceptor: ErrorInterceptor): () => void {
    errorInterceptors.push(interceptor);
    return () => {
      const index = errorInterceptors.indexOf(interceptor);
      if (index !== -1) {
        errorInterceptors.splice(index, 1);
      }
    };
  }

  // Create and return instance
  return {
    defaults,
    request,
    requestSafe,
    get,
    delete: delete_,
    head,
    options,
    post,
    put,
    patch,
    getSafe,
    deleteSafe,
    headSafe,
    optionsSafe,
    postSafe,
    putSafe,
    patchSafe,
    beforeRequest,
    onResponse,
    onError,
  };
}
