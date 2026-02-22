/**
 * Web Fetch Tool
 *
 * Fetch content from URLs
 */
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_CONTENT_LENGTH = 1024 * 1024 * 5; // 5MB
export const webFetchTool = {
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
        },
        required: ['url'],
    },
    async execute(params) {
        const { url, method = 'GET', headers = {}, body, } = params;
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
            let content;
            // Try to parse as text
            if (contentType.includes('json')) {
                const json = await response.json();
                content = JSON.stringify(json, null, 2);
            }
            else {
                content = await response.text();
            }
            // Truncate if too long
            if (content.length > MAX_CONTENT_LENGTH) {
                content = content.substring(0, MAX_CONTENT_LENGTH) + '\n\n... (truncated)';
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
        }
        catch (error) {
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
