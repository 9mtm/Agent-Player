# Trading Extension - TODO List

Tasks to enhance the Trading Extension UI/UX to match professional trading platforms.

## 🎯 Current Status

**Version**: v1.1.0 (Priority 1 Complete!)
**Status**: ✅ Professional trading UI completed
**Next Goal**: Advanced features (Priority 2)

---

## 🔥 Priority 1: Essential Features (This Week) ✅ COMPLETE

### 1. Stock Search with Autocomplete
**Status**: ✅ COMPLETE (2026-02-27)
**Actual Time**: 3 hours
**Files to Modify**:
- `src/app/(dashboard)/dashboard/trading/page.tsx`

**Requirements**:
- [x] Add search input at top of page (below header)
- [x] Implement autocomplete dropdown
- [x] Use Alpaca API: `GET /v2/assets?status=active&asset_class=us_equity`
- [x] Show: Symbol + Company Name
- [x] Click symbol → auto-fills Trade tab

**Implementation Details**:
- Created `StockSearchInput` component with debounced search (300ms)
- Added `/api/ext/trading/assets/search` endpoint
- Dropdown shows symbol, name, and exchange
- Real-time filtering as user types

---

### 2. Live Price Display
**Status**: ✅ COMPLETE (2026-02-27)
**Actual Time**: 4 hours
**Files to Modify**:
- `src/app/(dashboard)/dashboard/trading/page.tsx`
- `packages/backend/extensions/trading/src/routes.js`

**Requirements**:
- [x] Real-time price component
- [x] Display: Current Price, Bid, Ask
- [x] Show: Change ($), Change (%)
- [x] Color coding: Green (up), Red (down)
- [x] Last update timestamp
- [x] Auto-refresh every 5 seconds
- [x] Loading skeleton while fetching

**Implementation Details**:
- Created `LivePriceDisplay` component with auto-refresh
- Updated backend `getLatestQuote()` to use Alpaca quote API (bid/ask prices)
- Shows bid price, ask price, sizes, and timestamp
- Price change indicators with TrendingUp/TrendingDown icons
- 5-second auto-refresh interval

---

### 3. Order Cost Calculator
**Status**: ✅ COMPLETE (2026-02-27)
**Actual Time**: 2 hours
**Files to Modify**:
- `src/app/(dashboard)/dashboard/trading/page.tsx`

**Requirements**:
- [x] Calculate estimated cost (qty × price)
- [x] Show buying power
- [x] Warning if cost > buying power
- [x] Update on qty/price change

**Implementation Details**:
- Created `OrderCostCalculator` component with real-time calculations
- Shows: Total Cost, Available Buying Power, Remaining Balance
- Red warning alert if insufficient funds
- Green checkmark if funds are sufficient
- Supports both Market and Limit order calculations
- Different calculations for Buy vs Sell orders

---

### 4. Time in Force Options
**Status**: ✅ COMPLETE (2026-02-27)
**Actual Time**: 1 hour
**Files to Modify**:
- `src/app/(dashboard)/dashboard/trading/page.tsx`
- `packages/backend/extensions/trading/src/routes.js`

**Requirements**:
- [x] Add Time in Force dropdown
- [x] Options: DAY, GTC, IOC, FOK
- [x] Default: DAY
- [x] Tooltips explaining each option

**Implementation Details**:
- Added Time in Force dropdown with 4 options
- Each option includes description in dropdown text
- Dynamic help text below dropdown that changes based on selection
- Fully integrated with order submission (passed to backend)
- Backend already supported time_in_force parameter

---

### 5. Order Preview Dialog
**Status**: ✅ COMPLETE (2026-02-27)
**Actual Time**: 2 hours
**Files to Modify**:
- `src/app/(dashboard)/dashboard/trading/page.tsx`

**Requirements**:
- [x] Modal dialog before order submission
- [x] Show: Symbol, Qty, Side, Type, Price, Est. Cost
- [x] Warning for insufficient funds
- [x] Confirm/Cancel buttons

**Implementation Details**:
- Created `OrderPreviewModal` component (150+ lines)
- Shows complete order details:
  - Symbol + Asset Name
  - Action (BUY/SELL with quantity)
  - Order Type + Limit Price (if applicable)
  - Time in Force (DAY/GTC/IOC/FOK)
  - Current Price
  - Estimated Cost
  - Buying Power + Remaining Balance
- Red warning alert if insufficient funds
- Confirm button disabled when insufficient funds
- Info note about price variations
- Color-coded buttons (green for Buy, red for Sell)

---

## 🚀 Priority 2: Advanced Features (Next Week)

