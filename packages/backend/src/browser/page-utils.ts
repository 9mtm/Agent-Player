/**
 * Page Interaction Utilities
 * Common web automation tasks and helpers
 *
 * SECURITY: All evaluate() calls use parameterized arguments to prevent JS injection (C-09)
 */

import { getBrowserController } from './controller.js';
import type { ElementInfo } from './types.js';

/**
 * Form field definition
 */
export interface FormField {
  /** Field selector */
  selector: string;
  /** Field value */
  value: string;
  /** Field type */
  type?: 'text' | 'select' | 'checkbox' | 'radio' | 'file';
  /** Delay before typing (ms) */
  delay?: number;
}

/**
 * Table data result
 */
export interface TableData {
  /** Column headers */
  headers: string[];
  /** Row data */
  rows: string[][];
  /** Total rows */
  totalRows: number;
}

/**
 * Link info */
export interface LinkInfo {
  /** Link text */
  text: string;
  /** Link URL */
  href: string;
  /** Is external */
  isExternal: boolean;
}

/**
 * Image info */
export interface ImageInfo {
  /** Image source URL */
  src: string;
  /** Alt text */
  alt?: string;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
}

/**
 * Fill a form with provided data
 */
export async function fillForm(
  sessionId: string,
  fields: FormField[],
  submitSelector?: string
): Promise<{ success: boolean; errors: string[] }> {
  const controller = getBrowserController();
  const errors: string[] = [];

  for (const field of fields) {
    if (field.delay) {
      await new Promise((r) => setTimeout(r, field.delay));
    }

    let result;

    switch (field.type) {
      case 'select':
        result = await controller.select(sessionId, field.selector, { value: field.value });
        break;

      case 'checkbox':
      case 'radio':
        // Click if needed to set value
        const info = await controller.getElementInfo(sessionId, field.selector);
        if (info && info.isChecked !== (field.value === 'true')) {
          result = await controller.click(sessionId, field.selector);
        } else {
          result = { success: true };
        }
        break;

      case 'file':
        // SECURITY: Pass selector as argument to prevent JS injection (C-09)
        result = await controller.evaluate(sessionId, `
          (selector) => {
            const input = document.querySelector(selector);
            if (input && input.type === 'file') {
              // File path would need special handling
              return true;
            }
            return false;
          }
        `, [field.selector]);
        break;

      default:
        result = await controller.type(sessionId, field.selector, field.value, { clear: true });
    }

    if (!result.success) {
      errors.push(`Failed to fill ${field.selector}: ${result.error}`);
    }
  }

  // Submit form if selector provided
  if (submitSelector && errors.length === 0) {
    const submitResult = await controller.click(sessionId, submitSelector);
    if (!submitResult.success) {
      errors.push(`Failed to submit: ${submitResult.error}`);
    }
  }

  return { success: errors.length === 0, errors };
}

/**
 * Extract table data from page
 */
export async function extractTable(
  sessionId: string,
  tableSelector: string
): Promise<TableData | null> {
  const controller = getBrowserController();

  // SECURITY: Pass selector as argument to prevent JS injection (C-09)
  const result = await controller.evaluate(sessionId, `
    (tableSelector) => {
      const table = document.querySelector(tableSelector);
      if (!table) return null;

      const headers = [];
      const rows = [];

      // Get headers
      const headerCells = table.querySelectorAll('thead th, thead td, tr:first-child th');
      headerCells.forEach(cell => headers.push(cell.textContent.trim()));

      // Get rows
      const bodyRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
      bodyRows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        const rowData = [];
        cells.forEach(cell => rowData.push(cell.textContent.trim()));
        if (rowData.length > 0) {
          rows.push(rowData);
        }
      });

      return { headers, rows, totalRows: rows.length };
    }
  `, [tableSelector]);

  return result.success ? (result.value as TableData) : null;
}

/**
 * Extract all links from page
 */
export async function extractLinks(
  sessionId: string,
  containerSelector?: string
): Promise<LinkInfo[]> {
  const controller = getBrowserController();

  // SECURITY: Pass selector as argument to prevent JS injection (C-09)
  const result = await controller.evaluate(
    sessionId,
    `
    (containerSelector) => {
      const container = containerSelector ? document.querySelector(containerSelector) : document;
      if (!container) return [];

      const currentHost = window.location.hostname;
      const links = [];

      container.querySelectorAll('a[href]').forEach(link => {
        const href = link.href;
        let isExternal = false;

        try {
          const url = new URL(href);
          isExternal = url.hostname !== currentHost;
        } catch {}

        links.push({
          text: link.textContent.trim(),
          href,
          isExternal
        });
      });

      return links;
    }
  `,
    [containerSelector || null]
  );

  return result.success ? (result.value as LinkInfo[]) : [];
}

