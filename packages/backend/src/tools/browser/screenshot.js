/**
 * Browser Screenshot Tool
 *
 * Capture screenshots of web pages
 * Supports full page, specific elements, and custom viewports
 */
import { getBrowserController } from '../../browser/controller.js';
export const browserScreenshotTool = {
    name: 'browser_screenshot',
    description: `Capture a screenshot of a web page.

Use this tool when you need to:
- Take a visual snapshot of a webpage
- Capture a full-page screenshot
- Screenshot a specific element on a page
- Verify how a page looks visually

The tool will navigate to the URL, wait for the page to load, and capture a screenshot.
Returns the path to the saved screenshot image.`,
    input_schema: {
        type: 'object',
        properties: {
            url: {
                type: 'string',
                description: 'The URL to capture',
            },
            fullPage: {
                type: 'boolean',
                description: 'Capture the entire scrollable page (default: false)',
            },
            element: {
                type: 'string',
                description: 'CSS selector to capture only a specific element',
            },
            width: {
                type: 'number',
                description: 'Viewport width in pixels (default: 1280)',
            },
            height: {
                type: 'number',
                description: 'Viewport height in pixels (default: 720)',
            },
            waitTime: {
                type: 'number',
                description: 'Wait time in milliseconds after page load (default: 1000)',
            },
            waitFor: {
                type: 'string',
                description: 'CSS selector to wait for before capturing',
            },
        },
        required: ['url'],
    },
    async execute(params) {
        const controller = getBrowserController();
        let sessionId = null;
        try {
            // Validate URL
            if (!params.url.startsWith('http://') && !params.url.startsWith('https://')) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: URL must start with http:// or https://`,
                        },
                    ],
                    error: 'Invalid URL format',
                };
            }
            // Create browser session with custom viewport
            const session = await controller.createSession({
                headless: true,
                viewportWidth: params.width || 1280,
                viewportHeight: params.height || 720,
            });
            sessionId = session.id;
            // Navigate to URL
            const navResult = await controller.navigate(sessionId, params.url, {
                waitUntil: 'networkidle2',
                timeout: 30000,
            });
            if (!navResult.success) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Failed to navigate to ${params.url}: ${navResult.error}`,
                        },
                    ],
                    error: navResult.error,
                };
            }
            // Wait for selector if specified
            if (params.waitFor) {
                await controller.waitForElement(sessionId, params.waitFor, {
                    timeout: 30000,
                });
            }
            // Additional wait time for dynamic content
            const waitTime = params.waitTime !== undefined ? params.waitTime : 1000;
            if (waitTime > 0) {
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
            // Take screenshot
            const screenshotResult = await controller.screenshot(sessionId, {
                fullPage: params.fullPage,
                selector: params.element,
            });
            // Close session
            await controller.closeSession(sessionId);
            if (!screenshotResult.success) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Failed to capture screenshot: ${screenshotResult.error}`,
                        },
                    ],
                    error: screenshotResult.error,
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Screenshot captured successfully!\n\nPage: ${navResult.title}\nURL: ${params.url}\nScreenshot saved to: ${screenshotResult.path}\n\nSize: ${params.width || 1280}x${params.height || 720}${params.fullPage ? ' (Full page)' : ''}${params.element ? `\nElement: ${params.element}` : ''}`,
                    },
                ],
                data: {
                    success: true,
                    path: screenshotResult.path,
                    url: params.url,
                    title: navResult.title,
                    fullPage: params.fullPage,
                    element: params.element,
                    viewport: {
                        width: params.width || 1280,
                        height: params.height || 720,
                    },
                },
            };
        }
        catch (error) {
            // Cleanup session on error
            if (sessionId) {
                try {
                    await controller.closeSession(sessionId);
                }
                catch {
                    // Ignore cleanup errors
                }
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error capturing screenshot of ${params.url}: ${error.message}`,
                    },
                ],
                error: error.message,
            };
        }
    },
};
