/**
 * Web Fetch Tool
 *
 * Fetch content from URLs
 */

import type { Tool, ToolResult } from './types.js';

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_CONTENT_LENGTH = 1024 * 1024 * 5; // 5MB

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
      console.log(`[WebFetchTool] 🌐 Fetching: ${url}`);
      console.log(`[WebFetchTool]   Method: ${method}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      const response = await fetch(url, {
        method,
        headers: {
          'User-Agent': 'AgentPlayer/1.0',
          ...headers,
        },
        body: body ? body : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

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
      if (contentType.includes('json')) {
        const json = await response.json();
        content = JSON.stringify(json, null, 2);
      } else {
        content = await response.text();
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
