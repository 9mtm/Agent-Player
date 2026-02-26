/**
 * Alpaca API Client Wrapper
 *
 * Handles authentication, API calls, and error handling for Alpaca trading API
 * Supports: Paper Trading, Live Trading, Stocks, Crypto, Real-time data
 */

import Alpaca from '@alpacahq/alpaca-trade-api';

/**
 * Create Alpaca client instance
 * @param {string} apiKey - Alpaca API key
 * @param {string} apiSecret - Alpaca API secret
 * @param {string} mode - 'paper' or 'live'
 * @returns {Alpaca} Alpaca client instance
 */
export function createAlpacaClient(apiKey, apiSecret, mode = 'paper') {
  const isPaper = mode === 'paper';
  const baseUrl = isPaper
    ? 'https://paper-api.alpaca.markets'
    : 'https://api.alpaca.markets';

  const dataUrl = isPaper
    ? 'https://data.alpaca.markets'
    : 'https://data.alpaca.markets';

  return new Alpaca({
    keyId: apiKey,
    secretKey: apiSecret,
    paper: isPaper,
    baseUrl: baseUrl,
    dataBaseUrl: dataUrl,
    feed: 'iex', // IEX for stocks, use 'sip' for crypto
  });
}

/**
 * Get account information
 * @param {Alpaca} alpaca - Alpaca client instance
 * @returns {Promise<Object>} Account information
 */
export async function getAccountInfo(alpaca) {
  try {
    const account = await alpaca.getAccount();
    return {
      id: account.id,
      status: account.status,
      cash: parseFloat(account.cash),
      portfolio_value: parseFloat(account.portfolio_value),
      equity: parseFloat(account.equity),
      buying_power: parseFloat(account.buying_power),
      account_blocked: account.account_blocked,
      trade_suspended_by_user: account.trade_suspended_by_user,
      trading_blocked: account.trading_blocked,
      transfers_blocked: account.transfers_blocked,
    };
  } catch (error) {
    console.error('[Alpaca] Failed to get account info:', error);
    throw new Error(`Alpaca API error: ${error.message}`);
  }
}

/**
 * Get all positions
 * @param {Alpaca} alpaca - Alpaca client instance
 * @returns {Promise<Array>} List of positions
 */
export async function getPositions(alpaca) {
  try {
    const positions = await alpaca.getPositions();
    return positions.map(pos => ({
      symbol: pos.symbol,
      asset_class: pos.asset_class,
      qty: parseFloat(pos.qty),
      avg_entry_price: parseFloat(pos.avg_entry_price),
      current_price: parseFloat(pos.current_price),
      market_value: parseFloat(pos.market_value),
      unrealized_pl: parseFloat(pos.unrealized_pl),
      unrealized_plpc: parseFloat(pos.unrealized_plpc),
      side: pos.side,
    }));
  } catch (error) {
    console.error('[Alpaca] Failed to get positions:', error);
    throw new Error(`Alpaca API error: ${error.message}`);
  }
}

/**
 * Get recent orders
 * @param {Alpaca} alpaca - Alpaca client instance
 * @param {string} status - 'all', 'open', 'closed'
 * @param {number} limit - Max number of orders to return
 * @returns {Promise<Array>} List of orders
 */
export async function getOrders(alpaca, status = 'all', limit = 50) {
  try {
    const orders = await alpaca.getOrders({ status, limit });
    return orders.map(order => ({
      id: order.id,
      symbol: order.symbol,
      asset_class: order.asset_class,
      qty: parseFloat(order.qty),
      side: order.side,
      order_type: order.type,
      time_in_force: order.time_in_force,
      limit_price: order.limit_price ? parseFloat(order.limit_price) : null,
      stop_price: order.stop_price ? parseFloat(order.stop_price) : null,
      filled_avg_price: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
      status: order.status,
      filled_qty: parseFloat(order.filled_qty || 0),
      submitted_at: order.submitted_at,
      filled_at: order.filled_at,
      canceled_at: order.canceled_at,
    }));
  } catch (error) {
    console.error('[Alpaca] Failed to get orders:', error);
    throw new Error(`Alpaca API error: ${error.message}`);
  }
}

/**
 * Place a new order
 * @param {Alpaca} alpaca - Alpaca client instance
 * @param {Object} orderParams - Order parameters
 * @returns {Promise<Object>} Order confirmation
 */
export async function placeOrder(alpaca, orderParams) {
  try {
    const order = await alpaca.createOrder({
      symbol: orderParams.symbol,
      qty: orderParams.qty,
      side: orderParams.side, // 'buy' or 'sell'
      type: orderParams.order_type || 'market',
      time_in_force: orderParams.time_in_force || 'day',
      limit_price: orderParams.limit_price,
      stop_price: orderParams.stop_price,
    });

    return {
      id: order.id,
      symbol: order.symbol,
      asset_class: order.asset_class,
      qty: parseFloat(order.qty),
      side: order.side,
      order_type: order.type,
      status: order.status,
      submitted_at: order.submitted_at,
    };
  } catch (error) {
    console.error('[Alpaca] Failed to place order:', error);
    throw new Error(`Alpaca API error: ${error.message}`);
  }
}

/**
 * Cancel an order
 * @param {Alpaca} alpaca - Alpaca client instance
 * @param {string} orderId - Order ID to cancel
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelOrder(alpaca, orderId) {
  try {
    await alpaca.cancelOrder(orderId);
    return { success: true, orderId };
  } catch (error) {
    console.error('[Alpaca] Failed to cancel order:', error);
    throw new Error(`Alpaca API error: ${error.message}`);
  }
}

/**
 * Get latest stock/crypto quote
 * @param {Alpaca} alpaca - Alpaca client instance
 * @param {string} symbol - Stock/crypto symbol
 * @returns {Promise<Object>} Latest quote
 */
