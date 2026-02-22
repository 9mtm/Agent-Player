/**
 * Base Scraper Class
 *
 * All SERP scrapers must extend this class and implement:
 * - scrape(keyword, options)
 * - extractResults(rawData)
 */

export class BaseScraper {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Scrape SERP for a keyword
   * @param {string} keyword - Keyword to search
   * @param {Object} options - Scraping options
   * @param {string} options.country - Country code (US, UK, DE, etc.)
   * @param {string} options.device - Device type (desktop, mobile)
   * @param {string} options.city - City name (optional)
   * @param {string} options.language - Language code (optional)
   * @returns {Promise<Array>} Array of SERP results
   */
  async scrape(keyword, options) {
    throw new Error('scrape() must be implemented by subclass');
  }

  /**
   * Extract and normalize results from API response
   * @param {*} rawData - Raw API response data
   * @returns {Array} Normalized results array
   */
  extractResults(rawData) {
    throw new Error('extractResults() must be implemented by subclass');
  }

  /**
   * Normalize a single SERP result
   * @param {Object} result - Raw result object
   * @param {number} index - Position index
   * @returns {Object} Normalized result
   */
  normalizeResult(result, index) {
    return {
      position: result.position || index + 1,
      title: result.title || '',
      url: result.url || result.link || '',
      snippet: result.snippet || result.description || '',
      domain: this.extractDomain(result.url || result.link || ''),
    };
  }

  /**
   * Extract domain from URL
   * @param {string} url - Full URL
   * @returns {string} Domain name
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (error) {
      return url;
    }
  }

  /**
   * Make HTTP request with error handling
   * @param {string} url - API endpoint
   * @param {Object} options - fetch options
   * @returns {Promise<Object>} API response
   */
  async makeRequest(url, options) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  }
}
