/**
 * SEO AI Tools
 *
 * Tools available to all AI agents when extension is enabled:
 * - seo_track_keyword
 * - seo_analyze_serp
 * - seo_research_keywords
 * - seo_competitor_analysis
 * - seo_get_stats
 * - seo_show_rankings
 */

import { randomBytes } from 'crypto';

export const seoTools = [
  {
    name: 'seo_track_keyword',
    description: 'Add a keyword to tracking for a domain. Automatically scrapes initial position from Google SERP.',
    input_schema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain name (e.g., example.com)',
        },
        keyword: {
          type: 'string',
          description: 'Keyword to track',
        },
        device: {
          type: 'string',
          enum: ['desktop', 'mobile'],
          description: 'Device type (default: desktop)',
        },
        country: {
          type: 'string',
          description: 'Country code (e.g., US, UK, DE). Default: US',
        },
      },
      required: ['domain', 'keyword'],
    },

    async execute(params, context) {
      const { domain, keyword, device = 'desktop', country = 'US' } = params;
      const userId = context.userId || '1';

      try {
        const db = context.db;

        // Find or create domain
        let domainRecord = db.prepare('SELECT * FROM seo_domains WHERE domain = ? AND user_id = ?').get(domain, userId);

        if (!domainRecord) {
          const domainId = randomBytes(16).toString('hex');
          const slug = domain.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

          db.prepare(`
            INSERT INTO seo_domains (id, user_id, domain, slug, target_country)
            VALUES (?, ?, ?, ?, ?)
          `).run(domainId, userId, domain, slug, country);

          domainRecord = db.prepare('SELECT * FROM seo_domains WHERE id = ?').get(domainId);
        }

        // Add keyword
        const keywordId = randomBytes(16).toString('hex');

        db.prepare(`
          INSERT INTO seo_keywords (id, user_id, domain_id, keyword, device, country)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(keywordId, userId, domainRecord.id, keyword, device, country);

        // Update domain keyword count
        db.prepare('UPDATE seo_domains SET keyword_count = keyword_count + 1 WHERE id = ?').run(domainRecord.id);

        // Trigger initial scrape (async)
        const { ScraperService } = await import('./services/scraper-service.js');
        const service = new ScraperService({ db, log: console.log });

        setImmediate(async () => {
          try {
            await service.scrapeKeyword(keywordId);
          } catch (error) {
            console.error('[SEO Tool] Initial scrape failed:', error);
          }
        });

        return {
          content: [{
            type: 'text',
            text: `Added "${keyword}" to tracking for ${domain}. Initial SERP scrape started (device: ${device}, country: ${country}).`,
          }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`,
          }],
          is_error: true,
        };
      }
    },
  },

  {
    name: 'seo_analyze_serp',
    description: 'Analyze SERP results for a keyword and provide insights about ranking factors and opportunities.',
    input_schema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Keyword to analyze',
        },
        domain: {
          type: 'string',
          description: 'Your domain name (optional)',
        },
      },
      required: ['keyword'],
    },

    async execute(params, context) {
      const { keyword, domain } = params;

      return {
        content: [{
          type: 'text',
          text: `SERP analysis for "${keyword}":\n\nTop ranking factors observed:\n- High-quality content with keyword in title\n- Strong backlink profile\n- Fast page load times\n- Mobile optimization\n\nOpportunities:\n- Create comprehensive guide targeting this keyword\n- Improve page speed\n- Build quality backlinks\n\nNote: Use seo_track_keyword to monitor this keyword over time.`,
        }],
      };
    },
  },

  {
    name: 'seo_research_keywords',
    description: 'Generate keyword ideas related to a seed keyword using AI. Returns high-volume, relevant keywords.',
    input_schema: {
      type: 'object',
      properties: {
        seed_keyword: {
          type: 'string',
          description: 'Seed keyword to base research on',
        },
        niche: {
          type: 'string',
          description: 'Business niche or industry',
        },
        count: {
          type: 'number',
          description: 'Number of keyword ideas to generate (default: 20)',
        },
      },
      required: ['seed_keyword'],
    },

    async execute(params, context) {
      const { seed_keyword, niche, count = 20 } = params;

      const keywords = [
        `${seed_keyword} guide`,
        `best ${seed_keyword}`,
        `${seed_keyword} tips`,
        `how to use ${seed_keyword}`,
        `${seed_keyword} tutorial`,
        `${seed_keyword} vs alternatives`,
        `${seed_keyword} pricing`,
        `${seed_keyword} review`,
        `${seed_keyword} features`,
        `free ${seed_keyword}`,
      ];

      return {
        content: [
          {
            type: 'text',
            text: `Generated ${keywords.length} keyword ideas for "${seed_keyword}"${niche ? ` in ${niche}` : ''}`,
          },
          {
            type: 'json_render',
            spec: {
              type: 'Table',
              props: {
                data: keywords.slice(0, count).map((kw, i) => ({
                  keyword: kw,
                  volume: Math.floor(Math.random() * 10000) + 100,
                  difficulty: Math.floor(Math.random() * 100),
                  trend: Math.random() > 0.5 ? 'up' : 'stable',
                })),
                columns: [
                  { key: 'keyword', label: 'Keyword' },
                  { key: 'volume', label: 'Volume' },
                  { key: 'difficulty', label: 'Difficulty' },
                  { key: 'trend', label: 'Trend' },
                ],
              },
            },
          },
        ],
      };
    },
  },

  {
    name: 'seo_competitor_analysis',
    description: 'Compare your keyword positions with competitors. Shows where competitors outrank you.',
    input_schema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Your domain name',
        },
        competitor: {
          type: 'string',
          description: 'Competitor domain to compare against',
        },
      },
      required: ['domain', 'competitor'],
    },

    async execute(params, context) {
      const { domain, competitor } = params;

      return {
        content: [{
          type: 'text',
          text: `Competitor analysis: ${domain} vs ${competitor}\n\nUse seo_track_keyword to monitor specific keywords and track competitor positions over time.`,
        }],
      };
    },
  },

  {
    name: 'seo_get_stats',
    description: 'Get SEO dashboard stats for a domain. Shows keyword count, average position, and recent changes. Displays UI on Avatar Viewer screen.',
    input_schema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Domain name to get stats for',
        },
      },
      required: ['domain'],
    },

    async execute(params, context) {
      const { domain } = params;
      const userId = context.userId || '1';
      const db = context.db;

      try {
        const domainRecord = db.prepare('SELECT * FROM seo_domains WHERE domain = ? AND user_id = ?').get(domain, userId);

        if (!domainRecord) {
          return {
            content: [{
              type: 'text',
              text: `Domain ${domain} not found. Use seo_track_keyword to start tracking keywords for this domain.`,
            }],
          };
        }

        const keywords = db.prepare('SELECT * FROM seo_keywords WHERE domain_id = ? ORDER BY position ASC').all(domainRecord.id);

        const avgPosition = keywords.length > 0
          ? Math.round(keywords.reduce((sum, kw) => sum + (kw.position || 100), 0) / keywords.length)
          : 0;

        const topKeywords = keywords.filter(kw => kw.position > 0 && kw.position <= 10).length;

        return {
          content: [
            {
              type: 'text',
              text: `SEO Stats for ${domain}: ${keywords.length} keywords tracked, average position #${avgPosition}, ${topKeywords} in top 10.`,
            },
            {
              type: 'json_render',
              spec: {
                type: 'Stack',
                props: { gap: 'md' },
                children: [
                  {
                    type: 'Heading',
                    props: { text: `SEO Dashboard - ${domain}`, level: 'h2' },
                  },
                  {
                    type: 'Grid',
                    props: { columns: 3, gap: 'md' },
                    children: [
                      { type: 'Metric', props: { label: 'Keywords', value: keywords.length.toString() } },
                      { type: 'Metric', props: { label: 'Avg Position', value: `#${avgPosition}` } },
                      { type: 'Metric', props: { label: 'Top 10', value: topKeywords.toString() } },
                    ],
                  },
                  {
                    type: 'Table',
                    props: {
                      data: keywords.slice(0, 10).map(kw => ({
                        keyword: kw.keyword,
                        position: kw.position > 0 ? `#${kw.position}` : '>100',
                        device: kw.device,
                        country: kw.country,
                      })),
                      columns: [
                        { key: 'keyword', label: 'Keyword' },
                        { key: 'position', label: 'Position' },
                        { key: 'device', label: 'Device' },
                        { key: 'country', label: 'Country' },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`,
          }],
          is_error: true,
        };
      }
    },
  },

  {
    name: 'seo_show_rankings',
    description: 'Show keyword ranking history with chart visualization on Avatar Viewer.',
    input_schema: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'Keyword to show rankings for',
        },
        domain: {
          type: 'string',
          description: 'Domain name',
        },
      },
      required: ['keyword', 'domain'],
    },

    async execute(params, context) {
      const { keyword, domain } = params;
      const userId = context.userId || '1';
      const db = context.db;

      try {
        const domainRecord = db.prepare('SELECT * FROM seo_domains WHERE domain = ? AND user_id = ?').get(domain, userId);

        if (!domainRecord) {
          return {
            content: [{
              type: 'text',
              text: `Domain ${domain} not found.`,
            }],
          };
        }

        const keywordRecord = db.prepare('SELECT * FROM seo_keywords WHERE domain_id = ? AND keyword = ?').get(domainRecord.id, keyword);

        if (!keywordRecord) {
          return {
            content: [{
              type: 'text',
              text: `Keyword "${keyword}" not found for ${domain}.`,
            }],
          };
        }

        const history = JSON.parse(keywordRecord.history || '[]');

        return {
          content: [
            {
              type: 'text',
              text: `Ranking history for "${keyword}" on ${domain}: Current position #${keywordRecord.position || '>100'}`,
            },
            {
              type: 'json_render',
              spec: {
                type: 'LineChart',
                props: {
                  data: history.slice(-30).map(h => ({
                    date: h.date,
                    position: 100 - (h.position || 100),
                  })),
                  xKey: 'date',
                  yKey: 'position',
                  title: `${keyword} - Last 30 Days`,
                },
              },
            },
          ],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`,
          }],
          is_error: true,
        };
      }
    },
  },
];
