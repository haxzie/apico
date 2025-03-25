# apico

A lightweight, typed HTTP client based on the Fetch API with an axios-like interface.

## Features

- 🔍 Full TypeScript support
- 🚀 Modern fetch-based implementation
- 🔄 Interceptors for requests, responses, and errors
- ⚙️ Configurable defaults and per-request options
- 🛡️ Error handling with safe request variants
- 🧩 Create multiple client instances with different configs

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

## Using Interceptors

Interceptors allow you to modify requests or responses:

```typescript
// Add auth headers before each request
client.beforeRequest((config) => {
  // Get fresh token from localStorage
  const token = localStorage.getItem('token');
  
  // Add Authorization header
  config.headers = {
    ...config.headers,
    'Authorization': `Bearer ${token}`
  };
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