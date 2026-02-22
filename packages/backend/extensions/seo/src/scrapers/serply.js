/**
 * Serply SERP Scraper
 * Website: https://serply.io
 * Tier: Secondary
 */

import { BaseScraper } from './base.js';

export class SerplyScraper extends BaseScraper {
  async scrape(keyword, { country = 'US', device = 'desktop', city = null, language = 'en' }) {
    const url = 'https://api.serply.io/v1/search';

    const params = new URLSearchParams({
      q: keyword,
      location: country,
      hl: language,
      num: 100,
    });

    const data = await this.makeRequest(`${url}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': this.apiKey,
        'X-User-Agent': device === 'mobile' ? 'mobile' : 'desktop',
      },
    });

    return this.extractResults(data.results || []);
  }

  extractResults(results) {
    return results.map((result, index) => ({
      position: result.position || index + 1,
      title: result.title || '',
      url: result.url || result.link || '',
      snippet: result.description || result.snippet || '',
      domain: this.extractDomain(result.url || result.link || ''),
    }));
  }
}
