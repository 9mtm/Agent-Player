/**
 * Integration Tests for Browser and Memory Tools
 *
 * Tests all 6 new tools in realistic scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createToolsRegistry } from '../index.js';
import type { ToolExecutionContext } from '../types.js';

describe('Browser and Memory Tools Integration', () => {
  let registry: ReturnType<typeof createToolsRegistry>;
  const testUserId = 'test-user-integration';
  const testWorkspaceDir = '/tmp/test-workspace';

  beforeAll(() => {
    const context: ToolExecutionContext = {
      userId: testUserId,
      workspaceDir: testWorkspaceDir,
    };

    registry = createToolsRegistry(context);
  });

  describe('Browser Navigate Tool', () => {
    it('should navigate to a URL and extract basic info', async () => {
      const result = await registry.execute('browser_navigate', {
        url: 'https://example.com',
        extractInfo: true,
      });

      expect(result.content).toBeDefined();
      expect(result.error).toBeUndefined();

      if (result.data) {
        expect(result.data.success).toBe(true);
        expect(result.data.title).toBeDefined();
        expect(result.data.url).toBe('https://example.com');
      }
    }, 30000); // 30 second timeout

    it('should handle invalid URLs gracefully', async () => {
      const result = await registry.execute('browser_navigate', {
        url: 'invalid-url',
      });

      expect(result.error).toBeDefined();
      expect(result.content[0].text).toContain('http://');
    });

    it('should take screenshot when requested', async () => {
      const result = await registry.execute('browser_navigate', {
        url: 'https://example.com',
        screenshot: true,
      });

      expect(result.data?.screenshot).toBeDefined();
      expect(result.data?.screenshot).toMatch(/\.png$/);
    }, 30000);
  });

  describe('Browser Screenshot Tool', () => {
    it('should capture a screenshot', async () => {
      const result = await registry.execute('browser_screenshot', {
        url: 'https://example.com',
      });

      expect(result.content).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.data?.path).toBeDefined();
      expect(result.data?.path).toMatch(/\.png$/);
    }, 30000);

    it('should capture full page screenshot', async () => {
      const result = await registry.execute('browser_screenshot', {
        url: 'https://example.com',
        fullPage: true,
      });

      expect(result.data?.fullPage).toBe(true);
      expect(result.data?.path).toBeDefined();
    }, 30000);

    it('should support custom viewport sizes', async () => {
      const result = await registry.execute('browser_screenshot', {
        url: 'https://example.com',
        width: 800,
        height: 600,
      });

      expect(result.data?.viewport).toEqual({ width: 800, height: 600 });
    }, 30000);
  });

  describe('Browser Extract Tool', () => {
    it('should extract links from a page', async () => {
      const result = await registry.execute('browser_extract', {
        url: 'https://example.com',
        extract: 'links',
      });

      expect(result.content).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.data?.links).toBeDefined();
      expect(Array.isArray(result.data?.links)).toBe(true);
      expect(result.data?.linkCount).toBeGreaterThan(0);
    }, 30000);

    it('should extract page metadata', async () => {
      const result = await registry.execute('browser_extract', {
        url: 'https://example.com',
        extract: 'metadata',
      });

      expect(result.data?.metadata).toBeDefined();
      expect(result.data?.metadata.title).toBeDefined();
    }, 30000);

    it('should extract text from selector', async () => {
      const result = await registry.execute('browser_extract', {
        url: 'https://example.com',
        extract: 'text',
        selector: 'h1',
      });

      expect(result.data?.text).toBeDefined();
      expect(typeof result.data?.text === 'string').toBe(true);
    }, 30000);

    it('should require selector for text extraction', async () => {
      const result = await registry.execute('browser_extract', {
        url: 'https://example.com',
        extract: 'text',
      });

      expect(result.error).toBeDefined();
      expect(result.content[0].text).toContain('selector');
    });

    it('should extract all data types with "all" mode', async () => {
      const result = await registry.execute('browser_extract', {
        url: 'https://example.com',
        extract: 'all',
      });

      expect(result.data?.links).toBeDefined();
      expect(result.data?.images).toBeDefined();
      expect(result.data?.metadata).toBeDefined();
      expect(result.data?.linkCount).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Browser Interact Tool', () => {
    it('should perform click action', async () => {
      const result = await registry.execute('browser_interact', {
        url: 'https://example.com',
        actions: [
          {
            type: 'click',
            selector: 'a',
          },
        ],
      });

      expect(result.content).toBeDefined();
      expect(result.data?.actionsPerformed).toBe(1);
    }, 30000);

    it('should perform wait action', async () => {
      const startTime = Date.now();

      const result = await registry.execute('browser_interact', {
        url: 'https://example.com',
        actions: [
          {
            type: 'wait',
            delay: 2000,
          },
        ],
      });

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(2000);
      expect(result.data?.actionsPerformed).toBe(1);
    }, 35000);

    it('should support session reuse with keepAlive', async () => {
      // Step 1: Create session with keepAlive
      const result1 = await registry.execute('browser_interact', {
        url: 'https://example.com',
        actions: [
          {
            type: 'wait',
            delay: 500,
          },
        ],
        keepAlive: true,
      });

      expect(result1.data?.sessionId).toBeDefined();
      const sessionId = result1.data?.sessionId;

      // Step 2: Reuse session
      const result2 = await registry.execute('browser_interact', {
        sessionId: sessionId,
        actions: [
          {
            type: 'wait',
            delay: 500,
          },
        ],
      });

      expect(result2.content).toBeDefined();
      expect(result2.data?.actionsPerformed).toBe(1);
    }, 40000);

    it('should handle invalid session ID gracefully', async () => {
      const result = await registry.execute('browser_interact', {
        sessionId: 'invalid-session-id',
        actions: [
          {
            type: 'wait',
            delay: 100,
          },
        ],
      });

      expect(result.error).toBeDefined();
      expect(result.content[0].text).toContain('not found');
    });

    it('should take screenshot after actions', async () => {
      const result = await registry.execute('browser_interact', {
        url: 'https://example.com',
        actions: [
          {
            type: 'wait',
            delay: 500,
          },
        ],
        screenshot: true,
      });

      expect(result.data?.screenshot).toBeDefined();
    }, 30000);
  });

  describe('Memory Save Tool', () => {
    it('should save a fact to memory', async () => {
      const result = await registry.execute('memory_save', {
        content: "User's name is Test User",
        userId: testUserId,
        type: 'fact',
        importance: 10,
        tags: ['name', 'identity'],
      });

      expect(result.content).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.data?.success).toBe(true);
      expect(result.data?.memoryId).toBeDefined();
      expect(result.data?.importance).toBe(10);
    });

    it('should save a preference to memory', async () => {
      const result = await registry.execute('memory_save', {
        content: 'User prefers Arabic language',
        userId: testUserId,
        type: 'preference',
        importance: 8,
        tags: ['language', 'localization'],
      });

      expect(result.data?.type).toBe('preference');
      expect(result.data?.layer).toBe('permanent'); // importance 8 → permanent
    });

    it('should save conversation context with lower importance', async () => {
      const result = await registry.execute('memory_save', {
        content: 'User mentioned working on a React project',
        userId: testUserId,
        type: 'conversation',
        importance: 5,
        tags: ['project', 'react'],
      });

      expect(result.data?.type).toBe('conversation');
      expect(result.data?.importance).toBe(5);
    });

    it('should clamp importance to 1-10 range', async () => {
      const result1 = await registry.execute('memory_save', {
        content: 'Test with high importance',
        userId: testUserId,
        importance: 100,
      });

      const result2 = await registry.execute('memory_save', {
        content: 'Test with low importance',
        userId: testUserId,
        importance: -5,
      });

      expect(result1.data?.importance).toBeLessThanOrEqual(10);
      expect(result2.data?.importance).toBeGreaterThanOrEqual(1);
    });

    it('should use default values when optional params omitted', async () => {
      const result = await registry.execute('memory_save', {
        content: 'Simple memory without options',
        userId: testUserId,
      });

      expect(result.data?.type).toBe('conversation'); // default
      expect(result.data?.importance).toBeGreaterThanOrEqual(1);
      expect(result.data?.importance).toBeLessThanOrEqual(10);
    });
  });

  describe('Memory Search Tool', () => {
    beforeAll(async () => {
      // Seed some memories for testing
      await registry.execute('memory_save', {
        content: "User's favorite color is blue",
        userId: testUserId,
        type: 'preference',
        importance: 7,
        tags: ['color', 'favorites'],
      });

      await registry.execute('memory_save', {
        content: 'User is learning TypeScript',
        userId: testUserId,
        type: 'goal',
        importance: 8,
        tags: ['learning', 'typescript'],
      });

      await registry.execute('memory_save', {
        content: 'User lives in Cairo',
        userId: testUserId,
        type: 'fact',
        importance: 9,
        tags: ['location'],
      });
    });

    it('should search and find relevant memories', async () => {
      const result = await registry.execute('memory_search', {
        query: 'favorite color',
        userId: testUserId,
      });

      expect(result.content).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.data?.count).toBeGreaterThan(0);
      expect(result.data?.memories).toBeDefined();
    });

    it('should filter by memory type', async () => {
      const result = await registry.execute('memory_search', {
        query: 'user information',
        userId: testUserId,
        type: 'fact',
      });

      if (result.data?.memories && result.data.memories.length > 0) {
        result.data.memories.forEach((memory: any) => {
          expect(memory.type).toBe('fact');
        });
      }
    });

    it('should filter by minimum importance', async () => {
      const result = await registry.execute('memory_search', {
        query: 'user',
        userId: testUserId,
        minImportance: 8,
      });

      if (result.data?.memories && result.data.memories.length > 0) {
        result.data.memories.forEach((memory: any) => {
          expect(memory.importance).toBeGreaterThanOrEqual(8);
        });
      }
    });

    it('should limit results', async () => {
      const result = await registry.execute('memory_search', {
        query: 'user',
        userId: testUserId,
        limit: 2,
      });

      expect(result.data?.memories?.length).toBeLessThanOrEqual(2);
    });

    it('should return empty results for non-matching query', async () => {
      const result = await registry.execute('memory_search', {
        query: 'this query should not match anything xyzabc123',
        userId: testUserId,
      });

      expect(result.data?.count).toBe(0);
      expect(result.data?.memories).toEqual([]);
    });

    it('should filter by tags', async () => {
      const result = await registry.execute('memory_search', {
        query: 'user',
        userId: testUserId,
        tags: ['location'],
      });

      if (result.data?.memories && result.data.memories.length > 0) {
        result.data.memories.forEach((memory: any) => {
          expect(memory.tags).toContain('location');
        });
      }
    });
  });

  describe('Complete Workflows', () => {
    it('should complete research and remember workflow', async () => {
      // Step 1: Navigate to page
      const nav = await registry.execute('browser_navigate', {
        url: 'https://example.com',
        extractInfo: true,
      });
      expect(nav.data?.success).toBe(true);

      // Step 2: Extract metadata
      const extract = await registry.execute('browser_extract', {
        url: 'https://example.com',
        extract: 'metadata',
      });
      expect(extract.data?.metadata).toBeDefined();

      // Step 3: Save to memory
      const save = await registry.execute('memory_save', {
        content: `Example.com is a domain used in documentation. Title: ${extract.data?.metadata?.title}`,
        userId: testUserId,
        type: 'fact',
        importance: 5,
        tags: ['web', 'documentation'],
      });
      expect(save.data?.success).toBe(true);

      // Step 4: Search and verify
      const search = await registry.execute('memory_search', {
        query: 'example.com documentation',
        userId: testUserId,
      });
      expect(search.data?.count).toBeGreaterThan(0);
    }, 60000);

    it('should complete screenshot and save workflow', async () => {
      // Step 1: Take screenshot
      const screenshot = await registry.execute('browser_screenshot', {
        url: 'https://example.com',
        fullPage: true,
      });
      expect(screenshot.data?.path).toBeDefined();

      // Step 2: Save screenshot path to memory
      const save = await registry.execute('memory_save', {
        content: `Screenshot of example.com saved at: ${screenshot.data?.path}`,
        userId: testUserId,
        type: 'conversation',
        importance: 4,
        tags: ['screenshot', 'example.com'],
      });
      expect(save.data?.success).toBe(true);
    }, 40000);
  });

  afterAll(async () => {
    // Cleanup: Close any remaining browser sessions
    const { getBrowserController } = await import('../../browser/index.js');
    const controller = getBrowserController();
    await controller.cleanup();
  });
});
