import apico from "../src";

// Define some types for our API
interface User {
  id: number;
  name: string;
  email: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

async function basicExample() {
  // Make a simple GET request
  const response = await apico.get(
    "https://jsonplaceholder.typicode.com/users"
  );
  console.log("All users:", response.data);

  // Get a single user with type
  const userResponse = await apico.get<User>(
    "https://jsonplaceholder.typicode.com/users/1"
  );
  console.log("User name:", userResponse.data.name);

  // Post with data
  const newUser = await apico.post<User, CreateUserRequest>(
    "https://jsonplaceholder.typicode.com/users",
    {
      name: "John Doe",
      email: "john@example.com",
    }
  );
  console.log("Created user:", newUser.data);

  // Using the safe method variant
  const { response: usersResponse, error } = await apico.getSafe<User[]>(
    "https://jsonplaceholder.typicode.com/users"
  );

  if (error) {
    console.error("Error fetching users:", error.message);
  } else {
    console.log("Got users safely:", usersResponse.data.length);
  }
}

async function clientExample() {
  // Create a client with defaults
  const client = apico.createClient({
    baseURL: "https://jsonplaceholder.typicode.com",
    headers: {
      "X-API-Key": "demo-key",
    },
    timeout: 5000,
  });

  // Add a request interceptor
  client.beforeRequest((config) => {
    console.log(`Making request to: ${config.url}`);
    // Add a timestamp header to each request
    config.headers = {
      ...config.headers,
      "X-Request-Time": new Date().toISOString(),
    };
    return config;
  });

  // Add a response interceptor
  client.onResponse((response) => {
    console.log(`Got response from: ${response.config.url}`);
    // Could transform the response data here
    return response;
  });

  // Add an error interceptor
  client.onError((error) => {
    console.error(`Request error: ${error.message}`);
    return error;
  });

  // Now make requests with the configured client
  const users = await client.get<User[]>("/users");
  console.log("Client users count:", users.data.length);

  const posts = await client.get("/posts", {
    params: {
      userId: 1,
    },
  });
  console.log("Posts for user 1:", posts.data);

  try {
    // This will trigger the error interceptor
    await client.get("/nonexistent-endpoint");
  } catch (error) {
    console.log("Error caught in try/catch");
  }

  // Using the safe variant to handle errors
  const { response, error } = await client.getSafe("/another-bad-url");
  if (error) {
    console.log("Safe error handling:", error.message);
  }
}

// Run the examples
async function runExamples() {
  console.log("--- Basic Examples ---");
  await basicExample();

  console.log("\n--- Client Examples ---");
  await clientExample();
}

runExamples().catch(console.error);
