/**
 * HasData SERP Scraper
 * Website: https://hasdata.com
 * Tier: Secondary
 */

import { BaseScraper } from './base.js';

export class HasDataScraper extends BaseScraper {
  async scrape(keyword, { country = 'US', device = 'desktop', city = null, language = 'en' }) {
    const url = 'https://api.hasdata.com/scrape/google';

    const data = await this.makeRequest(url, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: keyword,
        domain: 'google.com',
        gl: country.toLowerCase(),
        hl: language,
        num: 100,
        device: device === 'mobile' ? 'mobile' : 'desktop',
        location: city || undefined,
      }),
    });

    return this.extractResults(data.organic || data.organic_results || []);
  }

  extractResults(organicResults) {
    return organicResults.map((result, index) => ({
      position: result.position || index + 1,
      title: result.title || '',
      url: result.url || result.link || '',
      snippet: result.snippet || result.description || '',
      domain: this.extractDomain(result.url || result.link || ''),
    }));
  }
}
