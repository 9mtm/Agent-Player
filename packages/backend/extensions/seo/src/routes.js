/**
 * SEO Extension API Routes
 *
 * All routes under /api/ext/seo/* prefix
 */

import { randomBytes } from 'crypto';
import { ScraperService } from './services/scraper-service.js';

/**
 * Get user ID from JWT token in request
 */
function getUserIdFromRequest(request) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    throw new Error('No authorization token');
  }

  // Decode JWT (simplified - production should verify signature)
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  return payload.userId || payload.sub || '1';
}

/**
 * Register all SEO routes
 */
export async function registerSeoRoutes(fastify) {
  const db = () => fastify.db || fastify.server.db;

  // ===================
  // DOMAINS
  // ===================

  // List domains
  fastify.get('/domains', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);

      const domains = db().prepare(`
        SELECT * FROM seo_domains
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(userId);

      return { domains };
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Create domain
  fastify.post('/domains', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { domain, business_name, niche, language, target_country } = request.body;

      if (!domain) {
        return reply.code(400).send({ error: 'Domain is required' });
      }

      const id = randomBytes(16).toString('hex');
      const slug = domain.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

      db().prepare(`
        INSERT INTO seo_domains (id, user_id, domain, slug, business_name, niche, language, target_country)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, domain, slug, business_name, niche, language || 'en-US', target_country || 'US');

      const newDomain = db().prepare('SELECT * FROM seo_domains WHERE id = ?').get(id);

      return { domain: newDomain };
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Update domain
  fastify.put('/domains/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params;
      const updates = request.body;

      // Verify ownership
      const domain = db().prepare('SELECT * FROM seo_domains WHERE id = ? AND user_id = ?').get(id, userId);

      if (!domain) {
        return reply.code(404).send({ error: 'Domain not found' });
      }

      // Build update query dynamically
      const allowedFields = ['business_name', 'niche', 'language', 'target_country', 'notification', 'notification_interval', 'notification_emails', 'wordpress_url', 'gsc_site_url'];
      const setClause = [];
      const values = [];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          setClause.push(`${field} = ?`);
          values.push(updates[field]);
        }
      }

      if (setClause.length > 0) {
        values.push(id, userId);
        db().prepare(`
          UPDATE seo_domains SET ${setClause.join(', ')}, updated_at = datetime('now')
          WHERE id = ? AND user_id = ?
        `).run(...values);
      }

      const updated = db().prepare('SELECT * FROM seo_domains WHERE id = ?').get(id);

      return { domain: updated };
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Delete domain
  fastify.delete('/domains/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params;

      // Verify ownership
      const domain = db().prepare('SELECT * FROM seo_domains WHERE id = ? AND user_id = ?').get(id, userId);

      if (!domain) {
        return reply.code(404).send({ error: 'Domain not found' });
      }

      // Delete domain (cascade will delete keywords)
      db().prepare('DELETE FROM seo_domains WHERE id = ?').run(id);

      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // ===================
  // KEYWORDS
  // ===================

  // List keywords
  fastify.get('/keywords', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { domain_id, device, country, tag, sticky } = request.query;

      let query = 'SELECT * FROM seo_keywords WHERE user_id = ?';
      const params = [userId];

      if (domain_id) {
        query += ' AND domain_id = ?';
        params.push(domain_id);
      }

      if (device) {
        query += ' AND device = ?';
        params.push(device);
      }

      if (country) {
        query += ' AND country = ?';
        params.push(country);
      }

      if (sticky !== undefined) {
        query += ' AND sticky = ?';
        params.push(sticky ? 1 : 0);
      }

      query += ' ORDER BY position ASC, created_at DESC';

      const keywords = db().prepare(query).all(...params);

      return { keywords };
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Add keyword
  fastify.post('/keywords', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { domain_id, keyword, device, country, city } = request.body;

      if (!domain_id || !keyword) {
        return reply.code(400).send({ error: 'domain_id and keyword are required' });
      }

      // Verify domain ownership
      const domain = db().prepare('SELECT * FROM seo_domains WHERE id = ? AND user_id = ?').get(domain_id, userId);

      if (!domain) {
        return reply.code(404).send({ error: 'Domain not found' });
      }

      const id = randomBytes(16).toString('hex');

      db().prepare(`
        INSERT INTO seo_keywords (id, user_id, domain_id, keyword, device, country, city)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, domain_id, keyword, device || 'desktop', country || domain.target_country, city);

      // Update domain keyword count
      db().prepare(`
        UPDATE seo_domains SET keyword_count = keyword_count + 1 WHERE id = ?
      `).run(domain_id);

      const newKeyword = db().prepare('SELECT * FROM seo_keywords WHERE id = ?').get(id);

      return { keyword: newKeyword };
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Update keyword
  fastify.put('/keywords/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params;
      const { sticky, tags } = request.body;

      const keyword = db().prepare('SELECT * FROM seo_keywords WHERE id = ? AND user_id = ?').get(id, userId);

      if (!keyword) {
        return reply.code(404).send({ error: 'Keyword not found' });
      }

      if (sticky !== undefined) {
        db().prepare('UPDATE seo_keywords SET sticky = ? WHERE id = ?').run(sticky ? 1 : 0, id);
      }

      if (tags !== undefined) {
        db().prepare('UPDATE seo_keywords SET tags = ? WHERE id = ?').run(JSON.stringify(tags), id);
      }

      const updated = db().prepare('SELECT * FROM seo_keywords WHERE id = ?').get(id);

      return { keyword: updated };
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Delete keyword
  fastify.delete('/keywords/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params;

      const keyword = db().prepare('SELECT * FROM seo_keywords WHERE id = ? AND user_id = ?').get(id, userId);

      if (!keyword) {
        return reply.code(404).send({ error: 'Keyword not found' });
      }

      db().prepare('DELETE FROM seo_keywords WHERE id = ?').run(id);

      // Update domain keyword count
      db().prepare(`
        UPDATE seo_domains SET keyword_count = keyword_count - 1 WHERE id = ?
      `).run(keyword.domain_id);

      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // ===================
  // SCRAPING
  // ===================

  // Scrape single keyword
  fastify.post('/scrape/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params;

      const keyword = db().prepare('SELECT * FROM seo_keywords WHERE id = ? AND user_id = ?').get(id, userId);

      if (!keyword) {
        return reply.code(404).send({ error: 'Keyword not found' });
      }

      // Run scrape in background (don't wait)
      const service = new ScraperService(fastify.extensionApi || { db: db(), log: console.log });

      setImmediate(async () => {
        try {
          await service.scrapeKeyword(id);
        } catch (error) {
          console.error('[SEO] Scrape failed:', error);
        }
      });

      return { status: 'started', message: 'Scraping initiated' };
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Scrape all keywords for a domain
  fastify.post('/scrape-all', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { domain_id } = request.body;

      if (!domain_id) {
        return reply.code(400).send({ error: 'domain_id is required' });
      }

      const domain = db().prepare('SELECT * FROM seo_domains WHERE id = ? AND user_id = ?').get(domain_id, userId);

      if (!domain) {
        return reply.code(404).send({ error: 'Domain not found' });
      }

      // Run batch scrape in background
      const service = new ScraperService(fastify.extensionApi || { db: db(), log: console.log });

      setImmediate(async () => {
        try {
          await service.scrapeAllKeywords(domain_id, userId);
        } catch (error) {
          console.error('[SEO] Batch scrape failed:', error);
        }
      });

      return { status: 'started', message: 'Batch scraping initiated' };
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // List scraper jobs
  fastify.get('/jobs', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { status, limit = 50 } = request.query;

      let query = 'SELECT * FROM seo_scraper_jobs WHERE user_id = ?';
      const params = [userId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(parseInt(limit));

      const jobs = db().prepare(query).all(...params);

      return { jobs };
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // ===================
  // SETTINGS
  // ===================

  // Get settings
  fastify.get('/settings', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);

      let settings = db().prepare('SELECT * FROM seo_settings WHERE user_id = ?').get(userId);

      if (!settings) {
        const id = randomBytes(16).toString('hex');
        db().prepare('INSERT INTO seo_settings (id, user_id) VALUES (?, ?)').run(id, userId);
        settings = db().prepare('SELECT * FROM seo_settings WHERE user_id = ?').get(userId);
      }

      return { settings };
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Update settings
  fastify.put('/settings', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const updates = request.body;

      let settings = db().prepare('SELECT * FROM seo_settings WHERE user_id = ?').get(userId);

      if (!settings) {
        const id = randomBytes(16).toString('hex');
        db().prepare('INSERT INTO seo_settings (id, user_id) VALUES (?, ?)').run(id, userId);
      }

      const allowedFields = ['primary_scraper', 'fallback_scrapers', 'scrape_interval', 'enable_notifications', 'notification_channels', 'notify_on_improvement', 'notify_on_drop', 'notify_threshold'];
      const setClause = [];
      const values = [];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          setClause.push(`${field} = ?`);
          values.push(typeof updates[field] === 'object' ? JSON.stringify(updates[field]) : updates[field]);
        }
      }

      if (setClause.length > 0) {
        values.push(userId);
        db().prepare(`
          UPDATE seo_settings SET ${setClause.join(', ')}, updated_at = datetime('now')
          WHERE user_id = ?
        `).run(...values);
      }

      const updated = db().prepare('SELECT * FROM seo_settings WHERE user_id = ?').get(userId);

      return { settings: updated };
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });
}
