/**
 * SpaceSERP SERP Scraper
 * Website: https://spaceserp.com
 * Tier: Secondary
 */

import { BaseScraper } from './base.js';

export class SpaceSERPScraper extends BaseScraper {
  async scrape(keyword, { country = 'US', device = 'desktop', city = null, language = 'en' }) {
    const params = new URLSearchParams({
      apiKey: this.apiKey,
      q: keyword,
      gl: country.toLowerCase(),
      hl: language,
      resultFormat: 'json',
      device: device === 'mobile' ? 'mobile' : 'desktop',
    });

    const url = `https://api.spaceserp.com/google/search?${params.toString()}`;

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
