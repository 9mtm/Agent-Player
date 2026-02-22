/**
 * Browser Page Utilities
 * Shared utilities for browser automation tools
 */

import type { Page } from 'puppeteer';

/**
 * Page metadata interface
 */
export interface PageMetadata {
  title: string;
  url: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
}

/**
 * Extract page metadata
 */
export async function getPageMetadata(page: Page): Promise<PageMetadata> {
  return await page.evaluate(() => {
    const title = document.title || '';
    const url = window.location.href;

    const getMetaContent = (name: string): string | undefined => {
      const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      return meta?.getAttribute('content') || undefined;
    };

    return {
      title,
      url,
      description: getMetaContent('description') || getMetaContent('og:description'),
      keywords: getMetaContent('keywords')?.split(',').map(k => k.trim()),
      ogImage: getMetaContent('og:image')
    };
  });
}

/**
 * Extract text content from page
 */
export async function extractTextContent(
  page: Page,
  selector?: string
): Promise<string> {
  if (selector) {
    return await page.$eval(selector, el => el.textContent || '');
  }

  return await page.evaluate(() => {
    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());

    return document.body.textContent || '';
  });
}

/**
 * Extract links from page
 */
export async function extractLinks(
  page: Page,
  selector?: string
): Promise<Array<{ text: string; href: string }>> {
  const baseSelector = selector ? `${selector} a` : 'a';

  return await page.$$eval(baseSelector, (links) => {
    return Array.from(links).map(link => ({
      text: link.textContent?.trim() || '',
      href: (link as HTMLAnchorElement).href
    }));
  });
}

/**
 * Extract images from page
 */
export async function extractImages(
  page: Page,
  selector?: string
): Promise<Array<{ alt: string; src: string }>> {
  const baseSelector = selector ? `${selector} img` : 'img';

  return await page.$$eval(baseSelector, (images) => {
    return Array.from(images).map(img => ({
      alt: (img as HTMLImageElement).alt || '',
      src: (img as HTMLImageElement).src
    }));
  });
}

/**
 * Extract table data
 */
export async function extractTableData(
  page: Page,
  selector?: string
): Promise<string[][]> {
  const baseSelector = selector || 'table';

  return await page.$$eval(baseSelector, (tables) => {
    const table = tables[0];
    if (!table) return [];

    const rows = Array.from(table.querySelectorAll('tr'));
    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      return cells.map(cell => cell.textContent?.trim() || '');
    });
  });
}

/**
 * Fill form fields
 */
export async function fillForm(
  page: Page,
  formData: Record<string, string>
): Promise<void> {
  for (const [name, value] of Object.entries(formData)) {
    // Try input field
    const input = await page.$(`input[name="${name}"]`);
    if (input) {
      await input.type(value);
      continue;
    }

    // Try textarea
    const textarea = await page.$(`textarea[name="${name}"]`);
    if (textarea) {
      await textarea.type(value);
      continue;
    }

    // Try select
    const select = await page.$(`select[name="${name}"]`);
    if (select) {
      await page.select(`select[name="${name}"]`, value);
      continue;
    }
  }
}

/**
 * Wait for navigation or timeout
 */
export async function waitForNavigationOrTimeout(
  page: Page,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await Promise.race([
      page.waitForNavigation({ timeout }),
      new Promise(resolve => setTimeout(resolve, timeout))
    ]);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if element exists
 */
export async function elementExists(
  page: Page,
  selector: string
): Promise<boolean> {
  const element = await page.$(selector);
  return element !== null;
}

/**
 * Wait for element to be visible
 */
export async function waitForVisible(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { visible: true, timeout });
    return true;
  } catch (error) {
    return false;
  }
}