### 6. TradingView Chart Widget
**Status**: ❌ Not Started
**Estimated Time**: 4-6 hours
**Files to Modify**:
- `src/app/(dashboard)/dashboard/trading/page.tsx`
- Add TradingView library

**Requirements**:
- [ ] Embed TradingView widget
- [ ] Chart types: Candlestick, Line, Area
- [ ] Timeframes: 1m, 5m, 15m, 1h, 1d, 1w, 1M
- [ ] Indicators: MA, RSI, MACD, Bollinger Bands
- [ ] Drawing tools: Trendlines, Support/Resistance
- [ ] Full-screen mode
- [ ] Save chart settings (localStorage)

**Library**:
```bash
npm install react-tradingview-embed
```

**Component**:
```tsx
<TradingViewWidget
  symbol="NASDAQ:AAPL"
  theme="light"
  locale="en"
  autosize
/>
```

---

### 7. Enhanced Positions Table
**Status**: ❌ Not Started
**Estimated Time**: 2-3 hours
**Files to Modify**:
- `src/app/(dashboard)/dashboard/trading/page.tsx`

**Requirements**:
- [ ] Add Cost Basis column
- [ ] Add Today's P/L column (separate from Total P/L)
- [ ] Color code P/L (green/red)
- [ ] Quick action buttons:
  - Sell 25%
  - Sell 50%
  - Sell 100% (Close Position)
- [ ] Sortable columns (click header to sort)
- [ ] Row hover effects
- [ ] Click row → open details modal

**New Table Columns**:
```
Symbol | Qty | Avg Entry | Current | Market Value | Cost Basis | Today's P/L | Total P/L | Actions
```

---

### 8. Position Details Modal
**Status**: ❌ Not Started
**Estimated Time**: 3-4 hours
**Files to Create**:
- New component: `PositionDetailsModal.tsx`

**Requirements**:
- [ ] Click position → open modal
- [ ] Show full position details:
  - Entry date and price
  - Current price and value
  - Unrealized P/L ($ and %)
  - Intraday P/L
  - Total return since purchase
- [ ] Mini price chart (last 30 days)
- [ ] Quick sell form inside modal
- [ ] Transaction history for this symbol

**Modal Layout**:
```
┌────────────────────────────────────────┐
│ AAPL - 10 shares                       │
├────────────────────────────────────────┤
│ Avg Entry:    $270.00                  │
│ Current:      $272.89                  │
│ Market Value: $2,728.90                │
│ Total P/L:    +$28.90 (+1.07%)         │
│                                        │
│ [Mini Chart Here]                      │
│                                        │
│ Quick Sell:                            │
│ Qty: [__] [Sell 25%] [Sell 50%] [All] │
│                                        │
│ [Close]                                │
└────────────────────────────────────────┘
```

---

### 9. WebSocket Real-Time Updates
**Status**: ❌ Not Started
**Estimated Time**: 4-6 hours
**Files to Modify**:
- `packages/backend/extensions/trading/src/portfolio-sync.js`
- `src/app/(dashboard)/dashboard/trading/page.tsx`

**Requirements**:
- [ ] Connect to Alpaca WebSocket
- [ ] Subscribe to price updates for:
  - Positions (all owned symbols)
  - Watchlist symbols
  - Current symbol in Trade tab
- [ ] Update UI in real-time (no polling)
- [ ] Reconnect on disconnect
- [ ] Show connection status indicator

**Alpaca WebSocket**:
```javascript
const stream = alpaca.data_stream_v2;
stream.onStockTrade((trade) => {
  // Update price in UI
});
```

---

## 💡 Priority 3: Professional Features (Future)

### 10. Portfolio Analytics Dashboard
**Status**: ❌ Not Started
**Estimated Time**: 1-2 days

**Features**:
- [ ] Portfolio value chart (historical)
- [ ] Profit/Loss graph (daily, weekly, monthly)
- [ ] Asset allocation pie chart
- [ ] Performance vs benchmark (SPY)
- [ ] Risk metrics:
  - Sharpe Ratio
  - Beta
  - Max Drawdown
  - Volatility
- [ ] Top gainers/losers
- [ ] Dividend tracking

---

### 11. Advanced Order Types
**Status**: ❌ Not Started
**Estimated Time**: 2-3 days

**Order Types to Add**:
- [ ] **Bracket Orders**
  - Set stop loss + take profit together
  - Auto-exit on targets
- [ ] **Trailing Stop**
  - Stop loss that follows price
  - Configurable trail amount
- [ ] **OCO Orders** (One-Cancels-Other)
  - Place two orders
  - If one executes, cancel the other

---

### 12. Watchlist Enhancements
**Status**: ❌ Not Started
**Estimated Time**: 1 day

