/**
 * Trading Extension - API Routes
 *
 * 25 endpoints covering:
 * - Account Management (5 routes)
 * - Portfolio & Positions (3 routes)
 * - Orders (3 routes)
 * - Market Data (2 routes)
 * - Watchlist (3 routes)
 * - Strategies (5 routes)
 * - Signals (3 routes)
 * - Activity Log (1 route)
 */

import {
  createAlpacaClient,
  getAccountInfo,
  getPositions,
  getOrders,
  placeOrder,
  cancelOrder,
  getLatestQuote,
  getHistoricalBars,
  testCredentials,
  createRealtimeConnection,
} from './alpaca-client.js';
import { randomBytes } from 'crypto';
import { getCredentialManager } from '../../../src/credentials/index.js';

/**
 * Get user ID from request headers
 * @param {Request} request - Hono request object
 * @returns {string} User ID
 */
function getUserId(request) {
  // Fastify request object
  return request.headers['x-user-id'] || '1'; // Fallback for development
}

/**
 * Register all trading routes
 * @param {FastifyInstance} fastify - Fastify instance
 */
export async function registerTradingRoutes(fastify) {
  const db = fastify.db;
  const credentialManager = getCredentialManager();

  // ============================================================================
  // ACCOUNT MANAGEMENT
  // ============================================================================

  /**
   * GET /api/ext/trading/accounts
   * List user's trading accounts
   */
  fastify.get('/accounts', async (request, reply) => {
    try {
      const userId = getUserId(request);

      const accounts = db
        .prepare(
          `
        SELECT
          id, user_id, platform, account_name, account_mode,
          is_active, is_default, alpaca_account_id, account_status,
          account_blocked, trade_suspended_by_user, allow_autonomous_trading,
          created_at, updated_at, last_synced_at
        FROM trading_accounts
        WHERE user_id = ?
        ORDER BY is_default DESC, created_at DESC
      `
        )
        .all(userId);

      return reply.send({ accounts });
    } catch (error) {
      console.error('[Trading]', `Failed to fetch accounts: ${error.message}`);
      return reply.send({ error: 'Failed to fetch accounts' }, 500);
    }
  });

  /**
   * POST /api/ext/trading/accounts
   * Connect new trading account
   * Body: { platform, account_name, account_mode, api_key, api_secret }
   */
  fastify.post('/accounts', async (request, reply) => {
    try {
      const userId = getUserId(request);
      console.log('[Trading DEBUG] userId:', userId, 'type:', typeof userId);
      const { platform, account_name, account_mode, api_key, api_secret } =
        request.body;

      // Validate inputs
      if (!platform || !account_name || !account_mode || !api_key || !api_secret) {
        return reply.send({ error: 'Missing required fields' }, 400);
      }

      if (!['paper', 'live'].includes(account_mode)) {
        return reply.send({ error: 'Invalid account_mode (must be paper or live)' }, 400);
      }

      // Test credentials first
      console.log('[Trading]', `Testing ${platform} credentials for ${account_name}...`);
      const testResult = await testCredentials(api_key, api_secret, account_mode);

      if (!testResult.success) {
        return reply.send({ error: `Invalid credentials: ${testResult.error}` }, 400);
      }

      // Encrypt API credentials
      console.log('[Trading DEBUG] About to encrypt - api_key:', api_key ? 'EXISTS' : 'UNDEFINED', 'api_secret:', api_secret ? 'EXISTS' : 'UNDEFINED');
      const { id: keyCredentialId } = await credentialManager.create({
        userId,
        name: `${platform}_api_key_${Date.now()}`,
        value: api_key,
        type: 'trading_api_key'
      });

      const { id: secretCredentialId } = await credentialManager.create({
        userId,
        name: `${platform}_api_secret_${Date.now()}`,
        value: api_secret,
        type: 'trading_api_secret'
      });

      // Insert account
      const accountId = randomBytes(16).toString('hex');
      const now = new Date().toISOString();

      // Check if this is the user's first account (make it default)
      const existingAccountsCount = db.prepare('SELECT COUNT(*) as count FROM trading_accounts WHERE user_id = ?').get(userId).count;
      const isDefault = existingAccountsCount === 0 ? 1 : 0;

      db.prepare(
        `
        INSERT INTO trading_accounts (
          id, user_id, platform, account_name, account_mode,
          api_key_credential_id, api_secret_credential_id,
          is_active, is_default, alpaca_account_id, account_status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
      `
      ).run(
        accountId,
        userId,
        platform,
        account_name,
        account_mode,
        keyCredentialId,
        secretCredentialId,
        isDefault,
        testResult.account_id,
        testResult.status,
        now,
        now
      );

      console.log('[Trading]', `✅ Trading account connected: ${account_name} (${account_mode})`);

      return reply.send({
        success: true,
        account: {
          id: accountId,
          platform,
          account_name,
          account_mode,
          alpaca_account_id: testResult.account_id,
          status: testResult.status,
        },
      });
    } catch (error) {
      console.error('[Trading]', `Failed to connect account: ${error.message}`);
      return reply.send({ error: 'Failed to connect account' }, 500);
    }
  });

  /**
   * POST /api/ext/trading/accounts/:id/activate
   * Set account as active (default)
   */
  fastify.post('/accounts/:id/activate', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const accountId = request.params('id');

      // Verify ownership
      const account = db
        .prepare('SELECT id FROM trading_accounts WHERE id = ? AND user_id = ?')
        .get(accountId, userId);

      if (!account) {
        return reply.send({ error: 'Account not found' }, 404);
      }

      // Deactivate all other accounts
      db.prepare('UPDATE trading_accounts SET is_default = 0 WHERE user_id = ?').run(
        userId
      );

      // Activate this account
      db.prepare('UPDATE trading_accounts SET is_default = 1, is_active = 1 WHERE id = ?').run(
        accountId
      );

      console.log('[Trading]', `Account activated: ${accountId}`);

      return reply.send({ success: true });
    } catch (error) {
      console.error('[Trading]', `Failed to activate account: ${error.message}`);
      return reply.send({ error: 'Failed to activate account' }, 500);
    }
  });

  /**
   * PUT /api/ext/trading/accounts/:id
   * Update account settings
   * Body: { account_name?, allow_autonomous_trading? }
   */
  fastify.put('/accounts/:id', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const accountId = request.params('id');
      const { account_name, allow_autonomous_trading } = request.body;

      // Verify ownership
      const account = db
        .prepare('SELECT id FROM trading_accounts WHERE id = ? AND user_id = ?')
        .get(accountId, userId);

      if (!account) {
        return reply.send({ error: 'Account not found' }, 404);
      }

      const updates = [];
      const params = [];

      if (account_name !== undefined) {
        updates.push('account_name = ?');
        params.push(account_name);
      }

      if (allow_autonomous_trading !== undefined) {
        updates.push('allow_autonomous_trading = ?');
        params.push(allow_autonomous_trading ? 1 : 0);
      }

      if (updates.length === 0) {
        return reply.send({ error: 'No fields to update' }, 400);
      }

      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(accountId);

      db.prepare(
        `UPDATE trading_accounts SET ${updates.join(', ')} WHERE id = ?`
      ).run(...params);

      console.log('[Trading]', `Account updated: ${accountId}`);

      return reply.send({ success: true });
    } catch (error) {
      console.error('[Trading]', `Failed to update account: ${error.message}`);
      return reply.send({ error: 'Failed to update account' }, 500);
    }
  });

  /**
   * DELETE /api/ext/trading/accounts/:id
   * Remove trading account
   */
  fastify.delete('/accounts/:id', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const accountId = request.params('id');

      // Verify ownership
      const account = db
        .prepare(
          'SELECT api_key_credential_id, api_secret_credential_id FROM trading_accounts WHERE id = ? AND user_id = ?'
        )
        .get(accountId, userId);

      if (!account) {
        return reply.send({ error: 'Account not found' }, 404);
      }

      // Delete credentials
      await credentialManager.delete(account.api_key_credential_id);
      await credentialManager.delete(account.api_secret_credential_id);

      // Delete account (cascade will delete positions, orders, etc.)
      db.prepare('DELETE FROM trading_accounts WHERE id = ?').run(accountId);

      console.log('[Trading]', `Account deleted: ${accountId}`);

      return reply.send({ success: true });
    } catch (error) {
      console.error('[Trading]', `Failed to delete account: ${error.message}`);
      return reply.send({ error: 'Failed to delete account' }, 500);
    }
  });

  // ============================================================================
  // PORTFOLIO & POSITIONS
  // ============================================================================

  /**
   * GET /api/ext/trading/portfolio
   * Get current portfolio snapshot
   */
  fastify.get('/portfolio', async (request, reply) => {
    try {
      const userId = getUserId(request);

      // Get active account
      const account = db
        .prepare(
          `
        SELECT id, platform, account_mode, api_key_credential_id, api_secret_credential_id
        FROM trading_accounts
        WHERE user_id = ? AND is_default = 1 AND is_active = 1
        LIMIT 1
      `
        )
        .get(userId);

      if (!account) {
        return reply.send({ error: 'No active trading account found' }, 404);
      }

      // Decrypt credentials
      const apiKey = await credentialManager.getValue(account.api_key_credential_id);
      const apiSecret = await credentialManager.getValue(account.api_secret_credential_id);

      // Fetch from Alpaca
      const alpaca = createAlpacaClient(apiKey, apiSecret, account.account_mode);
      const accountInfo = await getAccountInfo(alpaca);

      // Save snapshot
      const snapshotId = randomBytes(16).toString('hex');
      db.prepare(
        `
        INSERT INTO trading_portfolio_snapshots (
          id, trading_account_id, cash, portfolio_value, equity, buying_power,
          snapshot_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        snapshotId,
        account.id,
        accountInfo.cash,
        accountInfo.portfolio_value,
        accountInfo.equity,
        accountInfo.buying_power,
        new Date().toISOString()
      );

      return reply.send({ portfolio: accountInfo, account_id: account.id });
    } catch (error) {
      console.error('[Trading]', `Failed to fetch portfolio: ${error.message}`);
      return reply.send({ error: 'Failed to fetch portfolio' }, 500);
    }
  });

  /**
   * GET /api/ext/trading/positions
   * Get current holdings
   */
  fastify.get('/positions', async (request, reply) => {
    try {
      const userId = getUserId(request);

      // Get active account
      const account = db
        .prepare(
          `
        SELECT id, platform, account_mode, api_key_credential_id, api_secret_credential_id
        FROM trading_accounts
        WHERE user_id = ? AND is_default = 1 AND is_active = 1
        LIMIT 1
      `
        )
        .get(userId);

      if (!account) {
        return reply.send({ error: 'No active trading account found' }, 404);
      }

      // Decrypt credentials
      const apiKey = await credentialManager.getValue(account.api_key_credential_id);
      const apiSecret = await credentialManager.getValue(account.api_secret_credential_id);

      // Fetch from Alpaca
      const alpaca = createAlpacaClient(apiKey, apiSecret, account.account_mode);
      const positions = await getPositions(alpaca);

      return reply.send({ positions, account_id: account.id });
    } catch (error) {
      console.error('[Trading]', `Failed to fetch positions: ${error.message}`);
      return reply.send({ error: 'Failed to fetch positions' }, 500);
    }
  });

  /**
   * POST /api/ext/trading/sync
   * Manually sync portfolio data
   */
  fastify.post('/sync', async (request, reply) => {
    try {
      const userId = getUserId(request);

      // Get active account
      const account = db
        .prepare(
          `
        SELECT id, platform, account_mode, api_key_credential_id, api_secret_credential_id
        FROM trading_accounts
        WHERE user_id = ? AND is_default = 1 AND is_active = 1
        LIMIT 1
      `
        )
        .get(userId);

      if (!account) {
        return reply.send({ error: 'No active trading account found' }, 404);
      }

      // Decrypt credentials
      const apiKey = await credentialManager.getValue(account.api_key_credential_id);
      const apiSecret = await credentialManager.getValue(account.api_secret_credential_id);

      // Fetch from Alpaca
      const alpaca = createAlpacaClient(apiKey, apiSecret, account.account_mode);
      const accountInfo = await getAccountInfo(alpaca);
      const positions = await getPositions(alpaca);

      // Save portfolio snapshot
      const snapshotId = randomBytes(16).toString('hex');
      const now = new Date().toISOString();

      db.prepare(
        `
        INSERT INTO trading_portfolio_snapshots (
          id, trading_account_id, cash, portfolio_value, equity, buying_power,
          snapshot_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        snapshotId,
        account.id,
        accountInfo.cash,
        accountInfo.portfolio_value,
        accountInfo.equity,
        accountInfo.buying_power,
        now
      );

      // Clear old positions
      db.prepare('DELETE FROM trading_positions WHERE trading_account_id = ?').run(
        account.id
      );

      // Insert new positions
      for (const pos of positions) {
        const posId = randomBytes(16).toString('hex');
        db.prepare(
          `
          INSERT INTO trading_positions (
            id, trading_account_id, symbol, asset_class, qty, avg_entry_price,
            current_price, market_value, unrealized_pl, unrealized_plpc, side, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
          posId,
          account.id,
          pos.symbol,
          pos.asset_class,
          pos.qty,
          pos.avg_entry_price,
          pos.current_price,
          pos.market_value,
          pos.unrealized_pl,
          pos.unrealized_plpc,
          pos.side,
          now
        );
      }

      // Update last_synced_at
      db.prepare(
        'UPDATE trading_accounts SET last_synced_at = ? WHERE id = ?'
      ).run(now, account.id);

      console.log('[Trading]', `Portfolio synced: ${account.id}`);

      return reply.send({ success: true, synced_at: now });
    } catch (error) {
      console.error('[Trading]', `Failed to sync portfolio: ${error.message}`);
      return reply.send({ error: 'Failed to sync portfolio' }, 500);
    }
  });

  // ============================================================================
  // ORDERS
  // ============================================================================

  /**
   * GET /api/ext/trading/orders
   * Get order history
   * Query params: status=all|open|closed, limit=50
   */
  fastify.get('/orders', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const status = request.query('status') || 'all';
      const limit = parseInt(request.query('limit') || '50', 10);

      // Get active account
      const account = db
        .prepare(
          `
        SELECT id, platform, account_mode, api_key_credential_id, api_secret_credential_id
        FROM trading_accounts
        WHERE user_id = ? AND is_default = 1 AND is_active = 1
        LIMIT 1
      `
        )
        .get(userId);

      if (!account) {
        return reply.send({ error: 'No active trading account found' }, 404);
      }

      // Decrypt credentials
      const apiKey = await credentialManager.getValue(account.api_key_credential_id);
      const apiSecret = await credentialManager.getValue(account.api_secret_credential_id);

      // Fetch from Alpaca
      const alpaca = createAlpacaClient(apiKey, apiSecret, account.account_mode);
      const orders = await getOrders(alpaca, status, limit);

      return reply.send({ orders, account_id: account.id });
    } catch (error) {
      console.error('[Trading]', `Failed to fetch orders: ${error.message}`);
      return reply.send({ error: 'Failed to fetch orders' }, 500);
    }
  });

  /**
   * POST /api/ext/trading/orders
   * Place new order
   * Body: { symbol, qty, side, order_type?, time_in_force?, limit_price?, stop_price?, placed_by? }
   */
  fastify.post('/orders', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const {
        symbol,
        qty,
        side,
        order_type = 'market',
        time_in_force = 'day',
        limit_price,
        stop_price,
        placed_by = 'user',
      } = request.body;

      // Validate inputs
      if (!symbol || !qty || !side) {
        return reply.send({ error: 'Missing required fields: symbol, qty, side' }, 400);
      }

      if (!['buy', 'sell'].includes(side)) {
        return reply.send({ error: 'Invalid side (must be buy or sell)' }, 400);
      }

      if (qty <= 0) {
        return reply.send({ error: 'Quantity must be greater than 0' }, 400);
      }

      // Get active account
      const account = db
        .prepare(
          `
        SELECT id, platform, account_mode, api_key_credential_id, api_secret_credential_id
        FROM trading_accounts
        WHERE user_id = ? AND is_default = 1 AND is_active = 1
        LIMIT 1
      `
        )
        .get(userId);

      if (!account) {
        return reply.send({ error: 'No active trading account found' }, 404);
      }

      // Decrypt credentials
      const apiKey = await credentialManager.getValue(account.api_key_credential_id);
      const apiSecret = await credentialManager.getValue(account.api_secret_credential_id);

      // Place order via Alpaca
      const alpaca = createAlpacaClient(apiKey, apiSecret, account.account_mode);
      const order = await placeOrder(alpaca, {
        symbol,
        qty,
        side,
        order_type,
        time_in_force,
        limit_price,
        stop_price,
      });

      // Save to database
      const orderId = randomBytes(16).toString('hex');
      const now = new Date().toISOString();

      db.prepare(
        `
        INSERT INTO trading_orders (
          id, trading_account_id, alpaca_order_id, symbol, asset_class, qty, side,
          order_type, time_in_force, limit_price, stop_price, status, placed_by,
          submitted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        orderId,
        account.id,
        order.id,
        order.symbol,
        order.asset_class,
        order.qty,
        order.side,
        order.order_type,
        time_in_force,
        limit_price || null,
        stop_price || null,
        order.status,
        placed_by,
        order.submitted_at,
        now,
        now
      );

      // Log activity
      const activityId = randomBytes(16).toString('hex');
      db.prepare(
        `
        INSERT INTO trading_activity_log (
          id, trading_account_id, action, details, triggered_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `
      ).run(
        activityId,
        account.id,
        'order_placed',
        JSON.stringify({ symbol, qty, side, order_type, order_id: order.id }),
        placed_by,
        now
      );

      api.log(
        'info',
        `Order placed: ${side.toUpperCase()} ${qty} ${symbol} @ ${order_type} (${account.account_mode})`
      );

      return reply.send({ success: true, order });
    } catch (error) {
      console.error('[Trading]', `Failed to place order: ${error.message}`);
      return reply.send({ error: `Failed to place order: ${error.message}` }, 500);
    }
  });

  /**
   * DELETE /api/ext/trading/orders/:orderId
   * Cancel pending order
   */
  fastify.delete('/orders/:orderId', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const orderId = request.params('orderId');

      // Get order
      const order = db
        .prepare(
          `
        SELECT o.alpaca_order_id, o.trading_account_id, a.api_key_credential_id, a.api_secret_credential_id, a.account_mode
        FROM trading_orders o
        JOIN trading_accounts a ON o.trading_account_id = a.id
        WHERE o.id = ? AND a.user_id = ?
      `
        )
        .get(orderId, userId);

      if (!order) {
        return reply.send({ error: 'Order not found' }, 404);
      }

      // Decrypt credentials
      const apiKey = await credentialManager.getValue(order.api_key_credential_id);
      const apiSecret = await credentialManager.getValue(order.api_secret_credential_id);

      // Cancel via Alpaca
      const alpaca = createAlpacaClient(apiKey, apiSecret, order.account_mode);
      await cancelOrder(alpaca, order.alpaca_order_id);

      // Update database
      const now = new Date().toISOString();
      db.prepare(
        `
        UPDATE trading_orders
        SET status = 'canceled', canceled_at = ?, updated_at = ?
        WHERE id = ?
      `
      ).run(now, now, orderId);

      console.log('[Trading]', `Order canceled: ${orderId}`);

      return reply.send({ success: true });
    } catch (error) {
      console.error('[Trading]', `Failed to cancel order: ${error.message}`);
      return reply.send({ error: 'Failed to cancel order' }, 500);
    }
  });

  // ============================================================================
  // MARKET DATA
  // ============================================================================

  /**
   * GET /api/ext/trading/quote/:symbol
   * Get real-time stock quote
   */
  fastify.get('/quote/:symbol', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const symbol = request.params('symbol');

      // Get active account
      const account = db
        .prepare(
          `
        SELECT id, platform, account_mode, api_key_credential_id, api_secret_credential_id
        FROM trading_accounts
        WHERE user_id = ? AND is_default = 1 AND is_active = 1
        LIMIT 1
      `
        )
        .get(userId);

      if (!account) {
        return reply.send({ error: 'No active trading account found' }, 404);
      }

      // Decrypt credentials
      const apiKey = await credentialManager.getValue(account.api_key_credential_id);
      const apiSecret = await credentialManager.getValue(account.api_secret_credential_id);

      // Fetch from Alpaca
      const alpaca = createAlpacaClient(apiKey, apiSecret, account.account_mode);
      const quote = await getLatestQuote(alpaca, symbol);

      return reply.send({ quote });
    } catch (error) {
      console.error('[Trading]', `Failed to fetch quote: ${error.message}`);
      return reply.send({ error: 'Failed to fetch quote' }, 500);
    }
  });

  /**
   * GET /api/ext/trading/bars/:symbol
   * Get historical price data for charts
   * Query params: timeframe=1Day, limit=100, start?, end?
   */
  fastify.get('/bars/:symbol', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const symbol = request.params('symbol');
      const timeframe = request.query('timeframe') || '1Day';
      const limit = parseInt(request.query('limit') || '100', 10);
      const start = request.query('start');
      const end = request.query('end');

      // Get active account
      const account = db
        .prepare(
          `
        SELECT id, platform, account_mode, api_key_credential_id, api_secret_credential_id
        FROM trading_accounts
        WHERE user_id = ? AND is_default = 1 AND is_active = 1
        LIMIT 1
      `
        )
        .get(userId);

      if (!account) {
        return reply.send({ error: 'No active trading account found' }, 404);
      }

      // Decrypt credentials
      const apiKey = await credentialManager.getValue(account.api_key_credential_id);
      const apiSecret = await credentialManager.getValue(account.api_secret_credential_id);

      // Fetch from Alpaca
      const alpaca = createAlpacaClient(apiKey, apiSecret, account.account_mode);
      const bars = await getHistoricalBars(alpaca, symbol, timeframe, {
        start,
        end,
        limit,
      });

      return reply.send({ bars, symbol, timeframe });
    } catch (error) {
      console.error('[Trading]', `Failed to fetch bars: ${error.message}`);
      return reply.send({ error: 'Failed to fetch bars' }, 500);
    }
  });

  /**
   * GET /api/ext/trading/assets/search
   * Search for stocks by symbol or name
   * Query params: query (search term)
   */
  fastify.get('/assets/search', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const query = request.query.query || '';

      if (!query || query.length < 1) {
        return reply.send({ assets: [] });
      }

      // Get active account
      const account = db
        .prepare(
          `
        SELECT id, platform, account_mode, api_key_credential_id, api_secret_credential_id
        FROM trading_accounts
        WHERE user_id = ? AND is_default = 1 AND is_active = 1
        LIMIT 1
      `
        )
        .get(userId);

      if (!account) {
        return reply.send({ error: 'No active trading account found' }, 404);
      }

      // Decrypt credentials
      const apiKey = await credentialManager.getValue(account.api_key_credential_id);
      const apiSecret = await credentialManager.getValue(account.api_secret_credential_id);

      // Create Alpaca client
      const alpaca = createAlpacaClient(apiKey, apiSecret, account.account_mode);

      // Search assets via Alpaca API
      // GET /v2/assets?status=active&asset_class=us_equity
      const searchQuery = query.toUpperCase();
      const assets = await alpaca.getAssets({
        status: 'active',
        asset_class: 'us_equity,crypto',
      });

      // Filter results by symbol or name
      const filtered = assets
        .filter((asset) => {
          const symbolMatch = asset.symbol.includes(searchQuery);
          const nameMatch = asset.name?.toUpperCase().includes(searchQuery);
          return symbolMatch || nameMatch;
        })
        .slice(0, 10); // Limit to 10 results

      return reply.send({
        assets: filtered.map((asset) => ({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          exchange: asset.exchange,
          asset_class: asset.class,
          tradable: asset.tradable,
          marginable: asset.marginable,
        }))
      });
    } catch (error) {
      console.error('[Trading]', `Failed to search assets: ${error.message}`);
      return reply.send({ error: 'Failed to search assets' }, 500);
    }
  });

  // ============================================================================
  // WATCHLIST
  // ============================================================================

  /**
   * GET /api/ext/trading/watchlist
   * Get user's watchlist
   */
  fastify.get('/watchlist', async (request, reply) => {
    try {
      const userId = getUserId(request);

      const watchlist = db
        .prepare(
          `
        SELECT id, symbol, asset_class, name, notes, display_order, created_at
        FROM trading_watchlist
        WHERE user_id = ?
        ORDER BY display_order ASC, created_at DESC
      `
        )
        .all(userId);

      return reply.send({ watchlist });
    } catch (error) {
      console.error('[Trading]', `Failed to fetch watchlist: ${error.message}`);
      return reply.send({ error: 'Failed to fetch watchlist' }, 500);
    }
  });

  /**
   * POST /api/ext/trading/watchlist
   * Add symbol to watchlist
   * Body: { symbol, asset_class?, name?, notes? }
   */
  fastify.post('/watchlist', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const { symbol, asset_class = 'us_equity', name, notes } = request.body;

      if (!symbol) {
        return reply.send({ error: 'Symbol is required' }, 400);
      }

      // Check if already exists
      const existing = db
        .prepare('SELECT id FROM trading_watchlist WHERE user_id = ? AND symbol = ?')
        .get(userId, symbol);

      if (existing) {
        return reply.send({ error: 'Symbol already in watchlist' }, 400);
      }

      // Insert
      const id = randomBytes(16).toString('hex');
      const now = new Date().toISOString();

      db.prepare(
        `
        INSERT INTO trading_watchlist (
          id, user_id, symbol, asset_class, name, notes, display_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `
      ).run(id, userId, symbol, asset_class, name || null, notes || null, now);

      console.log('[Trading]', `Added to watchlist: ${symbol}`);

      return reply.send({ success: true, id });
    } catch (error) {
      console.error('[Trading]', `Failed to add to watchlist: ${error.message}`);
      return reply.send({ error: 'Failed to add to watchlist' }, 500);
    }
  });

  /**
   * DELETE /api/ext/trading/watchlist/:symbol
   * Remove from watchlist
   */
  fastify.delete('/watchlist/:symbol', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const symbol = request.params('symbol');

      db.prepare('DELETE FROM trading_watchlist WHERE user_id = ? AND symbol = ?').run(
        userId,
        symbol
      );

      console.log('[Trading]', `Removed from watchlist: ${symbol}`);

      return reply.send({ success: true });
    } catch (error) {
      console.error('[Trading]', `Failed to remove from watchlist: ${error.message}`);
      return reply.send({ error: 'Failed to remove from watchlist' }, 500);
    }
  });

  // ============================================================================
  // STRATEGIES (AI Trading)
  // ============================================================================

  /**
   * GET /api/ext/trading/strategies
   * List trading strategies
   */
  fastify.get('/strategies', async (request, reply) => {
    try {
      const userId = getUserId(request);

      const strategies = db
        .prepare(
          `
        SELECT
          s.id, s.trading_account_id, s.strategy_name, s.strategy_type,
          s.execution_mode, s.status, s.symbols, s.asset_classes,
          s.max_position_size, s.max_daily_trades, s.stop_loss_percent,
          s.take_profit_percent, s.config, s.total_trades, s.winning_trades,
          s.losing_trades, s.total_profit_loss, s.win_rate,
          s.created_at, s.updated_at, s.started_at, s.stopped_at, s.last_run_at,
          a.account_name, a.account_mode
        FROM trading_strategies s
        JOIN trading_accounts a ON s.trading_account_id = a.id
        WHERE a.user_id = ?
        ORDER BY s.created_at DESC
      `
        )
        .all(userId);

      // Parse JSON fields
      for (const s of strategies) {
        s.symbols = JSON.parse(s.symbols || '[]');
        s.asset_classes = JSON.parse(s.asset_classes || '[]');
        s.config = JSON.parse(s.config || '{}');
      }

      return reply.send({ strategies });
    } catch (error) {
      console.error('[Trading]', `Failed to fetch strategies: ${error.message}`);
      return reply.send({ error: 'Failed to fetch strategies' }, 500);
    }
  });

  /**
   * POST /api/ext/trading/strategies
   * Create new trading strategy
   * Body: { trading_account_id, strategy_name, strategy_type, execution_mode, symbols, config?, risk_management? }
   */
  fastify.post('/strategies', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const {
        trading_account_id,
        strategy_name,
        strategy_type,
        execution_mode,
        symbols,
        asset_classes = ['us_equity'],
        config = {},
        max_position_size,
        max_daily_trades = 10,
        stop_loss_percent,
        take_profit_percent,
      } = request.body;

      // Validate
      if (!trading_account_id || !strategy_name || !strategy_type || !execution_mode) {
        return reply.send({ error: 'Missing required fields' }, 400);
      }

      if (!['manual', 'semi_auto', 'full_auto'].includes(execution_mode)) {
        return reply.send({ error: 'Invalid execution_mode' }, 400);
      }

      if (!symbols || symbols.length === 0) {
        return reply.send({ error: 'At least one symbol is required' }, 400);
      }

      // Verify account ownership
      const account = db
        .prepare('SELECT id FROM trading_accounts WHERE id = ? AND user_id = ?')
        .get(trading_account_id, userId);

      if (!account) {
        return reply.send({ error: 'Account not found' }, 404);
      }

      // Insert strategy
      const id = randomBytes(16).toString('hex');
      const now = new Date().toISOString();

      db.prepare(
        `
        INSERT INTO trading_strategies (
          id, trading_account_id, strategy_name, strategy_type, execution_mode,
          status, symbols, asset_classes, max_position_size, max_daily_trades,
          stop_loss_percent, take_profit_percent, config, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'stopped', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        id,
        trading_account_id,
        strategy_name,
        strategy_type,
        execution_mode,
        JSON.stringify(symbols),
        JSON.stringify(asset_classes),
        max_position_size || null,
        max_daily_trades,
        stop_loss_percent || null,
        take_profit_percent || null,
        JSON.stringify(config),
        now,
        now
      );

      console.log('[Trading]', `Strategy created: ${strategy_name} (${strategy_type})`);

      return reply.send({ success: true, id });
    } catch (error) {
      console.error('[Trading]', `Failed to create strategy: ${error.message}`);
      return reply.send({ error: 'Failed to create strategy' }, 500);
    }
  });

  /**
   * PUT /api/ext/trading/strategies/:id
   * Update strategy
   * Body: { strategy_name?, symbols?, config?, execution_mode?, risk_management? }
   */
  fastify.put('/strategies/:id', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const strategyId = request.params('id');
      const body = request.body;

      // Verify ownership
      const strategy = db
        .prepare(
          `
        SELECT s.id
        FROM trading_strategies s
        JOIN trading_accounts a ON s.trading_account_id = a.id
        WHERE s.id = ? AND a.user_id = ?
      `
        )
        .get(strategyId, userId);

      if (!strategy) {
        return reply.send({ error: 'Strategy not found' }, 404);
      }

      const updates = [];
      const params = [];

      const fields = [
        'strategy_name',
        'execution_mode',
        'max_position_size',
        'max_daily_trades',
        'stop_loss_percent',
        'take_profit_percent',
      ];

      for (const field of fields) {
        if (body[field] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(body[field]);
        }
      }

      if (body.symbols !== undefined) {
        updates.push('symbols = ?');
        params.push(JSON.stringify(body.symbols));
      }

      if (body.asset_classes !== undefined) {
        updates.push('asset_classes = ?');
        params.push(JSON.stringify(body.asset_classes));
      }

      if (body.config !== undefined) {
        updates.push('config = ?');
        params.push(JSON.stringify(body.config));
      }

      if (updates.length === 0) {
        return reply.send({ error: 'No fields to update' }, 400);
      }

      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(strategyId);

      db.prepare(
        `UPDATE trading_strategies SET ${updates.join(', ')} WHERE id = ?`
      ).run(...params);

      console.log('[Trading]', `Strategy updated: ${strategyId}`);

      return reply.send({ success: true });
    } catch (error) {
      console.error('[Trading]', `Failed to update strategy: ${error.message}`);
      return reply.send({ error: 'Failed to update strategy' }, 500);
    }
  });

  /**
   * DELETE /api/ext/trading/strategies/:id
   * Delete strategy
   */
  fastify.delete('/strategies/:id', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const strategyId = request.params('id');

      // Verify ownership
      const strategy = db
        .prepare(
          `
        SELECT s.id
        FROM trading_strategies s
        JOIN trading_accounts a ON s.trading_account_id = a.id
        WHERE s.id = ? AND a.user_id = ?
      `
        )
        .get(strategyId, userId);

      if (!strategy) {
        return reply.send({ error: 'Strategy not found' }, 404);
      }

      // Delete (cascade will delete signals, performance, etc.)
      db.prepare('DELETE FROM trading_strategies WHERE id = ?').run(strategyId);

      console.log('[Trading]', `Strategy deleted: ${strategyId}`);

      return reply.send({ success: true });
    } catch (error) {
      console.error('[Trading]', `Failed to delete strategy: ${error.message}`);
      return reply.send({ error: 'Failed to delete strategy' }, 500);
    }
  });

  /**
   * POST /api/ext/trading/strategies/:id/start
   * Start strategy execution
   */
  fastify.post('/strategies/:id/start', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const strategyId = request.params('id');

      // Verify ownership
      const strategy = db
        .prepare(
          `
        SELECT s.id, s.execution_mode, a.allow_autonomous_trading
        FROM trading_strategies s
        JOIN trading_accounts a ON s.trading_account_id = a.id
        WHERE s.id = ? AND a.user_id = ?
      `
        )
        .get(strategyId, userId);

      if (!strategy) {
        return reply.send({ error: 'Strategy not found' }, 404);
      }

      // Check if autonomous trading is allowed
      if (
        strategy.execution_mode === 'full_auto' &&
        !strategy.allow_autonomous_trading
      ) {
        return reply.send(
          {
            error:
              'Autonomous trading not enabled for this account. Enable it in account settings first.',
          },
          403
        );
      }

      const now = new Date().toISOString();

      db.prepare(
        `
        UPDATE trading_strategies
        SET status = 'active', started_at = ?, updated_at = ?
        WHERE id = ?
      `
      ).run(now, now, strategyId);

      console.log('[Trading]', `Strategy started: ${strategyId}`);

      return reply.send({ success: true });
    } catch (error) {
      console.error('[Trading]', `Failed to start strategy: ${error.message}`);
      return reply.send({ error: 'Failed to start strategy' }, 500);
    }
  });

  /**
   * POST /api/ext/trading/strategies/:id/stop
   * Stop strategy execution
   */
  fastify.post('/strategies/:id/stop', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const strategyId = request.params('id');

      // Verify ownership
      const strategy = db
        .prepare(
          `
        SELECT s.id
        FROM trading_strategies s
        JOIN trading_accounts a ON s.trading_account_id = a.id
        WHERE s.id = ? AND a.user_id = ?
      `
        )
        .get(strategyId, userId);

      if (!strategy) {
        return reply.send({ error: 'Strategy not found' }, 404);
      }

      const now = new Date().toISOString();

      db.prepare(
        `
        UPDATE trading_strategies
        SET status = 'stopped', stopped_at = ?, updated_at = ?
        WHERE id = ?
      `
      ).run(now, now, strategyId);

      console.log('[Trading]', `Strategy stopped: ${strategyId}`);

      return reply.send({ success: true });
    } catch (error) {
      console.error('[Trading]', `Failed to stop strategy: ${error.message}`);
      return reply.send({ error: 'Failed to stop strategy' }, 500);
    }
  });

  // ============================================================================
  // SIGNALS (Trading Signals for Semi-Auto / Full-Auto)
  // ============================================================================

  /**
   * GET /api/ext/trading/signals
   * Get pending trading signals
   * Query params: status=pending|approved|rejected|executed
   */
  fastify.get('/signals', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const status = request.query('status') || 'pending';

      const signals = db
        .prepare(
          `
        SELECT
          sig.id, sig.strategy_id, sig.symbol, sig.asset_class, sig.signal_type,
          sig.current_price, sig.target_price, sig.stop_loss_price, sig.confidence,
          sig.reason, sig.analysis_data, sig.recommended_qty, sig.recommended_order_type,
          sig.status, sig.requires_approval, sig.created_at, sig.expires_at,
          strat.strategy_name, strat.execution_mode,
          acc.account_name, acc.account_mode
        FROM trading_signals sig
        JOIN trading_strategies strat ON sig.strategy_id = strat.id
        JOIN trading_accounts acc ON sig.trading_account_id = acc.id
        WHERE acc.user_id = ? AND sig.status = ?
        ORDER BY sig.created_at DESC
        LIMIT 50
      `
        )
        .all(userId, status);

      // Parse JSON fields
      for (const sig of signals) {
        sig.analysis_data = JSON.parse(sig.analysis_data || '{}');
      }

      return reply.send({ signals });
    } catch (error) {
      console.error('[Trading]', `Failed to fetch signals: ${error.message}`);
      return reply.send({ error: 'Failed to fetch signals' }, 500);
    }
  });

  /**
   * POST /api/ext/trading/signals/:id/execute
   * Execute a trading signal (approve and place order)
   */
  fastify.post('/signals/:id/execute', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const signalId = request.params('id');

      // Get signal
      const signal = db
        .prepare(
          `
        SELECT
          sig.*, acc.id as account_id, acc.api_key_credential_id, acc.api_secret_credential_id, acc.account_mode
        FROM trading_signals sig
        JOIN trading_accounts acc ON sig.trading_account_id = acc.id
        WHERE sig.id = ? AND acc.user_id = ?
      `
        )
        .get(signalId, userId);

      if (!signal) {
        return reply.send({ error: 'Signal not found' }, 404);
      }

      if (signal.status !== 'pending') {
        return reply.send({ error: `Signal already ${signal.status}` }, 400);
      }

      // Decrypt credentials
      const apiKey = await credentialManager.getValue(signal.api_key_credential_id);
      const apiSecret = await credentialManager.getValue(signal.api_secret_credential_id);

      // Place order via Alpaca
      const alpaca = createAlpacaClient(apiKey, apiSecret, signal.account_mode);
      const order = await placeOrder(alpaca, {
        symbol: signal.symbol,
        qty: signal.recommended_qty,
        side: signal.signal_type === 'buy' ? 'buy' : 'sell',
        order_type: signal.recommended_order_type,
      });

      // Save order to database
      const orderId = randomBytes(16).toString('hex');
      const now = new Date().toISOString();

      db.prepare(
        `
        INSERT INTO trading_orders (
          id, trading_account_id, alpaca_order_id, symbol, asset_class, qty, side,
          order_type, time_in_force, status, placed_by, strategy_id,
          submitted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'day', ?, 'agent', ?, ?, ?, ?)
      `
      ).run(
        orderId,
        signal.account_id,
        order.id,
        order.symbol,
        order.asset_class,
        order.qty,
        order.side,
        order.order_type,
        order.status,
        signal.strategy_id,
        order.submitted_at,
        now,
        now
      );

      // Update signal status
      db.prepare(
        `
        UPDATE trading_signals
        SET status = 'executed', order_id = ?, executed_price = ?, executed_qty = ?,
            approved_by = ?, approved_at = ?, executed_at = ?
        WHERE id = ?
      `
      ).run(
        orderId,
        signal.current_price,
        signal.recommended_qty,
        userId,
        now,
        now,
        signalId
      );

      console.log('[Trading]', `Signal executed: ${signalId} → Order ${orderId}`);

      return reply.send({ success: true, order_id: orderId });
    } catch (error) {
      console.error('[Trading]', `Failed to execute signal: ${error.message}`);

      // Mark signal as failed
      db.prepare(
        `
        UPDATE trading_signals
        SET status = 'failed', execution_error = ?
        WHERE id = ?
      `
      ).run(error.message, signalId);

      return reply.send({ error: `Failed to execute signal: ${error.message}` }, 500);
    }
  });

  /**
   * POST /api/ext/trading/signals/:id/reject
   * Reject a trading signal
   * Body: { reason? }
   */
  fastify.post('/signals/:id/reject', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const signalId = request.params('id');
      const { reason } = request.body;

      // Verify ownership
      const signal = db
        .prepare(
          `
        SELECT sig.id
        FROM trading_signals sig
        JOIN trading_accounts acc ON sig.trading_account_id = acc.id
        WHERE sig.id = ? AND acc.user_id = ?
      `
        )
        .get(signalId, userId);

      if (!signal) {
        return reply.send({ error: 'Signal not found' }, 404);
      }

      const now = new Date().toISOString();

      db.prepare(
        `
        UPDATE trading_signals
        SET status = 'rejected', rejected_at = ?, rejection_reason = ?
        WHERE id = ?
      `
      ).run(now, reason || 'User rejected', signalId);

      console.log('[Trading]', `Signal rejected: ${signalId}`);

      return reply.send({ success: true });
    } catch (error) {
      console.error('[Trading]', `Failed to reject signal: ${error.message}`);
      return reply.send({ error: 'Failed to reject signal' }, 500);
    }
  });

  // ============================================================================
  // ACTIVITY LOG
  // ============================================================================

  /**
   * GET /api/ext/trading/activity
   * Get trading activity log
   * Query params: limit=50
   */
  fastify.get('/activity', async (request, reply) => {
    try {
      const userId = getUserId(request);
      const limit = parseInt(request.query('limit') || '50', 10);

      const activity = db
        .prepare(
          `
        SELECT
          log.id, log.action, log.details, log.triggered_by, log.created_at,
          acc.account_name, acc.account_mode
        FROM trading_activity_log log
        JOIN trading_accounts acc ON log.trading_account_id = acc.id
        WHERE acc.user_id = ?
        ORDER BY log.created_at DESC
        LIMIT ?
      `
        )
        .all(userId, limit);

      // Parse JSON details
      for (const a of activity) {
        a.details = JSON.parse(a.details || '{}');
      }

      return reply.send({ activity });
    } catch (error) {
      console.error('[Trading]', `Failed to fetch activity log: ${error.message}`);
      return reply.send({ error: 'Failed to fetch activity log' }, 500);
    }
  });

  // ============================================================================
  // REAL-TIME WEBSOCKET STREAM (SSE)
  // ============================================================================

  /**
   * GET /api/ext/trading/stream?token=xxx
   * Server-Sent Events endpoint for real-time price updates
   * Subscribes to WebSocket updates for positions + watchlist symbols
   * Note: Uses query parameter for token since EventSource doesn't support custom headers
   */
  fastify.get('/stream', async (request, reply) => {
    try {
      // Get user ID from header (fallback to query token if needed)
      let userId = request.headers['x-user-id'];

      // If no x-user-id, try to extract from token query parameter
      if (!userId && request.query.token) {
        // For development: fallback to '1' if token is present but can't be validated
        // In production, you'd verify JWT token here
        userId = '1'; // TEMPORARY: In production, verify JWT and extract user_id
      }

      if (!userId) {
        reply.code(401);
        return reply.send({ error: 'Unauthorized' });
      }

      // Get active account
      const account = db
        .prepare(
          `
        SELECT
          ta.id, ta.api_key_credential_id, ta.api_secret_credential_id, ta.account_mode
        FROM trading_accounts ta
        WHERE ta.user_id = ? AND ta.is_active = 1 AND ta.is_default = 1
        LIMIT 1
      `
        )
        .get(userId);

      if (!account) {
        reply.code(404);
        return reply.send({ error: 'No active trading account found' });
      }

      // Decrypt API keys
      const apiKey = await credentialManager.getValue(account.api_key_credential_id);
      const apiSecret = await credentialManager.getValue(account.api_secret_credential_id);

      if (!apiKey || !apiSecret) {
        reply.code(500);
        return reply.send({ error: 'Failed to decrypt API credentials' });
      }

      // Get symbols to subscribe to
      const positions = db
        .prepare('SELECT DISTINCT symbol FROM trading_positions WHERE trading_account_id = ?')
        .all(account.id);

      const watchlist = db
        .prepare('SELECT DISTINCT symbol FROM trading_watchlist WHERE trading_account_id = ?')
        .all(account.id);

      const symbols = [
        ...positions.map(p => p.symbol),
        ...watchlist.map(w => w.symbol)
      ];

      if (symbols.length === 0) {
        reply.code(400);
        return reply.send({ error: 'No symbols to stream (add positions or watchlist symbols)' });
      }

      console.log(`[Trading WebSocket] Starting stream for ${symbols.length} symbols:`, symbols.join(', '));

      // Set up SSE headers
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');

      // Create WebSocket connection
      const wsConnection = createRealtimeConnection(
        apiKey,
        apiSecret,
        symbols,
        (update) => {
          // Send SSE event to frontend
          reply.raw.write(`data: ${JSON.stringify(update)}\n\n`);
        }
      );

      // Send initial connection event
      reply.raw.write(`data: ${JSON.stringify({ type: 'connected', symbols })}\n\n`);

      // Handle client disconnect
      request.raw.on('close', () => {
        console.log('[Trading WebSocket] Client disconnected, closing WebSocket');
        wsConnection.close();
      });

    } catch (error) {
      console.error('[Trading WebSocket]', `Stream error: ${error.message}`);
      reply.code(500);
      return reply.send({ error: 'Failed to start real-time stream' });
    }
  });

  console.log('[Trading] ✅ 26 trading routes registered (including WebSocket stream)');
}
