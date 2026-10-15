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
  // No named function inside the page callback: under tsx (how the backend
  // runs) a named inner function gets a __name() wrapper that does not exist
  // in the page, and the whole call failed with "__name is not defined".
  const meta = await page.evaluate((names: string[]) => {
    const found: Record<string, string | undefined> = {};
    for (const name of names) {
      const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
      found[name] = el?.getAttribute('content') || undefined;
    }
    return { title: document.title || '', url: window.location.href, found };
  }, ['description', 'og:description', 'keywords', 'og:image']);
  return {
    title: meta.title,
    url: meta.url,
    description: meta.found['description'] || meta.found['og:description'],
    keywords: meta.found['keywords']?.split(',').map((k) => k.trim()),
    ogImage: meta.found['og:image'],
  };
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
 * Text of the elements matching `selector`: the first one, or all of them
 * with `multiple` (an empty result when nothing matches, never a throw).
 */
export async function extractText(
  page: Page,
  selector: string,
  opts: { multiple?: boolean; trim?: boolean } = {}
): Promise<string | string[]> {
  const texts = await page.$$eval(selector, (els) => els.map((el) => el.textContent || ''));
  const clean = opts.trim === false ? texts : texts.map((t) => t.replace(/\s+/g, ' ').trim());
  return opts.multiple ? clean : (clean[0] ?? '');
}

/** JSON-LD blocks of the page (schema.org data); unparsable blocks are skipped. */
export async function extractStructuredData(page: Page): Promise<unknown[]> {
  const blocks = await page.$$eval('script[type="application/ld+json"]', (els) => els.map((el) => el.textContent || ''));
  const out: unknown[] = [];
  for (const b of blocks) {
    try { out.push(JSON.parse(b)); } catch { /* not JSON */ }
  }
  return out;
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