export async function getLatestQuote(alpaca, symbol) {
  try {
    // Try to get latest bar (works for both stocks and crypto)
    const bars = await alpaca.getLatestBar(symbol);

    return {
      symbol,
      price: parseFloat(bars.c), // Close price
      high: parseFloat(bars.h),
      low: parseFloat(bars.l),
      open: parseFloat(bars.o),
      volume: bars.v,
      timestamp: bars.t,
    };
  } catch (error) {
    console.error(`[Alpaca] Failed to get quote for ${symbol}:`, error);
    throw new Error(`Alpaca API error: ${error.message}`);
  }
}

/**
 * Get historical bars (for charts)
 * @param {Alpaca} alpaca - Alpaca client instance
 * @param {string} symbol - Stock/crypto symbol
 * @param {string} timeframe - '1Min', '5Min', '15Min', '1Hour', '1Day'
 * @param {Object} options - { start, end, limit }
 * @returns {Promise<Array>} Historical bars
 */
export async function getHistoricalBars(alpaca, symbol, timeframe = '1Day', options = {}) {
  try {
    const { start, end, limit } = options;

    const params = {
      timeframe,
      limit: limit || 100,
    };

    if (start) params.start = start;
    if (end) params.end = end;

    const barsIterator = alpaca.getBarsV2(symbol, params);
    const bars = [];

    for await (const bar of barsIterator) {
      bars.push({
        timestamp: bar.Timestamp,
        open: parseFloat(bar.OpenPrice),
        high: parseFloat(bar.HighPrice),
        low: parseFloat(bar.LowPrice),
        close: parseFloat(bar.ClosePrice),
        volume: bar.Volume,
      });
    }

    return bars;
  } catch (error) {
    console.error(`[Alpaca] Failed to get historical bars for ${symbol}:`, error);
    throw new Error(`Alpaca API error: ${error.message}`);
  }
}

/**
 * Check if market is currently open
 * @param {Alpaca} alpaca - Alpaca client instance
 * @returns {Promise<boolean>} True if market is open
 */
export async function isMarketOpen(alpaca) {
  try {
    const clock = await alpaca.getClock();
    return clock.is_open;
  } catch (error) {
    console.error('[Alpaca] Failed to check market hours:', error);
    return false; // Assume closed on error
  }
}

/**
 * Get market calendar
 * @param {Alpaca} alpaca - Alpaca client instance
 * @param {Object} options - { start, end }
 * @returns {Promise<Array>} Market calendar
 */
export async function getMarketCalendar(alpaca, options = {}) {
  try {
    const calendar = await alpaca.getCalendar(options);
    return calendar.map(day => ({
      date: day.date,
      open: day.open,
      close: day.close,
    }));
  } catch (error) {
    console.error('[Alpaca] Failed to get market calendar:', error);
    throw new Error(`Alpaca API error: ${error.message}`);
  }
}

/**
 * WebSocket connection for real-time data
 * @param {string} apiKey - Alpaca API key
 * @param {string} apiSecret - Alpaca API secret
 * @param {Array<string>} symbols - Symbols to subscribe to
 * @param {Function} onUpdate - Callback for price updates
 * @returns {Object} WebSocket client with close() method
 */
export function createRealtimeConnection(apiKey, apiSecret, symbols, onUpdate) {
  try {
    const alpaca = new Alpaca({
      keyId: apiKey,
      secretKey: apiSecret,
      paper: true, // Use paper for WebSocket (same data)
      feed: 'iex',
    });

    const dataStream = alpaca.data_stream_v2;

    dataStream.onConnect(() => {
      console.log('[Alpaca WebSocket] Connected');
      dataStream.subscribeForTrades(symbols);
      dataStream.subscribeForQuotes(symbols);
    });

    dataStream.onError((error) => {
      console.error('[Alpaca WebSocket] Error:', error);
    });

    dataStream.onStockTrade((trade) => {
      onUpdate({
        type: 'trade',
        symbol: trade.Symbol,
        price: trade.Price,
        size: trade.Size,
        timestamp: trade.Timestamp,
      });
    });

    dataStream.onStockQuote((quote) => {
      onUpdate({
        type: 'quote',
        symbol: quote.Symbol,
        bid: quote.BidPrice,
        ask: quote.AskPrice,
        bid_size: quote.BidSize,
        ask_size: quote.AskSize,
        timestamp: quote.Timestamp,
      });
    });

    dataStream.connect();

    return {
      close: () => {
        dataStream.disconnect();
        console.log('[Alpaca WebSocket] Disconnected');
      },
    };
  } catch (error) {
    console.error('[Alpaca] Failed to create WebSocket connection:', error);
    throw error;
  }
}

/**
 * Test API credentials
 * @param {string} apiKey - Alpaca API key
 * @param {string} apiSecret - Alpaca API secret
 * @param {string} mode - 'paper' or 'live'
 * @returns {Promise<Object>} Test result
 */
export async function testCredentials(apiKey, apiSecret, mode = 'paper') {
  try {
    const alpaca = createAlpacaClient(apiKey, apiSecret, mode);
    const account = await getAccountInfo(alpaca);

    return {
      success: true,
      account_id: account.id,
      status: account.status,
      mode,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
