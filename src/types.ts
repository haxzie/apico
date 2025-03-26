export type Method = 
  | 'GET' 
  | 'POST' 
  | 'PUT' 
  | 'DELETE' 
  | 'PATCH' 
  | 'HEAD' 
  | 'OPTIONS';

export interface RequestConfig extends Omit<RequestInit, 'body' | 'method'> {
  baseURL?: string;
  url?: string;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  timeout?: number;
  data?: any;
  method?: Method;
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';
}

export type ResponsePerformance = {
  duration: number;
  latency: number; 
  processingTime: number;
  transferTime: number;
  transferSize: number;
  transferEncoding: string;
};

export interface ApicoResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: RequestConfig;
  originalResponse: Response;
  performance?: ResponsePerformance;
}

export interface ApicoError extends Error {
  config: RequestConfig;
  response?: ApicoResponse;
  status?: number;
  isApicoError: true;
}

export type ErrorResult<T = any> = {
  response: null;
  error: ApicoError;
}

export type SuccessResult<T = any> = {
  response: ApicoResponse<T>;
  error: null;
}

export type RequestResult<T = any> = SuccessResult<T> | ErrorResult;

export type BeforeRequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = <T = any>(response: ApicoResponse<T>) => ApicoResponse<T & Record<string, any>> | Promise<ApicoResponse<T & Record<string, any>>>;
export type ErrorInterceptor = (error: ApicoError) => ApicoError | Promise<ApicoError>;

export interface ApicoInstance {
  defaults: RequestConfig;
  
  request<T = any>(config: RequestConfig): Promise<ApicoResponse<T>>;
  requestSafe<T = any>(config: RequestConfig): Promise<RequestResult<T>>;
  
  get<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<ApicoResponse<T>>;
  delete<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<ApicoResponse<T>>;
  head<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<ApicoResponse<T>>;
  options<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<ApicoResponse<T>>;
  
  post<T = any, D = any>(url: string, data?: D, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<ApicoResponse<T>>;
  put<T = any, D = any>(url: string, data?: D, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<ApicoResponse<T>>;
  patch<T = any, D = any>(url: string, data?: D, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<ApicoResponse<T>>;
  
  getSafe<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<RequestResult<T>>;
  deleteSafe<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<RequestResult<T>>;
  headSafe<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<RequestResult<T>>;
  optionsSafe<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<RequestResult<T>>;
  
  postSafe<T = any, D = any>(url: string, data?: D, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<RequestResult<T>>;
  putSafe<T = any, D = any>(url: string, data?: D, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<RequestResult<T>>;
  patchSafe<T = any, D = any>(url: string, data?: D, config?: Omit<RequestConfig, 'url' | 'method' | 'data'>): Promise<RequestResult<T>>;
  
  beforeRequest(interceptor: BeforeRequestInterceptor): () => void;
  onResponse(interceptor: ResponseInterceptor): () => void;
  onError(interceptor: ErrorInterceptor): () => void;
}

export interface ApicoStatic extends ApicoInstance {
  create(config?: RequestConfig): ApicoInstance;
  createClient(config?: RequestConfig): ApicoInstance;
}