# apico

A lightweight, typed HTTP client based on the Fetch API with an axios-like interface.

## Features

- 🔍 Full TypeScript support
- 🚀 Modern fetch-based implementation
- 🔄 Interceptors for requests, responses, and errors
- ⚙️ Configurable defaults and per-request options
- 🛡️ Error handling with safe request variants
- 🧩 Create multiple client instances with different configs

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

## Interceptors
Here are examples of using different interceptors with the `apico` library:

## Request Interceptors

These are executed before a request is sent and allow you to modify the request configuration.

### Adding Authentication Headers

```typescript
import apico from '@haxzie/apico';

const client = apico.createClient({
  baseURL: 'https://api.example.com'
});

// Add JWT authentication to all requests
client.beforeRequest((config) => {
  const token = localStorage.getItem('auth_token');
  
  config.headers = {
    ...config.headers,
    'Authorization': `Bearer ${token}`
  };
  
  return config;
});

// Use the client - all requests will automatically include the auth header
const users = await client.get('/users');
```

### Adding Request Logging

```typescript
import apico from '@haxzie/apico';

const client = apico.createClient();

// Log all outgoing requests
client.beforeRequest((config) => {
  console.log(`[${new Date().toISOString()}] Making ${config.method} request to ${config.url}`);
  
  // Add a timestamp to track request duration
  config.metadata = {
    ...config.metadata,
    requestTimestamp: Date.now()
  };
  
  return config;
});

// Make a request
await client.get('https://api.example.com/data');
// Console: [2025-03-25T12:45:32.123Z] Making GET request to https://api.example.com/data
```

### Adding Query Parameters to All Requests

```typescript
import apico from '@haxzie/apico';

const client = apico.createClient({
  baseURL: 'https://api.example.com'
});

// Add API version and app ID to all requests
client.beforeRequest((config) => {
  config.params = {
    ...config.params,
    api_version: '1.2',
    app_id: 'my-awesome-app'
  };
  
  return config;
});

// This will call '/users?api_version=1.2&app_id=my-awesome-app'
const users = await client.get('/users');
```

## Response Interceptors

These are executed after a response is received and before it's returned to your code.

### Response Logging

```typescript
import apico from '@haxzie/apico';

const client = apico.createClient();

// Log response timing and status
client.onResponse((response) => {
  const requestTime = response.config.metadata?.requestTimestamp;
  const duration = requestTime ? Date.now() - requestTime : 'unknown';
  
  console.log(`[${new Date().toISOString()}] Received response from ${response.config.url}:`);
  console.log(`  Status: ${response.status}`);
  console.log(`  Duration: ${duration}ms`);
  
  return response;
});

await client.get('https://api.example.com/data');
// Console output:
// [2025-03-25T12:45:33.456Z] Received response from https://api.example.com/data:
//   Status: 200
//   Duration: 333ms
```

### Data Transformation

```typescript
import apico from '@haxzie/apico';

const client = apico.createClient({
  baseURL: 'https://api.example.com'
});

// Normalize user data responses
client.onResponse((response) => {
  // Check if this is the users endpoint
  if (response.config.url?.includes('/users')) {
    // Create new modified data with normalized structure
    const modifiedData = {
      ...response.data,
      results: response.data.users.map(user => ({
        id: user.user_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email_address,
        // Add more normalized fields as needed
      }))
    };
    
    // Return modified response
    return {
      ...response,
      data: modifiedData
    };
  }
  
  return response;
});

// Get users with normalized data
const { results: users } = await client.get('/users').data;
console.log(users[0].name); // "John Doe" (transformed from first_name/last_name)
```

### Adding Pagination Helpers

