/**
 * SearchAPI SERP Scraper
 * Website: https://searchapi.io
 * Tier: Primary
 */

import { BaseScraper } from './base.js';

export class SearchAPIScraper extends BaseScraper {
  async scrape(keyword, { country = 'US', device = 'desktop', city = null, language = 'en' }) {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      engine: 'google',
      q: keyword,
      gl: country.toLowerCase(),
      hl: language,
      num: 100,
    });

    if (device === 'mobile') {
      params.append('device', 'mobile');
    }

    if (city) {
      params.append('location', city);
    }

    const url = `https://www.searchapi.io/api/v1/search?${params.toString()}`;

    const data = await this.makeRequest(url, {
      method: 'GET',
    });

    return this.extractResults(data.organic_results || []);
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