/**
 * Extract all images from page
 */
export async function extractImages(
  sessionId: string,
  containerSelector?: string
): Promise<ImageInfo[]> {
  const controller = getBrowserController();

  // SECURITY: Pass selector as argument to prevent JS injection (C-09)
  const result = await controller.evaluate(
    sessionId,
    `
    (containerSelector) => {
      const container = containerSelector ? document.querySelector(containerSelector) : document;
      if (!container) return [];

      const images = [];

      container.querySelectorAll('img').forEach(img => {
        images.push({
          src: img.src,
          alt: img.alt || undefined,
          width: img.naturalWidth || undefined,
          height: img.naturalHeight || undefined
        });
      });

      return images;
    }
  `,
    [containerSelector || null]
  );

  return result.success ? (result.value as ImageInfo[]) : [];
}

/**
 * Extract text content from elements
 */
export async function extractText(
  sessionId: string,
  selector: string,
  options: { multiple?: boolean; trim?: boolean } = {}
): Promise<string | string[] | null> {
  const controller = getBrowserController();

  // SECURITY: Pass selector and options as arguments to prevent JS injection (C-09)
  const result = await controller.evaluate(
    sessionId,
    `
    (selector, shouldTrim, returnMultiple) => {
      const elements = document.querySelectorAll(selector);
      const texts = [];

      elements.forEach(el => {
        let text = el.textContent;
        if (shouldTrim) {
          text = text.trim();
        }
        texts.push(text);
      });

      return returnMultiple ? texts : (texts[0] || null);
    }
  `,
    [selector, options.trim !== false, options.multiple || false]
  );

  return result.success ? (result.value as string | string[]) : null;
}

/**
 * Extract attribute values from elements
 */
export async function extractAttribute(
  sessionId: string,
  selector: string,
  attribute: string,
  options: { multiple?: boolean } = {}
): Promise<string | string[] | null> {
  const controller = getBrowserController();

  // SECURITY: Pass selector and attribute as arguments to prevent JS injection (C-09)
  const result = await controller.evaluate(
    sessionId,
    `
    (selector, attribute, returnMultiple) => {
      const elements = document.querySelectorAll(selector);
      const values = [];

      elements.forEach(el => {
        const value = el.getAttribute(attribute);
        if (value !== null) {
          values.push(value);
        }
      });

      return returnMultiple ? values : (values[0] || null);
    }
  `,
    [selector, attribute, options.multiple || false]
  );

  return result.success ? (result.value as string | string[]) : null;
}

/**
 * Wait for navigation after action
 */
