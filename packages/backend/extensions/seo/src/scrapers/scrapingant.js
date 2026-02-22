/**
 * ScrapingAnt SERP Scraper
 * Website: https://scrapingant.com
 * Tier: Secondary
 */

import { BaseScraper } from './base.js';

export class ScrapingAntScraper extends BaseScraper {
  async scrape(keyword, { country = 'US', device = 'desktop', city = null, language = 'en' }) {
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&num=100&gl=${country.toLowerCase()}&hl=${language}`;

    const params = new URLSearchParams({
      url: googleUrl,
      x_api_key: this.apiKey,
      browser: 'false',
    });

    const url = `https://api.scrapingant.com/v2/general?${params.toString()}`;

    const data = await this.makeRequest(url, {
      method: 'GET',
    });

    return this.extractResults(data);
  }

  extractResults(htmlContent) {
    const results = [];
    const regex = /<div class="g"[\s\S]*?<a href="([^"]+)"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/gi;
    let match;
    let position = 1;

    while ((match = regex.exec(htmlContent)) !== null && position <= 100) {
      results.push({
        position: position++,
        url: match[1],
        title: match[2].replace(/<[^>]*>/g, ''),
        snippet: match[3].replace(/<[^>]*>/g, ''),
        domain: this.extractDomain(match[1]),
      });
    }

    return results;
  }
}
