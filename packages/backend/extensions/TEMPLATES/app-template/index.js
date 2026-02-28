/**
 * App Extension Template
 * Full-featured extension with routes, database, and frontend
 */

export default async function initialize(api) {
  console.log('[My App] ✅ Extension loaded');

  // Get configuration
  const config = api.getConfig();
  const apiKey = config?.api_key;
  const enabled = config?.enabled ?? true;

  if (!enabled) {
    console.log('[My App] ⚠️ Extension disabled in settings');
    return;
  }

  // ==================== Routes ====================

  /**
   * GET /api/ext/my-app/status
   * Health check endpoint
   */
  api.registerRoute('GET', '/api/ext/my-app/status', async (request, reply) => {
    return {
      success: true,
      status: 'running',
      version: '1.0.0',
    };
  });

  /**
   * GET /api/ext/my-app/items
   * List all items from database
   */
  api.registerRoute('GET', '/api/ext/my-app/items', async (request, reply) => {
    const items = api.db
      .prepare('SELECT * FROM my_app_items ORDER BY created_at DESC LIMIT 50')
      .all();

    return { success: true, items };
  });

  /**
   * POST /api/ext/my-app/items
   * Create a new item
   */
  api.registerRoute('POST', '/api/ext/my-app/items', async (request, reply) => {
    const { name, data } = request.body;

    if (!name) {
      reply.code(400);
      return { success: false, error: 'Name is required' };
    }

    const id = api.generateId();
    api.db
      .prepare(
        `
      INSERT INTO my_app_items (id, name, data)
      VALUES (?, ?, ?)
    `
      )
      .run(id, name, data || null);

    const item = api.db.prepare('SELECT * FROM my_app_items WHERE id = ?').get(id);

    return { success: true, item };
  });

  /**
   * DELETE /api/ext/my-app/items/:id
   * Delete an item
   */
  api.registerRoute('DELETE', '/api/ext/my-app/items/:id', async (request, reply) => {
    const { id } = request.params;

    const result = api.db.prepare('DELETE FROM my_app_items WHERE id = ?').run(id);

    if (result.changes === 0) {
      reply.code(404);
      return { success: false, error: 'Item not found' };
    }

    return { success: true };
  });

  // ==================== Storage ====================

  /**
   * Example: Save a file using storage API
   */
  async function saveExampleFile() {
    const fileId = await api.storage.save('example.txt', 'Hello from My App!');
    console.log('[My App] Saved file:', fileId);

    const url = api.storage.getUrl(fileId);
    console.log('[My App] File URL:', url);
  }

  // ==================== Cron Jobs ====================

  /**
   * Example: Run a task every hour
   */
  api.registerCronJob('0 * * * *', async () => {
    console.log('[My App] Hourly task running');

    // Example: Cleanup old items
    const result = api.db
      .prepare(
        `
      DELETE FROM my_app_items
      WHERE created_at < datetime('now', '-30 days')
    `
      )
      .run();

    if (result.changes > 0) {
      console.log(`[My App] Cleaned up ${result.changes} old items`);
    }
  });

  // ==================== AI Tools ====================

  /**
   * Example: Register a tool for AI agents
   */
  api.registerTool({
    name: 'my_app_create_item',
    description: 'Create a new item in My App',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Item name' },
        data: { type: 'string', description: 'Additional data (optional)' },
      },
      required: ['name'],
    },
    execute: async (input) => {
      const id = api.generateId();
      api.db
        .prepare(
          `
        INSERT INTO my_app_items (id, name, data)
        VALUES (?, ?, ?)
      `
        )
        .run(id, input.name, input.data || null);

      return {
        success: true,
        message: `Created item "${input.name}" with ID ${id}`,
        id,
      };
    },
  });
}
