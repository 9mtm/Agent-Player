/**
 * Default local Ollama URL (RUN-ISO F4).
 *
 * `OLLAMA_URL`, else `LOCAL_MODEL_API_URL` without its `/v1` suffix, else
 * the IPv4 loopback default `http://127.0.0.1:11434`. Every runtime default
 * (settings, chat routes, config) uses this, so an isolated run that points
 * both variables at a dead port can never reach a real local Ollama.
 */

export const FALLBACK_OLLAMA_URL = 'http://127.0.0.1:11434';

export function defaultOllamaUrl(env: NodeJS.ProcessEnv = process.env): string {
  const direct = (env.OLLAMA_URL ?? '').trim();
  if (direct) return direct.replace(/\/+$/, '');
  const api = (env.LOCAL_MODEL_API_URL ?? '').trim().replace(/\/+$/, '');
  if (api) return api.replace(/\/v1$/i, '');
  return FALLBACK_OLLAMA_URL;
}

/** OpenAI-compatible base: `LOCAL_MODEL_API_URL`, else `<defaultOllamaUrl()>/v1`. */
export function defaultOllamaApiUrl(env: NodeJS.ProcessEnv = process.env): string {
  const api = (env.LOCAL_MODEL_API_URL ?? '').trim();
  return api || `${defaultOllamaUrl(env)}/v1`;
}