```typescript
import apico from '@haxzie/apico';

const client = apico.createClient({
  baseURL: 'https://api.example.com'
});

// Add pagination helper methods to response
client.onResponse((response) => {
  // Only process responses with pagination information
  if (response.data.pagination) {
    const { pagination } = response.data;
    
    // Add helper methods
    const enhancedData = {
      ...response.data,
      hasNextPage: pagination.page < pagination.total_pages,
      hasPrevPage: pagination.page > 1,
      fetchNextPage: async () => {
        if (pagination.page < pagination.total_pages) {
          return client.get(response.config.url || '', {
            params: {
              ...response.config.params,
              page: pagination.page + 1
            }
          });
        }
        return null;
      },
      fetchPrevPage: async () => {
        if (pagination.page > 1) {
          return client.get(response.config.url || '', {
            params: {
              ...response.config.params,
              page: pagination.page - 1
            }
          });
        }
        return null;
      }
    };
    
    return {
      ...response,
      data: enhancedData
    };
  }
  
  return response;
});

// Usage example
const response = await client.get('/products', { params: { page: 1 } });
console.log(`Page ${response.data.pagination.page} of ${response.data.pagination.total_pages}`);

if (response.data.hasNextPage) {
  const nextPage = await response.data.fetchNextPage();
  console.log('Fetched next page:', nextPage.data.results);
}
```

## Error Interceptors

These are executed when a request fails and allow you to process errors before they're thrown.

### Global Error Handling

```typescript
import apico from '@haxzie/apico';

const client = apico.createClient({
  baseURL: 'https://api.example.com'
});

// Global error handler
client.onError((error) => {
  console.error(`Request failed: ${error.message}`);
  
  // Log detailed information
  if (error.response) {
    console.error(`Status: ${error.response.status}`);
    console.error(`Server message: ${JSON.stringify(error.response.data)}`);
  }
  
  return error; // Rethrow the error for the caller to handle
});

// Usage with try/catch
try {
  await client.get('/nonexistent-endpoint');
} catch (err) {
  console.log('Caught error in application code');
}
```

### Authentication Error Handling

```typescript
import apico from '@haxzie/apico';

const client = apico.createClient({
  baseURL: 'https://api.example.com'
});

// Handle authentication errors
client.onError((error) => {
  if (error.response?.status === 401) {
    console.log('Authentication error detected');
    
    // Clear invalid tokens
    localStorage.removeItem('auth_token');
    
    // Redirect to login page
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
    
    // Return a clearer error
    error.message = 'Your session has expired. Please login again.';
  }
  
  return error;
});

// Make an authenticated request
try {
  await client.get('/protected-resource');
} catch (error) {
  // If it's a 401, user will be redirected to login
  alert(error.message);
}
```

### Retry Logic

```typescript
import apico from '@haxzie/apico';

const client = apico.createClient({
  baseURL: 'https://api.example.com'
});

// Add retry capability for network errors and 5xx responses
client.onError(async (error) => {
  const config = error.config;
  
  // Only retry if we haven't retried already and if it's a network error or server error (5xx)
  if (
    !config.metadata?.retryCount && 
    (!error.response || (error.response.status >= 500 && error.response.status < 600))
  ) {
    console.log(`Retrying failed request to ${config.url}`);
    
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

// This will automatically retry once if there's a server error
await client.get('/sometimes-fails');
```

### Combining Multiple Interceptors

You can use multiple interceptors together to build a robust request pipeline:

```typescript
import apico from '@haxzie/apico';

const client = apico.createClient({
  baseURL: 'https://api.example.com'
});

// Request interceptor for authentication
client.beforeRequest((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return config;
});

// Request interceptor for logging
client.beforeRequest((config) => {
  console.log(`Making request to ${config.url}`);
  return config;
});

// Response interceptor for data normalization
client.onResponse((response) => {
  // Normalize camelCase from snake_case
  if (typeof response.data === 'object' && response.data !== null) {
    const normalize = (obj) => {
      const result = {};
      Object.keys(obj).forEach(key => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = obj[key];
      });
      return result;
    };
    
    return {
      ...response,
      data: normalize(response.data)
    };
  }
  
  return response;
});

// Error interceptor
client.onError((error) => {
  console.error(`Request failed: ${error.message}`);
  return error;
});

// Now all requests will have auth headers, logging, data normalization,
// and error handling
const data = await client.get('/users');
```


## Using with TypeScript

The library provides full TypeScript support with type definitions for all methods and interfaces. Here's an example of using custom types with apico:

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

// Type the request body and response
const newUser = await client.post<User, CreateUserRequest>('/users', {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securepassword'
});
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



## TypeScript Support

Specify the expected response type for better type safety:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// The response.data will be typed as User[]
const response = await client.get<User[]>('/users');

// Type for a single user
const user = await client.get<User>(`/users/${id}`);
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