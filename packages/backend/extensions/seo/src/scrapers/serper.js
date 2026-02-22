/**
 * Serper.dev SERP Scraper
 * Website: https://serper.dev
 * Tier: Primary (recommended)
 */

import { BaseScraper } from './base.js';

export class SerperScraper extends BaseScraper {
  async scrape(keyword, { country = 'US', device = 'desktop', city = null, language = 'en' }) {
    const url = 'https://google.serper.dev/search';

    const requestBody = {
      q: keyword,
      gl: country.toLowerCase(),
      hl: language,
      num: 100,
      device: device === 'mobile' ? 'mobile' : 'desktop',
    };

    if (city) {
      requestBody.location = city;
    }

    const data = await this.makeRequest(url, {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    return this.extractResults(data.organic || []);
  }

  extractResults(organicResults) {
    return organicResults.map((result, index) => ({
      position: result.position || index + 1,
      title: result.title || '',
      url: result.link || '',
      snippet: result.snippet || '',
      domain: this.extractDomain(result.link || ''),
    }));
  }
}
