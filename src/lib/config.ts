/**
 * Centralized Configuration
 * All API routes should import from this file
 */

export const config = {
  /**
   * Backend API URL - configured via NEXT_PUBLIC_BACKEND_URL in .env
   * Default: http://localhost:41522 (fallback only for development)
   */
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:41522',

  /**
   * Frontend App URL
   */
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:41521',

  /**
   * Ollama/Local LLM API URL - configured via LOCAL_MODEL_API_URL in .env
   * Default: http://localhost:11434 (standard Ollama endpoint)
   */
  ollamaUrl: process.env.LOCAL_MODEL_API_URL?.replace('/v1', '') || process.env.OLLAMA_URL || 'http://localhost:11434',

  /**
   * Workflow Visualizer URL - configured via NEXT_PUBLIC_VISUALIZER_URL in .env
   * Default: http://localhost:3456 (ReactFlow visualizer service)
   */
  visualizerUrl: process.env.NEXT_PUBLIC_VISUALIZER_URL || 'http://localhost:3456',
} as const;
