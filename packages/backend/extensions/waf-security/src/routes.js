/**
 * WAF Security API Routes - Pure JavaScript
 * All routes mounted at /api/ext/waf/
 */

import {
  detectWAF,
  testPayload,
  generateBypassVariants,
  selfAudit,
  getPayloadCategories,
  getPayloads,
} from './engine.js';
import { randomUUID } from 'crypto';

export async function registerWafRoutes(fastify) {
  /**
   * GET /api/ext/waf/payloads - List all payload categories
   */
  fastify.get('/payloads', {
    schema: {
      tags: ['WAF Security'],
      description: 'List all attack payload categories',
    },
  }, async (request, reply) => {
    const categories = getPayloadCategories();
    return { categories };
  });

  /**
   * POST /api/ext/waf/detect - Detect WAF on target URL
   */
  fastify.post('/detect', {
    schema: {
      tags: ['WAF Security'],
      description: 'Detect WAF presence and type',
      body: {
        type: 'object',
        properties: {
          url: { type: 'string' },
        },
        required: ['url'],
      },
    },
  }, async (request, reply) => {
    const { url } = request.body;

    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return reply.status(400).send({ error: 'Invalid URL' });
    }

    const detection = await detectWAF(url);
    return detection;
  });

  /**
   * POST /api/ext/waf/scan - Start a full WAF scan
   */
  fastify.post('/scan', {
    schema: {
      tags: ['WAF Security'],
      description: 'Start full WAF penetration test',
      body: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          categories: { type: 'array', items: { type: 'string' } },
          mode: { type: 'string', enum: ['quick', 'full'] },
        },
        required: ['url'],
      },
    },
  }, async (request, reply) => {
    const { url, categories, mode } = request.body;
    const scanId = randomUUID();
    const db = fastify.db || request.server.db;

    // Validate URL
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return reply.status(400).send({ error: 'Invalid URL' });
    }

    // Create scan record
    db.prepare(`
      INSERT INTO waf_scans (id, target_url, scan_type, status, started_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(scanId, url, url.includes('localhost') ? 'self' : 'external', 'running', new Date().toISOString());

    // Run scan in background
    runScanAsync(scanId, url, categories, mode, db).catch(err => {
      console.error('[WAF Scan] Error:', err);
      db.prepare('UPDATE waf_scans SET status = ?, ended_at = ? WHERE id = ?')
        .run('failed', new Date().toISOString(), scanId);
    });

    return { scanId, status: 'started' };
  });

  /**
   * GET /api/ext/waf/scan/:id - Get scan results
   */
  fastify.get('/scan/:id', {
    schema: {
      tags: ['WAF Security'],
      description: 'Get scan results by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const db = fastify.db || request.server.db;

    const scan = db.prepare('SELECT * FROM waf_scans WHERE id = ?').get(id);

    if (!scan) {
      return reply.status(404).send({ error: 'Scan not found' });
    }

    // Parse results JSON
    if (scan.results_json) {
      scan.results = JSON.parse(scan.results_json);
      delete scan.results_json;
    }

    return scan;
  });

  /**
   * GET /api/ext/waf/scans - List all scans
   */
  fastify.get('/scans', {
    schema: {
      tags: ['WAF Security'],
      description: 'List all WAF scans',
    },
  }, async (request, reply) => {
    const db = fastify.db || request.server.db;

    const scans = db.prepare(`
      SELECT id, target_url, scan_type, waf_detected, waf_type, waf_confidence,
             total_payloads, blocked_count, passed_count, bypass_rate,
             risk_level, status, started_at, ended_at, created_at
      FROM waf_scans
      ORDER BY created_at DESC
      LIMIT 50
    `).all();

    return { scans };
  });

  /**
   * DELETE /api/ext/waf/scans/:id - Delete a scan
   */
  fastify.delete('/scans/:id', {
    schema: {
      tags: ['WAF Security'],
      description: 'Delete a scan record',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const db = fastify.db || request.server.db;

    const result = db.prepare('DELETE FROM waf_scans WHERE id = ?').run(id);

    if (result.changes === 0) {
      return reply.status(404).send({ error: 'Scan not found' });
    }

    return { success: true };
  });

  /**
   * POST /api/ext/waf/self - Run self-audit
   */
  fastify.post('/self', {
    schema: {
      tags: ['WAF Security'],
      description: 'Self-audit Agent Player backend security',
    },
  }, async (request, reply) => {
    const backendUrl = process.env.BACKEND_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || '41522'}`;
    const audit = await selfAudit(backendUrl);

    return audit;
  });

  console.log('[WAF Routes] ✅ Registered');
}

/**
 * Run scan asynchronously in background
 */
async function runScanAsync(scanId, url, categories, mode, db) {
  const results = {
    detection: null,
    tests: [],
  };

  // Step 1: Detect WAF
  const detection = await detectWAF(url);
  results.detection = detection;

  // Step 2: Test payloads
  const categoriesToTest = categories || getPayloadCategories().map(c => c.id);
  const selectedCategories = mode === 'quick' ? categoriesToTest.slice(0, 2) : categoriesToTest;

  for (const category of selectedCategories) {
    const payloads = getPayloads(category);
    const payloadsToTest = mode === 'quick' ? payloads.slice(0, 2) : payloads;

    for (const payload of payloadsToTest) {
      const testResult = await testPayload(url, payload, category);
      results.tests.push(testResult);

      // Brief delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Step 3: Calculate metrics
  const totalPayloads = results.tests.length;
  const blockedCount = results.tests.filter(t => t.blocked).length;
  const passedCount = totalPayloads - blockedCount;
  const bypassRate = totalPayloads > 0 ? (passedCount / totalPayloads) * 100 : 0;

  // Determine risk level
  let riskLevel = 'low';
  if (bypassRate > 50) riskLevel = 'critical';
  else if (bypassRate > 30) riskLevel = 'high';
  else if (bypassRate > 10) riskLevel = 'medium';

  // Update scan record
  db.prepare(`
    UPDATE waf_scans SET
      waf_detected = ?,
      waf_type = ?,
      waf_confidence = ?,
      total_payloads = ?,
      blocked_count = ?,
      passed_count = ?,
      bypass_rate = ?,
      risk_level = ?,
      results_json = ?,
      status = ?,
      ended_at = ?
    WHERE id = ?
  `).run(
    detection.detected ? 1 : 0,
    detection.type,
    detection.confidence,
    totalPayloads,
    blockedCount,
    passedCount,
    bypassRate,
    riskLevel,
    JSON.stringify(results),
    'completed',
    new Date().toISOString(),
    scanId
  );

  console.log(`[WAF Scan] ✅ Completed: ${scanId}`);
}
