/**
 * Scraper Service
 *
 * Orchestrates SERP scraping with:
 * - Automatic fallback between 9 scrapers
 * - Credential integration (AES-256-GCM encrypted API keys)
 * - Position tracking and history management
 * - Notification system integration
 * - Job queue management
 */

import { randomBytes } from 'crypto';
import { scraperRegistry } from '../scrapers/index.js';

export class ScraperService {
  constructor(api) {
    this.api = api;
    this.db = api.db || api.getDatabase();
  }

  /**
   * Scrape a single keyword with automatic fallback
   * @param {string} keywordId - Keyword ID
   * @returns {Promise<Object>} Scrape result
   */
  async scrapeKeyword(keywordId) {
    const keyword = this.db.prepare('SELECT * FROM seo_keywords WHERE id = ?').get(keywordId);

    if (!keyword) {
      throw new Error(`Keyword not found: ${keywordId}`);
    }

    const domain = this.db.prepare('SELECT * FROM seo_domains WHERE id = ?').get(keyword.domain_id);

    if (!domain) {
      throw new Error(`Domain not found: ${keyword.domain_id}`);
    }

    // Mark as updating
    this.db.prepare('UPDATE seo_keywords SET updating = 1 WHERE id = ?').run(keywordId);

    // Get user settings (primary scraper + fallback chain)
    const settings = await this.getUserSettings(keyword.user_id);
    const scrapers = [settings.primary_scraper, ...JSON.parse(settings.fallback_scrapers)];

    let lastError;
    let jobId = randomBytes(16).toString('hex');

    for (const scraperType of scrapers) {
      try {
        // Get API key from credentials system
        const credentialName = `${scraperType}-api-key`;
        const apiKey = await this.getCredentialValue(credentialName, keyword.user_id);

        if (!apiKey) {
          this.api.log('debug', `[SEO] No credential found for ${scraperType}, skipping`);
          continue;
        }

        // Create scraper job
        this.db.prepare(`
          INSERT INTO seo_scraper_jobs (id, user_id, keyword_id, status, scraper_type, request_data, started_at)
          VALUES (?, ?, ?, 'running', ?, ?, datetime('now'))
        `).run(
          jobId,
          keyword.user_id,
          keywordId,
          scraperType,
          JSON.stringify({ keyword: keyword.keyword, country: keyword.country, device: keyword.device })
        );

        // Instantiate scraper
        const ScraperClass = scraperRegistry[scraperType];
        const scraper = new ScraperClass(apiKey);

        // Execute scrape
        const startTime = Date.now();
        const results = await scraper.scrape(keyword.keyword, {
          country: keyword.country,
          device: keyword.device,
          city: keyword.city,
          language: domain.language,
        });
        const duration = Date.now() - startTime;

        // Find user's position in results
        const userDomain = domain.domain.replace('www.', '');
        const yourResult = results.find(r => r.domain.includes(userDomain) || userDomain.includes(r.domain));
        const position = yourResult ? yourResult.position : 0;
        const url = yourResult?.url || null;

        // Update keyword with new position
        await this.updateKeywordPosition(keyword, position, url, results);

        // Update job as completed
        this.db.prepare(`
          UPDATE seo_scraper_jobs SET
            status = 'completed',
            response_data = ?,
            completed_at = datetime('now'),
            duration_ms = ?
          WHERE id = ?
        `).run(JSON.stringify({ results: results.slice(0, 20), position }), duration, jobId);

        // Send notification if position changed significantly
        await this.sendRankingNotification(keyword, position);

        this.api.log('info', `[SEO] Scraped "${keyword.keyword}" with ${scraperType}: Position ${position}`);

        return { position, url, results, scraper: scraperType, duration };
      } catch (error) {
        lastError = error;
        this.api.log('warn', `[SEO] Scraper ${scraperType} failed: ${error.message}`);

        // Update job as failed
        this.db.prepare(`
          UPDATE seo_scraper_jobs SET
            status = 'failed',
            error_message = ?,
            completed_at = datetime('now')
          WHERE id = ?
        `).run(error.message, jobId);

        // Create new job ID for next attempt
        jobId = randomBytes(16).toString('hex');
        continue; // Try next scraper
      }
    }

    // All scrapers failed
    this.db.prepare(`
      UPDATE seo_keywords SET
        updating = 0,
        last_update_error = ?
      WHERE id = ?
    `).run(lastError?.message || 'All scrapers failed', keywordId);

    throw new Error(`All scrapers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Update keyword position and history
   */
  async updateKeywordPosition(keyword, position, url, results) {
    const history = JSON.parse(keyword.history || '[]');
    const today = new Date().toISOString().split('T')[0];

    // Add to history (keep last 365 days)
    history.push({
      date: today,
      position,
      url: url || null,
    });

    const trimmedHistory = history.slice(-365);

    // Update keyword
    this.db.prepare(`
      UPDATE seo_keywords SET
        position = ?,
        url = ?,
        history = ?,
        last_result = ?,
        last_updated = datetime('now'),
        updating = 0,
        last_update_error = NULL
      WHERE id = ?
    `).run(
      position,
      url,
      JSON.stringify(trimmedHistory),
      JSON.stringify(results.slice(0, 20)),
      keyword.id
    );
  }

  /**
   * Send notification if position changed significantly
   */
  async sendRankingNotification(keyword, newPosition) {
    const oldPosition = keyword.position;

    if (oldPosition === 0) return; // First scrape, no notification

    const change = oldPosition - newPosition; // Positive = improvement

    // Import notification service
    const { notify } = await import('../../../../src/services/notification-service.js');

    if (change >= 3) {
      // Position improved by 3+ positions
      await notify({
        userId: keyword.user_id,
        title: 'Ranking Improved',
        body: `"${keyword.keyword}" moved from #${oldPosition} to #${newPosition} (up ${change})`,
        type: 'success',
        channel: 'in_app',
        actionUrl: `/dashboard/seo/keywords?highlight=${keyword.id}`,
        meta: {
          keyword: keyword.keyword,
          oldPosition,
          newPosition,
          change,
        },
      });
    } else if (change <= -5) {
      // Position dropped by 5+ positions
      await notify({
        userId: keyword.user_id,
        title: 'Ranking Dropped',
        body: `"${keyword.keyword}" fell from #${oldPosition} to #${newPosition} (down ${Math.abs(change)})`,
        type: 'warning',
        channel: 'in_app',
        actionUrl: `/dashboard/seo/keywords?highlight=${keyword.id}`,
        meta: {
          keyword: keyword.keyword,
          oldPosition,
          newPosition,
          change,
        },
      });
    } else if (oldPosition > 0 && oldPosition <= 100 && newPosition === 0) {
      // Lost ranking (fell out of top 100)
      await notify({
        userId: keyword.user_id,
        title: 'Lost Ranking',
        body: `"${keyword.keyword}" fell out of top 100 (was #${oldPosition})`,
        type: 'error',
        channel: 'in_app',
        actionUrl: `/dashboard/seo/keywords?highlight=${keyword.id}`,
        meta: {
          keyword: keyword.keyword,
          oldPosition,
          newPosition,
          change,
        },
      });
    }
  }

  /**
   * Get user SEO settings
   */
  async getUserSettings(userId) {
    let settings = this.db.prepare('SELECT * FROM seo_settings WHERE user_id = ?').get(userId);

    if (!settings) {
      // Create default settings
      const id = randomBytes(16).toString('hex');
      this.db.prepare(`
        INSERT INTO seo_settings (id, user_id)
        VALUES (?, ?)
      `).run(id, userId);

      settings = this.db.prepare('SELECT * FROM seo_settings WHERE user_id = ?').get(userId);
    }

    return settings;
  }

  /**
   * Get decrypted credential value
   */
  async getCredentialValue(name, userId) {
    try {
      const credential = this.db.prepare(`
        SELECT id, value FROM credentials WHERE name = ? AND user_id = ?
      `).get(name, userId);

      if (!credential) {
        return null;
      }

      // Decrypt using Extension API method if available
      if (this.api.getCredentialValue) {
        return await this.api.getCredentialValue(credential.id);
      }

      // Fallback: return encrypted value (will need manual decryption)
      return credential.value;
    } catch (error) {
      this.api.log('error', `[SEO] Failed to get credential ${name}: ${error.message}`);
      return null;
    }
  }

  /**
   * Scrape all keywords for a domain (batch operation)
   */
  async scrapeAllKeywords(domainId, userId) {
    const keywords = this.db.prepare(`
      SELECT id FROM seo_keywords
      WHERE domain_id = ? AND user_id = ? AND sticky = 1
      ORDER BY created_at DESC
    `).all(domainId, userId);

    const results = {
      total: keywords.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    for (const kw of keywords) {
      try {
        await this.scrapeKeyword(kw.id);
        results.succeeded++;

        // Delay between scrapes to avoid rate limits
        const settings = await this.getUserSettings(userId);
        await new Promise(resolve => setTimeout(resolve, settings.scrape_delay_ms || 1000));
      } catch (error) {
        results.failed++;
        results.errors.push({
          keywordId: kw.id,
          error: error.message,
        });
      }
    }

    // Send batch completion notification
    const { notify } = await import('../../../../src/services/notification-service.js');
    await notify({
      userId,
      title: 'Scraping Completed',
      body: `Scraped ${results.succeeded}/${results.total} keywords (${results.failed} failed)`,
      type: results.failed > 0 ? 'warning' : 'success',
      channel: 'in_app',
      actionUrl: '/dashboard/seo/keywords',
      meta: results,
    });

    return results;
  }
}