**Features**:
- [ ] Multiple watchlists (create custom lists)
- [ ] Drag-and-drop reordering
- [ ] Price alerts (notify when price reaches target)
- [ ] Notes per symbol
- [ ] Tags/categories
- [ ] Import/export watchlist

---

### 13. Market News Feed
**Status**: ❌ Not Started
**Estimated Time**: 2-3 days

**Features**:
- [ ] Real-time stock news (Alpaca News API)
- [ ] Filter by symbol
- [ ] Sentiment analysis (positive/negative)
- [ ] Earnings calendar
- [ ] SEC filings
- [ ] Economic calendar

---

### 14. Mobile Responsive Design
**Status**: ❌ Not Started
**Estimated Time**: 2-3 days

**Features**:
- [ ] Mobile-first layout
- [ ] Touch-friendly controls
- [ ] Swipe gestures
- [ ] Bottom navigation
- [ ] Simplified charts on mobile

---

### 15. Options Trading (Requires Alpaca Approval)
**Status**: ❌ Not Started
**Estimated Time**: 1-2 weeks

**Features**:
- [ ] Options chain display
- [ ] Call/Put orders
- [ ] Greeks calculator (Delta, Gamma, Theta, Vega)
- [ ] Strategy builder (spreads, straddles, etc.)
- [ ] Options analytics

---

## 📊 Progress Tracking

**Overall Progress**: 5/15 tasks completed (33.3%)

### Week 1 (Priority 1) ✅ COMPLETE
- [x] Stock Search (100%) ✅
- [x] Live Price Display (100%) ✅
- [x] Order Cost Calculator (100%) ✅
- [x] Time in Force (100%) ✅
- [x] Order Preview (100%) ✅

**Total Time Invested**: 12 hours
**Status**: All Priority 1 features delivered on schedule!

### Week 2 (Priority 2)
- [ ] TradingView Chart (0%)
- [ ] Enhanced Positions (0%)
- [ ] Position Details Modal (0%)
- [ ] WebSocket Updates (0%)

### Future (Priority 3)
- [ ] Analytics Dashboard (0%)
- [ ] Advanced Orders (0%)
- [ ] Watchlist Enhancements (0%)
- [ ] News Feed (0%)
- [ ] Mobile Design (0%)
- [ ] Options Trading (0%)

---

## 🎨 Design System

**Colors**:
- Green (Profit): `#10b981`
- Red (Loss): `#ef4444`
- Blue (Buy): `#3b82f6`
- Gray (Neutral): `#6b7280`

**Fonts**:
- Headings: `font-bold`
- Body: `font-normal`
- Numbers: `font-mono` (for prices)

**Spacing**:
- Small: `gap-2` (8px)
- Medium: `gap-4` (16px)
- Large: `gap-6` (24px)

---

## 📝 Notes

**Testing**:
- Always test with Paper Trading account first
- Test edge cases (market closed, invalid symbols, insufficient funds)
- Test on mobile devices
- Test with real-time data

**Performance**:
- Debounce search input (300ms)
- Throttle WebSocket updates (100ms)
- Lazy load charts
- Optimize re-renders (React.memo)

**Accessibility**:
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader friendly
- High contrast mode

---

## 🔗 Resources

**APIs**:
- [Alpaca API Docs](https://alpaca.markets/docs/)
- [Alpaca WebSocket](https://alpaca.markets/docs/api-references/market-data-api/stock-pricing-data/realtime/)
- [TradingView Widget](https://www.tradingview.com/widget/)

**UI Libraries**:
- [TradingView Charts](https://www.tradingview.com/HTML5-stock-forex-bitcoin-charting-library/)
- [Recharts](https://recharts.org/) (simpler alternative)
- [shadcn/ui](https://ui.shadcn.com/) (component library)

**Design Inspiration**:
- [Alpaca Web](https://app.alpaca.markets/)
- [Robinhood](https://robinhood.com/)
- [Webull](https://www.webull.com/)
- [TradingView](https://www.tradingview.com/)

---

## 🎉 Summary

**Priority 1 - Week 1**: ✅ **COMPLETE!**

All essential trading features have been successfully implemented:

1. ✅ **Stock Search with Autocomplete** - Professional search experience
2. ✅ **Live Price Display** - Real-time bid/ask prices with auto-refresh
3. ✅ **Order Cost Calculator** - Real-time cost calculation with warnings
4. ✅ **Time in Force Options** - Full support for DAY/GTC/IOC/FOK
5. ✅ **Order Preview Dialog** - Comprehensive order confirmation before execution

**Total Development Time**: 12 hours
**Components Created**: 4 new React components
**API Endpoints Added**: 1 new endpoint
**Status**: Ready for production testing

---

**Last Updated**: 2026-02-27
**Next Review**: Start Priority 2 implementation
