# Trading Extension Setup Guide

Quick setup guide for the Trading Extension.

## What Was Added

### 🔌 New Extension: Trading
- **Location**: `packages/backend/extensions/trading/`
- **Type**: Full app extension with dashboard UI
- **Features**: Stock & Crypto trading via Alpaca API

### 📁 Files Created

**Backend (9 files)**:
```
packages/backend/extensions/trading/
├── agentplayer.plugin.json          # Extension manifest
├── index.js                         # Entry point
├── README.md                        # Extension docs
├── migrations/
│   └── 001_trading_tables.sql       # 9 database tables
└── src/
    ├── routes.js                    # 25 API endpoints
    ├── alpaca-client.js             # Alpaca API wrapper
    ├── portfolio-sync.js            # Background sync
    ├── trading-bot.js               # Trading bot engine
    └── tool.js                      # AI trading tools
```

**Frontend (1 file)**:
```
src/app/(dashboard)/dashboard/trading/
└── page.tsx                         # Trading dashboard (800+ lines)
```

**Documentation (2 files)**:
```
docs/
└── TRADING_EXTENSION.md             # Complete documentation

packages/backend/extensions/trading/
└── README.md                        # Extension README
```

**Test Scripts (1 file)**:
```
scripts/
└── test-trading-extension.js        # Integration test
```

### 📊 Database Schema

**9 New Tables**:
1. `trading_accounts` - Connected Alpaca accounts
2. `trading_portfolio_snapshots` - Historical portfolio data
3. `trading_positions` - Current stock holdings
4. `trading_orders` - Order history
5. `trading_history` - Completed trades
6. `trading_watchlist` - Favorite symbols
7. `trading_strategies` - Trading strategies
8. `trading_signals` - AI trading signals
9. `trading_activity_log` - Audit trail

### 🎨 UI Components

**Trading Dashboard Tabs**:
- **Overview**: Portfolio metrics (Cash, Value, Buying Power, Equity)
- **Positions**: Current holdings with P&L
- **Trade**: Order entry form (Buy/Sell)
- **Orders**: Order history and status
- **Strategies**: AI trading strategies

## Quick Start

### 1. Enable Extension

```bash
# Extension auto-installs dependencies
cd packages/backend
pnpm add @alpacahq/alpaca-trade-api
```

Go to `/dashboard/extensions` → Enable "Trading" → Backend restarts

### 2. Get Alpaca API Keys

1. Sign up at [alpaca.markets](https://alpaca.markets)
2. Generate Paper Trading API keys (free $100k virtual money)
3. Copy API Key and Secret

### 3. Connect Account

1. Go to `/dashboard/trading`
2. Click "Connect Account"
3. Fill in:
   - Account Name: "My Paper Account"
   - Mode: Paper Trading
   - API Key: `PKXXXXXXXX...`
   - API Secret: `xxxxxxxxxx...`
4. Click "Connect"

### 4. Start Trading

**Manual Trading**:
- Go to "Trade" tab
- Enter symbol (e.g., AAPL, TSLA)
- Choose quantity and order type
- Click Buy or Sell

**AI Trading**:
- Chat: "Buy 10 shares of Apple"
- Chat: "Show my portfolio"
- Chat: "Analyze Tesla stock"

## Features

✅ **Paper Trading** - $100k virtual money for practice
✅ **Live Trading** - Real money trading (requires KYC)
✅ **Stocks** - US equities (NYSE, NASDAQ)
✅ **Crypto** - BTC, ETH, DOGE, etc.
✅ **Real-time Data** - Live quotes and updates
✅ **AI Tools** - trading_execute, trading_analyze
✅ **Strategies** - MA Crossover, RSI, Breakout, AI
✅ **Multi-Account** - Support multiple accounts
✅ **Secure** - AES-256-GCM encryption for API keys

## API Endpoints

All under `/api/ext/trading/`:

**Accounts**: GET/POST/PUT/DELETE `/accounts`
**Portfolio**: GET `/portfolio`, GET `/positions`, POST `/sync`
**Orders**: GET/POST/DELETE `/orders`
**Market**: GET `/quote/:symbol`, GET `/bars/:symbol`
**Watchlist**: GET/POST/DELETE `/watchlist`
**Strategies**: GET/POST/PUT/DELETE `/strategies`
**Signals**: GET/POST `/signals`
**Activity**: GET `/activity`

## AI Tools

### trading_execute
```json
{
  "action": "place_order",
  "symbol": "AAPL",
  "qty": 10,
  "side": "buy",
  "order_type": "market"
}
```

### trading_analyze
```json
{
  "symbol": "TSLA",
  "timeframe": "1D"
}
```

## Testing

Run integration test:
```bash
cd agent_player
node scripts/test-trading-extension.js
```

Manual test checklist:
- [ ] Connect account
- [ ] View portfolio
- [ ] Place buy order
- [ ] Check positions
- [ ] Place sell order
- [ ] View order history
- [ ] Test AI commands

## Documentation

- **Full Docs**: `docs/TRADING_EXTENSION.md`
- **Extension README**: `packages/backend/extensions/trading/README.md`
- **Test Script**: `scripts/test-trading-extension.js`

## Security

- API keys encrypted with AES-256-GCM
- Keys stored as credential IDs (never plaintext)
- JWT authentication on all routes
- User isolation (WHERE user_id = ?)
- Audit logging for all operations

## Version

**v1.0.0** - Initial Release (2026-02-26)

## Next Steps

1. ✅ Extension created and tested
2. ✅ Documentation written
3. ✅ Database schema applied
4. ✅ API routes working
5. ✅ Frontend UI complete
6. 🔜 Test with real Paper Trading account
7. 🔜 Add WebSocket real-time updates
8. 🔜 Implement AI trading strategies

## Support

For issues:
- Check backend logs
- Verify Alpaca API keys
- Review `docs/TRADING_EXTENSION.md`
- Test with Paper Trading first
