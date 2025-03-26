# apico

A lightweight, typed HTTP client based on the Fetch API with an axios-like interface.

## Features

- 🔍 Full TypeScript support
- 🚀 Modern fetch-based implementation
- 🔄 Interceptors for requests, responses, and errors
- ⚙️ Configurable defaults and per-request options
- 🛡️ Error handling with safe request variants
- 🧩 Create multiple client instances with different configs
- 📊 Built-in performance metrics tracking

## Roadmap
- [ ] Better testing
- [ ] Rate limiting
- [ ] Request cancellation
- [ ] Cache layer
- [ ] Authentication helpers (OAuth, JWT Refresh etc)
- [ ] Streaming support
- [ ] Progress tracking

## Installation

```bash
# Using npm
npm install @haxzie/apico

# Using yarn
yarn add @haxzie/apico

# Using bun
bun add @haxzie/apico
```

## Basic Usage

```typescript
import apico from '@haxzie/apico';

// Simple GET request
const response = await apico.get('https://api.example.com/users');
console.log(response.data);

// POST request with data
const createResponse = await apico.post('https://api.example.com/users', {
  name: 'John Doe',
  email: 'john@example.com'
});
```

## Creating a Client

Create a configured client instance to use throughout your application:

```typescript
const client = apico.createClient({
  baseURL: 'https://api.example.com',
  headers: {
    'Authorization': 'Bearer token123'
  },
  timeout: 5000
});

// Now all requests are relative to the baseURL
const response = await client.get('/users');
```

## Performance Metrics

The library automatically tracks performance metrics for all requests:

```typescript
const response = await client.get('/users');

// Access performance metrics
console.log('Request performance:');
console.log(`Total duration: ${response.performance.duration}ms`);
console.log(`Latency (TTFB): ${response.performance.latency}ms`);
console.log(`Processing time: ${response.performance.processingTime}ms`);
console.log(`Transfer size: ${response.performance.transferSize} bytes`);
```

Available performance metrics:

- `duration`: Total time from request start to complete processing
- `latency`: Time to first byte (TTFB)
- `processingTime`: Time spent processing the response
- `transferTime`: Time spent receiving the response
- `transferSize`: Size of the response in bytes
- `transferEncoding`: Content encoding (e.g., 'gzip', 'identity')

You can use these metrics with interceptors for monitoring:

```typescript
client.onResponse((response) => {
  if (response.performance) {
    console.log(`Request to ${response.config.url} took ${response.performance.duration.toFixed(2)}ms`);
  }
  return response;
});
```

## TypeScript Support

Specify the expected response type for better type safety:

```typescript
// Define your data types
interface User {
  id: number;
  name: string;
  email: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

// Use type parameters with requests
const users = await client.get<User[]>('/users');

// Type both request body and response
const newUser = await client.post<User, CreateUserRequest>('/users', {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securepassword'
});
```

## Safe Request Methods

Handle errors without try/catch using the safe variants:

```typescript
const { response, error } = await client.getSafe('/users');

if (error) {
  // Handle the error
  console.error('Failed to fetch users:', error.message);
} else {
  // Use the response
  console.log('Users:', response.data);
}
```

## Interceptors

### Request Interceptors

```typescript
// Add JWT authentication to all requests
client.beforeRequest((config) => {
  const token = localStorage.getItem('auth_token');
  
  config.headers = {
    ...config.headers,
    'Authorization': `Bearer ${token}`
  };
  
  return config;
});
```

### Response Interceptors

```typescript
// Transform response data
client.onResponse((response) => {
  if (response.config.url?.includes('/users')) {
    // Normalize data structure
    const modifiedData = {
      ...response.data,
      results: response.data.users.map(user => ({
        id: user.user_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email_address
      }))
    };
    
    return {
      ...response,
      data: modifiedData
    };
  }
  
  return response;
});
```

### Error Interceptors

```typescript
// Add retry capability for network errors and 5xx responses
client.onError(async (error) => {
  const config = error.config;
  
  if (
    !config.metadata?.retryCount && 
    (!error.response || (error.response.status >= 500 && error.response.status < 600))
  ) {
    // Add retry metadata
    config.metadata = {
      ...config.metadata,
      retryCount: 1
    };
    
    // Wait before retrying (simple exponential backoff)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Retry the request
    try {
      return await client.request(config);
    } catch (retryError) {
      return retryError;
    }
  }
  
  return error;
});
```

## Request Configuration

All available request configuration options:

```typescript
const config = {
  // URL and path
  baseURL: 'https://api.example.com',
  url: '/users',
  
  // Request parameters
  params: { page: 1, limit: 10 },
  method: 'GET', // 'POST', 'PUT', 'DELETE', etc.
  data: { name: 'John' }, // Request body
  
  // Headers
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  },
  
  // Timeouts
  timeout: 5000, // ms
  
  // Response handling
  responseType: 'json', // 'text', 'blob', 'arrayBuffer', 'formData'
  
  // Standard fetch options
  credentials: 'same-origin',
  cache: 'default',
  redirect: 'follow',
  referrerPolicy: 'no-referrer-when-downgrade',
  mode: 'cors'
};
```

## API Reference

### Main Methods

- `apico.get(url, config?)`
- `apico.post(url, data?, config?)`
- `apico.put(url, data?, config?)`
- `apico.patch(url, data?, config?)`
- `apico.delete(url, config?)`
- `apico.head(url, config?)`
- `apico.options(url, config?)`

### Safe Variants

- `apico.getSafe(url, config?)`
- `apico.postSafe(url, data?, config?)`
- `apico.putSafe(url, data?, config?)`
- `apico.patchSafe(url, data?, config?)`
- `apico.deleteSafe(url, config?)`
- `apico.headSafe(url, config?)`
- `apico.optionsSafe(url, config?)`

### Instance Methods

- `apico.create(config?)` - Create a new instance with custom defaults
- `apico.createClient(config?)` - Alias for create
- `apico.request(config)` - Make a request with a custom config
- `apico.requestSafe(config)` - Safe variant of request

### Interceptors

- `apico.beforeRequest(interceptor)` - Add request interceptor
- `apico.onResponse(interceptor)` - Add response interceptor
- `apico.onError(interceptor)` - Add error interceptor