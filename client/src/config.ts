/**
 * Application configuration
 */

// Set to true to use Python backend, false to use TypeScript backend
const USE_PYTHON_BACKEND = false;

// API base URLs
export const API_BASE_URL = USE_PYTHON_BACKEND 
  ? 'http://localhost:5001/api' 
  : '/api';

// Export config object
export const config = {
  usePythonBackend: USE_PYTHON_BACKEND,
  apiBaseUrl: API_BASE_URL,
  
  // LLM service configuration
  llm: {
    inferenceUrl: import.meta.env.LLM_INFERENCE_URL || 'http://localhost:8080/v1/completions',
    embeddingUrl: import.meta.env.LLM_EMBEDDING_URL || 'http://localhost:8080/v1/embeddings',
    model: 'mistral-7b'
  },
  
  // Milvus configuration
  milvus: {
    host: import.meta.env.MILVUS_HOST || 'localhost',
    port: import.meta.env.MILVUS_PORT || '19530'
  }
};

export default config;