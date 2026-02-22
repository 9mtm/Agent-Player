/**
 * ScrapingRobot SERP Scraper
 * Website: https://scrapingrobot.com
 * Tier: Secondary
 */

import { BaseScraper } from './base.js';

export class ScrapingRobotScraper extends BaseScraper {
  async scrape(keyword, { country = 'US', device = 'desktop', city = null, language = 'en' }) {
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&num=100&gl=${country.toLowerCase()}&hl=${language}`;

    const url = 'https://api.scrapingrobot.com';

    const data = await this.makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: googleUrl,
        module: 'GoogleScraper',
        token: this.apiKey,
      }),
    });

    return this.extractResults(data.result || data);
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
