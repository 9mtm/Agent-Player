/**
 * Web Fetch Tool
 *
 * Fetch content from URLs
 */

import type { Tool, ToolResult } from '../types.js';
import { checkPublicHttpUrl } from '../../browser/url-guard.js';
import type { LookupFn } from '../../services/net/safe-fetch.js';

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_CONTENT_LENGTH = 1024 * 1024 * 5; // 5MB
const MAX_REDIRECTS = 5;

export class WebFetchBlockedError extends Error {}

export interface PublicFetchDeps {
  fetchImpl?: typeof fetch;
  lookup?: LookupFn;
}

/**
 * SEC-NET-01: a request the agent asked for, only to public addresses.
 * The URL and every redirect hop must be http(s) to a public address (the
 * safe-fetch blocked list): before, any URL, method and header went out and
 * redirects were followed, so an agent could reach 127.0.0.1 services, the
 * LAN or cloud metadata. Redirects are followed by hand (at most
 * MAX_REDIRECTS); 303, and 301/302 after a POST, continue as GET without a
 * body. Limit: the address is checked here and resolved again by fetch (a
 * DNS rebinding window remains).
 */
export async function fetchPublic(rawUrl: string, init: RequestInit, deps: PublicFetchDeps = {}): Promise<{ response: Response; finalUrl: string }> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  let url = rawUrl;
  let request: RequestInit = { ...init };
  for (let hop = 0; ; hop++) {
    const verdict = await checkPublicHttpUrl(url, deps.lookup);
    if (!verdict.ok) throw new WebFetchBlockedError(`Blocked: ${verdict.reason}`);
    const response = await fetchImpl(url, { ...request, redirect: 'manual' });
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) return { response, finalUrl: url };
    if (hop >= MAX_REDIRECTS) throw new WebFetchBlockedError(`Too many redirects (more than ${MAX_REDIRECTS})`);
    url = new URL(location, url).toString();
    const method = String(request.method || 'GET').toUpperCase();
    if (response.status === 303 || ((response.status === 301 || response.status === 302) && method === 'POST')) {
      request = { ...request, method: 'GET', body: undefined };
    }
  }
}

/** The body as text, refusing more than `max` bytes (the content-length header alone was trusted before). */
export async function readTextCapped(response: Response, max: number = MAX_CONTENT_LENGTH): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new Error(`Content too large: more than ${max} bytes`);
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Test hook: the fetch and DNS lookup web_fetch uses (defaults: global fetch, system DNS). */
export const webFetchDeps: PublicFetchDeps = {};

export const webFetchTool: Tool = {
  name: 'web_fetch',
  description: 'Fetch content from a URL. Useful for API calls, downloading data, etc.',
  input_schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch (e.g., "https://api.github.com/users/octocat")',
      },
      method: {
        type: 'string',
        description: 'HTTP method (GET, POST, etc.)',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      },
      headers: {
        type: 'object',
        description: 'HTTP headers as key-value pairs',
      },
      body: {
        type: 'string',
        description: 'Request body (for POST, PUT, etc.)',
      },
      maxLength: {
        type: 'number',
        description: 'Maximum content length in characters. Content will be truncated if longer (default: no limit)',
      },
      extractText: {
        type: 'boolean',
        description: 'Strip HTML tags and extract only text content (default: false)',
      },
    },
    required: ['url'],
    examples: [
      {
        url: 'https://api.github.com/users/octocat',
        description: 'Fetch GitHub user information as JSON',
      },
      {
        url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
        maxLength: 5000,
        extractText: true,
        description: 'Fetch Wikipedia article, extract text only, limit to 5000 characters',
      },
      {
        url: 'https://httpbin.org/post',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"test": "data"}',
        description: 'Send POST request with JSON data',
      },
    ],
  },

  async execute(params): Promise<ToolResult> {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      maxLength,
      extractText = false,
    } = params;

    try {
      // Host only: a query string may carry tokens.
      let host = '';
      try { host = new URL(url).host; } catch { /* checked below */ }
      console.log(`[WebFetchTool] 🌐 Fetching from: ${host || '(invalid URL)'}`);
      console.log(`[WebFetchTool]   Method: ${method}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      let response: Response;
      try {
        ({ response } = await fetchPublic(url, {
          method,
          headers: {
            'User-Agent': 'AgentPlayer/1.0',
            ...headers,
          },
          body: body ? body : undefined,
          signal: controller.signal,
        }, webFetchDeps));
      } finally {
        clearTimeout(timeout);
      }

      // Check content length
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_CONTENT_LENGTH) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Content too large: ${contentLength} bytes (max: ${MAX_CONTENT_LENGTH})`,
            },
          ],
          error: 'Content too large',
        };
      }

      const contentType = response.headers.get('content-type') || '';
      let content: string;

      // Try to parse as text
      const raw = await readTextCapped(response);
      if (contentType.includes('json')) {
        try {
          content = JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
          content = raw;
        }
      } else {
        content = raw;
      }

      // ENHANCEMENT: Smart filtering
      // 1. Extract text only (remove HTML tags) if requested
      if (extractText && contentType.includes('html')) {
        content = content
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Remove styles
          .replace(/<[^>]+>/g, '')                                             // Remove HTML tags
          .replace(/&nbsp;/g, ' ')                                             // Replace &nbsp;
          .replace(/&amp;/g, '&')                                              // Replace &amp;
          .replace(/&lt;/g, '<')                                               // Replace &lt;
          .replace(/&gt;/g, '>')                                               // Replace &gt;
          .replace(/\n\s*\n/g, '\n\n')                                         // Remove multiple newlines
          .trim();
      }

      // 2. Apply custom maxLength if specified (before system limit)
      if (maxLength && content.length > maxLength) {
        content = content.substring(0, maxLength) + '\n\n... [Content truncated to ' + maxLength + ' characters]';
      }

      // 3. Apply system limit (5MB)
      if (content.length > MAX_CONTENT_LENGTH) {
        content = content.substring(0, MAX_CONTENT_LENGTH) + '\n\n... (truncated to system limit)';
      }

      console.log(`[WebFetchTool] ✅ Fetch successful`);
      console.log(`[WebFetchTool]   Status: ${response.status}`);
      console.log(`[WebFetchTool]   Content length: ${content.length} chars`);

      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
        details: {
          url,
          status: response.status,
          statusText: response.statusText,
          contentType,
          contentLength: content.length,
        },
      };
    } catch (error: any) {
      console.error(`[WebFetchTool] ❌ Fetch failed:`, error.message);

      const errorMessage = error.name === 'AbortError'
        ? `Request timed out after ${DEFAULT_TIMEOUT}ms`
        : error.message;

      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to fetch URL: ${errorMessage}`,
          },
        ],
        error: errorMessage,
      };
    }
  },
};
