/**
 * SERP Scraper Registry
 *
 * All 9 SERP scrapers with automatic fallback support
 */

import { SerperScraper } from './serper.js';
import { SerpAPIScraper } from './serpapi.js';
import { ValueSERPScraper } from './valueserp.js';
import { SearchAPIScraper } from './searchapi.js';
import { SerplyScraper } from './serply.js';
import { ScrapingAntScraper } from './scrapingant.js';
import { ScrapingRobotScraper } from './scrapingrobot.js';
import { SpaceSERPScraper } from './spaceserp.js';
import { HasDataScraper } from './hasdata.js';

/**
 * Scraper Registry
 * Maps scraper type to scraper class
 */
export const scraperRegistry = {
  serper: SerperScraper,
  serpapi: SerpAPIScraper,
  valueserp: ValueSERPScraper,
  searchapi: SearchAPIScraper,
  serply: SerplyScraper,
  scrapingant: ScrapingAntScraper,
  scrapingrobot: ScrapingRobotScraper,
  spaceserp: SpaceSERPScraper,
  hasdata: HasDataScraper,
};

/**
 * Get scraper instance
 * @param {string} type - Scraper type
 * @param {string} apiKey - API key
 * @returns {BaseScraper} Scraper instance
 */
export function getScraper(type, apiKey) {
  const ScraperClass = scraperRegistry[type];
  if (!ScraperClass) {
    throw new Error(`Unknown scraper type: ${type}`);
  }
  return new ScraperClass(apiKey);
}

/**
 * List all available scrapers
 * @returns {Array<string>} Scraper type names
 */
export function listScrapers() {
  return Object.keys(scraperRegistry);
}

/**
 * Get scraper metadata
 * @param {string} type - Scraper type
 * @returns {Object} Scraper metadata
 */
export function getScraperMetadata(type) {
  const metadata = {
    serper: {
      name: 'Serper.dev',
      website: 'https://serper.dev',
      tier: 'primary',
      features: ['fast', 'reliable', 'accurate'],
    },
    serpapi: {
      name: 'SerpAPI',
      website: 'https://serpapi.com',
      tier: 'primary',
      features: ['comprehensive', 'reliable'],
    },
    valueserp: {
      name: 'ValueSERP',
      website: 'https://valueserp.com',
      tier: 'primary',
      features: ['affordable', 'reliable'],
    },
    searchapi: {
      name: 'SearchAPI',
      website: 'https://searchapi.io',
      tier: 'primary',
      features: ['fast', 'accurate'],
    },
    serply: {
      name: 'Serply',
      website: 'https://serply.io',
      tier: 'secondary',
      features: ['simple', 'lightweight'],
    },
    scrapingant: {
      name: 'ScrapingAnt',
      website: 'https://scrapingant.com',
      tier: 'secondary',
      features: ['proxy-rotation', 'javascript'],
    },
    scrapingrobot: {
      name: 'ScrapingRobot',
      website: 'https://scrapingrobot.com',
      tier: 'secondary',
      features: ['distributed', 'scalable'],
    },
    spaceserp: {
      name: 'SpaceSERP',
      website: 'https://spaceserp.com',
      tier: 'secondary',
      features: ['real-time', 'accurate'],
    },
    hasdata: {
      name: 'HasData',
      website: 'https://hasdata.com',
      tier: 'secondary',
      features: ['comprehensive', 'multi-engine'],
    },
  };

  return metadata[type] || { name: type, tier: 'unknown', features: [] };
}