export async function waitForNavigation(
  sessionId: string,
  action: () => Promise<void>,
  timeout: number = 30000
): Promise<{ success: boolean; url?: string; error?: string }> {
  const controller = getBrowserController();

  // Get current URL
  const session = controller.getSession(sessionId);
  if (!session) return { success: false, error: 'Session not found' };

  const originalUrl = session.currentUrl;

  // Perform action
  await action();

  // Wait for URL change
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const currentSession = controller.getSession(sessionId);
    if (currentSession && currentSession.currentUrl !== originalUrl) {
      return { success: true, url: currentSession.currentUrl };
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  return { success: false, error: 'Navigation timeout' };
}

/**
 * Check if element exists
 */
export async function elementExists(sessionId: string, selector: string): Promise<boolean> {
  const controller = getBrowserController();

  // SECURITY: Pass selector as argument to prevent JS injection (C-09)
  const result = await controller.evaluate(sessionId, `
    (selector) => {
      return document.querySelector(selector) !== null;
    }
  `, [selector]);

  return result.success && result.value === true;
}

/**
 * Count elements matching selector
 */
export async function countElements(sessionId: string, selector: string): Promise<number> {
  const controller = getBrowserController();

  // SECURITY: Pass selector as argument to prevent JS injection (C-09)
  const result = await controller.evaluate(sessionId, `
    (selector) => {
      return document.querySelectorAll(selector).length;
    }
  `, [selector]);

  return result.success ? (result.value as number) : 0;
}

/**
 * Get computed style of element
 */
export async function getComputedStyle(
  sessionId: string,
  selector: string,
  property: string
): Promise<string | null> {
  const controller = getBrowserController();

  // SECURITY: Pass selector and property as arguments to prevent JS injection (C-09)
  const result = await controller.evaluate(sessionId, `
    (selector, property) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      return window.getComputedStyle(el).getPropertyValue(property);
    }
  `, [selector, property]);

  return result.success ? (result.value as string) : null;
}

/**
 * Highlight element (for debugging)
 */
export async function highlightElement(
  sessionId: string,
  selector: string,
  color: string = 'red',
  duration: number = 2000
): Promise<boolean> {
  const controller = getBrowserController();

  // SECURITY: Pass selector, color, and duration as arguments to prevent JS injection (C-09)
  const result = await controller.evaluate(sessionId, `
    (selector, color, duration) => {
      const el = document.querySelector(selector);
      if (!el) return false;

      const originalOutline = el.style.outline;
      el.style.outline = '3px solid ' + color;

      setTimeout(() => {
        el.style.outline = originalOutline;
      }, duration);

      return true;
    }
  `, [selector, color, duration]);

  return result.success && result.value === true;
}

/**
 * Scroll to element and center it
 */
export async function scrollToElement(
  sessionId: string,
  selector: string
): Promise<{ success: boolean; error?: string }> {
  const controller = getBrowserController();
  return controller.scroll(sessionId, { selector });
}

/**
 * Wait for page to be idle (no network activity)
 */
export async function waitForIdle(
  sessionId: string,
  timeout: number = 10000,
  idleTime: number = 500
): Promise<boolean> {
  const controller = getBrowserController();

  // SECURITY: Pass timeout and idleTime as arguments to prevent JS injection (C-09)
  const result = await controller.evaluate(sessionId, `
    (timeout, idleTime) => {
      return new Promise((resolve) => {
        let lastActivity = Date.now();
        let checkInterval;

        const observer = new PerformanceObserver((list) => {
          lastActivity = Date.now();
        });

        observer.observe({ entryTypes: ['resource'] });

        checkInterval = setInterval(() => {
          if (Date.now() - lastActivity > idleTime) {
            clearInterval(checkInterval);
            observer.disconnect();
            resolve(true);
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          observer.disconnect();
          resolve(false);
        }, timeout);
      });
    }
  `, [timeout, idleTime]);

  return result.success && result.value === true;
}

/**
 * Take full page screenshot stitched
 */
export async function fullPageScreenshot(
  sessionId: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  const controller = getBrowserController();
  return controller.screenshot(sessionId, { fullPage: true });
}

/**
 * Extract structured data (JSON-LD, microdata)
 */
export async function extractStructuredData(
  sessionId: string
): Promise<Record<string, unknown>[]> {
  const controller = getBrowserController();

  const result = await controller.evaluate(sessionId, `
    () => {
      const data = [];

      // JSON-LD
      document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try {
          const json = JSON.parse(script.textContent);
          data.push({ type: 'json-ld', data: json });
        } catch {}
      });

      // Open Graph meta tags
      const og = {};
      document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
        const property = meta.getAttribute('property').replace('og:', '');
        og[property] = meta.getAttribute('content');
      });
      if (Object.keys(og).length > 0) {
        data.push({ type: 'opengraph', data: og });
      }

      // Twitter Card meta tags
      const twitter = {};
      document.querySelectorAll('meta[name^="twitter:"]').forEach(meta => {
        const name = meta.getAttribute('name').replace('twitter:', '');
        twitter[name] = meta.getAttribute('content');
      });
      if (Object.keys(twitter).length > 0) {
        data.push({ type: 'twitter', data: twitter });
      }

      return data;
    }
  `, []);

  return result.success ? (result.value as Record<string, unknown>[]) : [];
}

/**
 * Get page metadata
 */
export async function getPageMetadata(sessionId: string): Promise<{
  title: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  language?: string;
  favicon?: string;
}> {
  const controller = getBrowserController();

  const result = await controller.evaluate(sessionId, `
    () => {
      const getMeta = (name) => {
        const meta = document.querySelector(\`meta[name="\${name}"], meta[property="\${name}"]\`);
        return meta?.getAttribute('content');
      };

      const canonical = document.querySelector('link[rel="canonical"]');
      const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
      const keywords = getMeta('keywords');

      return {
        title: document.title,
        description: getMeta('description'),
        keywords: keywords ? keywords.split(',').map(k => k.trim()) : undefined,
        canonical: canonical?.href,
        language: document.documentElement.lang || undefined,
        favicon: favicon?.href
      };
    }
  `, []);

  return result.success
    ? (result.value as any)
    : { title: '', description: undefined };
}
