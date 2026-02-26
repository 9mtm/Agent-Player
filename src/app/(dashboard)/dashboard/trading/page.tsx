'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { config } from '@/lib/config';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  DollarSign,
  Wallet,
  PieChart,
  Activity,
  PlayCircle,
  StopCircle,
  Target,
  AlertCircle,
} from 'lucide-react';

/**
 * Trading Dashboard Page
 *
 * Complete stock and crypto trading interface with:
 * - Account management (connect Alpaca accounts)
 * - Portfolio overview (cash, equity, buying power, P&L)
 * - Positions (current holdings)
 * - Order management (place orders, view history)
 * - AI Trading strategies (3 modes: Assistant, Semi-Auto, Full-Auto)
 */

export default function TradingPage() {
  // Auth helper
  const authHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // State
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [signals, setSignals] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [activeTab, setActiveTab] = useState('positions'); // positions, trade, orders, strategies
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (activeAccount) {
      loadPortfolio();
      loadPositions();
      loadOrders();
      loadStrategies();
      loadSignals();
      loadWatchlist();
    }
  }, [activeAccount]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  async function loadAccounts() {
    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/accounts`, {
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Failed to load accounts');

      const data = await res.json();
      setAccounts(data.accounts || []);

      // Set active account (default or first)
      const defaultAccount = data.accounts?.find((a) => a.is_default) || data.accounts?.[0];
      setActiveAccount(defaultAccount || null);

      setLoading(false);
    } catch (error) {
      console.error('Load accounts error:', error);
      toast.error('Failed to load accounts');
      setLoading(false);
    }
  }

  async function loadPortfolio() {
    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/portfolio`, {
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Failed to load portfolio');

      const data = await res.json();
      setPortfolio(data.portfolio);
    } catch (error) {
      console.error('Load portfolio error:', error);
    }
  }

  async function loadPositions() {
    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/positions`, {
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Failed to load positions');

      const data = await res.json();
      setPositions(data.positions || []);
    } catch (error) {
      console.error('Load positions error:', error);
    }
  }

  async function loadOrders() {
    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/orders?status=all&limit=50`, {
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Failed to load orders');

      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Load orders error:', error);
    }
  }

  async function loadStrategies() {
    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/strategies`, {
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Failed to load strategies');

      const data = await res.json();
      setStrategies(data.strategies || []);
    } catch (error) {
      console.error('Load strategies error:', error);
    }
  }

  async function loadSignals() {
    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/signals?status=pending`, {
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Failed to load signals');

      const data = await res.json();
      setSignals(data.signals || []);
    } catch (error) {
      console.error('Load signals error:', error);
    }
  }

  async function loadWatchlist() {
    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/watchlist`, {
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Failed to load watchlist');

      const data = await res.json();
      setWatchlist(data.watchlist || []);
    } catch (error) {
      console.error('Load watchlist error:', error);
    }
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/sync`, {
        method: 'POST',
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Sync failed');

      toast.success('Portfolio synced successfully');
      loadPortfolio();
      loadPositions();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync portfolio');
    } finally {
      setSyncing(false);
    }
  }

  async function handlePlaceOrder(orderData) {
    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/orders`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to place order');
      }

      const data = await res.json();
      toast.success(`Order placed: ${orderData.side.toUpperCase()} ${orderData.qty} ${orderData.symbol}`);

      loadOrders();
      loadPositions();
      loadPortfolio();

      return data;
    } catch (error) {
      console.error('Place order error:', error);
      toast.error(error.message);
      throw error;
    }
  }

  async function handleCancelOrder(orderId) {
    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/orders/${orderId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Failed to cancel order');

      toast.success('Order cancelled');
      loadOrders();
    } catch (error) {
      console.error('Cancel order error:', error);
      toast.error('Failed to cancel order');
    }
  }

  async function handleStartStrategy(strategyId) {
    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/strategies/${strategyId}/start`, {
        method: 'POST',
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Failed to start strategy');

      toast.success('Strategy started');
      loadStrategies();
    } catch (error) {
      console.error('Start strategy error:', error);
      toast.error(error.message);
    }
  }

  async function handleStopStrategy(strategyId) {
    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/strategies/${strategyId}/stop`, {
        method: 'POST',
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Failed to stop strategy');

      toast.success('Strategy stopped');
      loadStrategies();
    } catch (error) {
      console.error('Stop strategy error:', error);
      toast.error('Failed to stop strategy');
    }
  }

  async function handleExecuteSignal(signalId) {
    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/signals/${signalId}/execute`, {
        method: 'POST',
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Failed to execute signal');

      toast.success('Signal executed');
      loadSignals();
      loadOrders();
      loadPositions();
    } catch (error) {
      console.error('Execute signal error:', error);
      toast.error(error.message);
    }
  }

  async function handleRejectSignal(signalId) {
    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/signals/${signalId}/reject`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'User rejected' }),
      });

      if (!res.ok) throw new Error('Failed to reject signal');

      toast.success('Signal rejected');
      loadSignals();
    } catch (error) {
      console.error('Reject signal error:', error);
      toast.error('Failed to reject signal');
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold mb-2">No Trading Account Connected</h1>
          <p className="text-gray-600 mb-6">
            Connect your Alpaca account to start trading stocks and cryptocurrencies.
          </p>
          <button
            onClick={() => setShowConnectDialog(true)}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Connect Account
          </button>
        </div>

        {showConnectDialog && (
          <ConnectAccountDialog
            onClose={() => setShowConnectDialog(false)}
            onSuccess={() => {
              setShowConnectDialog(false);
              loadAccounts();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Trading</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-600">{activeAccount.account_name}</span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${
                  activeAccount.account_mode === 'paper'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {activeAccount.account_mode === 'paper' ? 'Paper Trading' : 'Live Trading'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <button
            onClick={() => setShowConnectDialog(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Connect Account
          </button>
        </div>
      </div>

      {/* Warning */}
      {activeAccount.account_mode === 'live' && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="text-sm text-red-800">
            <strong>Live Trading Mode:</strong> You are trading with real money. All orders will
            be executed immediately. Please trade responsibly.
          </div>
        </div>
      )}

      {/* Portfolio Overview */}
      {portfolio && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Cash"
            value={`$${portfolio.cash.toFixed(2)}`}
            color="blue"
          />
          <MetricCard
            icon={<PieChart className="w-5 h-5" />}
            label="Portfolio Value"
            value={`$${portfolio.portfolio_value.toFixed(2)}`}
            color="purple"
          />
          <MetricCard
            icon={<Wallet className="w-5 h-5" />}
            label="Buying Power"
            value={`$${portfolio.buying_power.toFixed(2)}`}
            color="green"
          />
          <MetricCard
            icon={<Activity className="w-5 h-5" />}
            label="Equity"
            value={`$${portfolio.equity.toFixed(2)}`}
            color="orange"
          />
        </div>
      )}

      {/* Pending Signals Alert */}
      {signals.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">
                {signals.length} Pending Trading Signal{signals.length > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-blue-700">AI strategy generated new trading opportunities</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('strategies')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Review Signals
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {['positions', 'trade', 'orders', 'strategies'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'positions' && <PositionsTab positions={positions} />}
        {activeTab === 'trade' && (
          <TradeTab onPlaceOrder={handlePlaceOrder} watchlist={watchlist} />
        )}
        {activeTab === 'orders' && <OrdersTab orders={orders} onCancel={handleCancelOrder} />}
        {activeTab === 'strategies' && (
          <StrategiesTab
            strategies={strategies}
            signals={signals}
            onStartStrategy={handleStartStrategy}
            onStopStrategy={handleStopStrategy}
            onExecuteSignal={handleExecuteSignal}
            onRejectSignal={handleRejectSignal}
          />
        )}
      </div>

      {showConnectDialog && (
        <ConnectAccountDialog
          onClose={() => setShowConnectDialog(false)}
          onSuccess={() => {
            setShowConnectDialog(false);
            loadAccounts();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTS
// ============================================================================

function MetricCard({ icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function PositionsTab({ positions }) {
  if (positions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No positions yet. Start trading to see your holdings here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Price</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Market Value</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">P&L</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {positions.map((pos) => (
            <tr key={pos.symbol} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{pos.symbol}</td>
              <td className="px-4 py-3">{pos.qty}</td>
              <td className="px-4 py-3">${pos.avg_entry_price.toFixed(2)}</td>
              <td className="px-4 py-3">${pos.current_price.toFixed(2)}</td>
              <td className="px-4 py-3">${pos.market_value.toFixed(2)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  {pos.unrealized_pl >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={pos.unrealized_pl >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${Math.abs(pos.unrealized_pl).toFixed(2)} ({pos.unrealized_plpc.toFixed(2)}%)
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TradeTab({ onPlaceOrder, watchlist }) {
  const [symbol, setSymbol] = useState('');
  const [qty, setQty] = useState('1');
  const [side, setSide] = useState('buy');
  const [orderType, setOrderType] = useState('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onPlaceOrder({
        symbol: symbol.toUpperCase(),
        qty: parseFloat(qty),
        side,
        order_type: orderType,
        limit_price: limitPrice ? parseFloat(limitPrice) : undefined,
      });

      // Reset form
      setSymbol('');
      setQty('1');
      setLimitPrice('');
    } catch (error) {
      // Error already handled by parent
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h3 className="text-lg font-semibold mb-4">Place Order</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="AAPL, TSLA, BTCUSD..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              min="0.01"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Side</label>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
            </select>
          </div>

          {orderType === 'limit' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Limit Price</label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={orderType === 'limit'}
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3 rounded-lg font-medium text-white ${
            side === 'buy'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
          } disabled:opacity-50`}
        >
          {submitting ? 'Placing Order...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol || '...'}`}
        </button>
      </form>

      {watchlist.length > 0 && (
        <div className="mt-8">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Watchlist</h4>
          <div className="flex flex-wrap gap-2">
            {watchlist.map((item) => (
              <button
                key={item.symbol}
                onClick={() => setSymbol(item.symbol)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
              >
                {item.symbol}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OrdersTab({ orders, onCancel }) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No orders yet. Place your first order to see it here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Side</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filled Price</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{order.symbol}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    order.side === 'buy'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {order.side.toUpperCase()}
                </span>
              </td>
              <td className="px-4 py-3">{order.qty}</td>
              <td className="px-4 py-3">{order.order_type}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    order.status === 'filled'
                      ? 'bg-green-100 text-green-800'
                      : order.status === 'canceled'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {order.filled_avg_price ? `$${order.filled_avg_price.toFixed(2)}` : '-'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(order.submitted_at).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                {order.status === 'new' || order.status === 'pending_new' ? (
                  <button
                    onClick={() => onCancel(order.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Cancel
                  </button>
                ) : (
                  <span className="text-gray-400 text-sm">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StrategiesTab({ strategies, signals, onStartStrategy, onStopStrategy, onExecuteSignal, onRejectSignal }) {
  return (
    <div className="space-y-6">
      {/* Pending Signals */}
      {signals.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Pending Signals ({signals.length})</h3>
          <div className="space-y-3">
            {signals.map((signal) => (
              <div
                key={signal.id}
                className="border border-blue-200 rounded-lg p-4 bg-blue-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-lg">{signal.symbol}</span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          signal.signal_type === 'buy'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {signal.signal_type.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">
                        @ ${signal.current_price.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{signal.reason}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>Qty: {signal.recommended_qty}</span>
                      <span>Confidence: {(signal.confidence * 100).toFixed(0)}%</span>
                      <span>Strategy: {signal.strategy_name}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onExecuteSignal(signal.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      Execute
                    </button>
                    <button
                      onClick={() => onRejectSignal(signal.id)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategies List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Trading Strategies</h3>

        {strategies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No strategies yet. Create your first AI trading strategy.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {strategies.map((strategy) => (
              <div key={strategy.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{strategy.strategy_name}</h4>
                    <p className="text-sm text-gray-600">
                      {strategy.strategy_type.replace('_', ' ')} • {strategy.execution_mode}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        strategy.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {strategy.status}
                    </span>
                    {strategy.status === 'active' ? (
                      <button
                        onClick={() => onStopStrategy(strategy.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <StopCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onStartStrategy(strategy.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                      >
                        <PlayCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>Symbols: {strategy.symbols.join(', ')}</span>
                  {strategy.win_rate !== null && (
                    <span>Win Rate: {strategy.win_rate.toFixed(1)}%</span>
                  )}
                  <span>Total Trades: {strategy.total_trades}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectAccountDialog({ onClose, onSuccess }) {
  const authHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const [formData, setFormData] = useState({
    account_name: '',
    account_mode: 'paper',
    api_key: '',
    api_secret: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`${config.backendUrl}/api/ext/trading/accounts`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: 'alpaca',
          ...formData,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to connect account');
      }

      toast.success('Account connected successfully');
      onSuccess();
    } catch (error) {
      console.error('Connect account error:', error);
      toast.error(error.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Connect Trading Account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Name
              </label>
              <input
                type="text"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="My Paper Account"
                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:border-gray-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mode</label>
              <select
                value={formData.account_mode}
                onChange={(e) => setFormData({ ...formData, account_mode: e.target.value })}
                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:border-gray-600"
              >
                <option value="paper">Paper Trading (Demo)</option>
                <option value="live">Live Trading (Real Money)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="PK..."
                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:border-gray-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Secret</label>
              <input
                type="password"
                value={formData.api_secret}
                onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                placeholder="..."
                className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white dark:border-gray-600"
                required
              />
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              Get your API keys from{' '}
              <a
                href="https://alpaca.markets"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                alpaca.markets
              </a>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
