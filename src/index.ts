import { createApicoInstance } from "./core";
import type { ApicoStatic, RequestConfig } from "./types";

// Create default instance
const apico = createApicoInstance() as ApicoStatic;

// Add instance factory methods
apico.create = (config?: RequestConfig) => createApicoInstance(config);
apico.createClient = (config?: RequestConfig) => createApicoInstance(config);

// Export the default instance as the main export
export default apico;

// Export types and utils for advanced usage
export * from "./types";
export * from "./utils";
