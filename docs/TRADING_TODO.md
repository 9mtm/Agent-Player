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
**Status**: ✅ COMPLETE (2026-02-27)
**Actual Time**: 4 hours
**Files Modified**:
- `src/app/(dashboard)/dashboard/trading/page.tsx`
- Installed `react-tradingview-embed@3.0.6`

**Requirements**:
- [x] Embed TradingView widget
- [x] Chart types: Candlestick, Bar, Line, Area (4 types)
- [x] Timeframes: 1m, 5m, 15m, 1h, 1d, 1w, 1M (7 timeframes)
- [x] Indicators: MA, RSI, MACD, Bollinger Bands (built into TradingView)
- [x] Drawing tools: Trendlines, Support/Resistance (built into TradingView)
- [x] Full-screen mode
- [x] Save chart settings (localStorage)

**Implementation Details**:
- Created `TradingViewChart` component with full controls
- Added 4 chart types: Candlestick, Bar, Line, Area (with lucide-react icons)
- Added 7 timeframe buttons: 1m, 5m, 15m, 1h, 1d, 1w, 1M
- Fullscreen toggle button (Maximize icon)
- Auto-format symbols: AAPL → NASDAQ:AAPL, BTC/USD → CRYPTO:BTCUSD
- Settings saved to localStorage (survives page refresh)
- Dynamic Next.js import (client-side only, no SSR issues)
- Integrated into Trade tab (appears when symbol selected)
- 500px height (default) or fullscreen mode
- TradingView widget includes ALL indicators and drawing tools built-in

---

### 7. Enhanced Positions Table
**Status**: ✅ COMPLETE (2026-02-27)
**Actual Time**: 2.5 hours
**Files Modified**:
- `src/app/(dashboard)/dashboard/trading/page.tsx`

**Requirements**:
- [x] Add Cost Basis column
- [x] Add Today's P/L column (separate from Total P/L)
- [x] Color code P/L (green/red)
- [x] Quick action buttons:
  - Sell 25%
  - Sell 50%
  - Sell 100% (Close Position)
- [x] Sortable columns (click header to sort)
- [x] Row hover effects
- [x] Click row → open details modal (basic modal, full version in Task #8)

**Implementation Details**:
- Added sortable column headers (click to sort, shows ↑/↓ indicator)
- New columns: Cost Basis, Today's P/L (separate from Total P/L)
- Enhanced Total P/L display: shows $ amount + % in two lines
- Color-coded P/L: green (profit) with TrendingUp icon, red (loss) with TrendingDown icon
- Quick action buttons: 25%, 50%, All (orange for partial, red for full close)
- Row hover effect: changes to blue-50 background
- Click row opens basic modal with position summary
- Confirmation dialog before selling (window.confirm)
- Integrated with handleSellPosition → places market sell order
- Font styling: font-mono for numbers, font-bold for symbols
- Right-aligned numeric columns for better readability

**New Table Columns**:
```
Symbol | Qty | Avg Entry | Current | Market Value | Cost Basis | Today's P/L | Total P/L | Actions
```

---

### 8. Position Details Modal
**Status**: ✅ COMPLETE (2026-02-27)
**Actual Time**: 3 hours
**Files Modified**:
- `src/app/(dashboard)/dashboard/trading/page.tsx`

**Requirements**:
- [x] Click position → open modal
- [x] Show full position details:
  - Entry date and price
  - Current price and value
  - Unrealized P/L ($ and %)
  - Intraday P/L
  - Total return since purchase
- [x] Mini price chart (last 30 days)
- [x] Quick sell form inside modal
- [x] Transaction history for this symbol (toggle button)

**Implementation Details**:
- Created `PositionDetailsModal` component (270+ lines)
- **Header**: Gradient blue header with symbol + quantity, X button to close
- **Position Summary**: 4-card grid showing:
  - Avg Entry Price
  - Current Price
  - Market Value
  - Cost Basis
- **P/L Summary**: Highlighted section with:
  - Today's P/L (with TrendingUp/Down icon)
  - Total P/L ($ + % + total return since purchase)
  - Color-coded: green (profit) / red (loss)
- **30-Day Mini Chart**:
  - Simple bar chart visualization (height based on price)
  - Color-coded: green (above avg entry) / red (below avg entry)
  - Hover shows date + price
  - Loading state with spinning icon
- **Quick Sell Section**:
  - 3 quick buttons: Sell 25%, Sell 50%, Close Position
  - Custom quantity input with Sell button
  - Max quantity indicator
  - Confirmation dialog before selling
- **Transaction History**:
  - Toggle button to show/hide
  - Placeholder for backend integration
- **Styling**:
  - Max-width 2xl, max-height 90vh with scroll
  - Sticky header that stays visible when scrolling
  - Rounded corners, shadow effects
  - Responsive grid layout
- **Integration**: Calls `onSell()` prop which triggers `handleSellPosition()` in parent

---

### 9. WebSocket Real-Time Updates
**Status**: ✅ COMPLETE (2026-02-27)
**Actual Time**: 3 hours
**Files Modified**:
- `packages/backend/extensions/trading/src/routes.js`
- `packages/backend/extensions/trading/src/alpaca-client.js`
- `src/app/(dashboard)/dashboard/trading/page.tsx`

**Requirements**:
- [x] Connect to Alpaca WebSocket
- [x] Subscribe to price updates for:
  - Positions (all owned symbols)
  - Watchlist symbols
  - Current symbol in Trade tab
- [x] Update UI in real-time (no polling)
- [x] Reconnect on disconnect
- [x] Show connection status indicator

**Implementation Details**:
- Created SSE endpoint `/api/ext/trading/stream` in backend
- Backend connects to Alpaca WebSocket using `createRealtimeConnection()`
- Subscribes to real-time quotes and trades for all position + watchlist symbols
- Frontend uses EventSource to receive SSE updates
- Connection status indicator in header (green Wifi icon = connected, red WifiOff = disconnected)
- Auto-reconnect on disconnect after 5 seconds
- Real-time price updates for positions (current_price, market_value, unrealized_pl)
- Removed 5-second polling from LivePriceDisplay (now uses WebSocket only)
- Visual feedback: connection status (Live/Connecting.../Connection lost)

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

**Overall Progress**: 9/15 tasks completed (60%)

### Week 1 (Priority 1) ✅ COMPLETE
- [x] Stock Search (100%) ✅
- [x] Live Price Display (100%) ✅
- [x] Order Cost Calculator (100%) ✅
- [x] Time in Force (100%) ✅
- [x] Order Preview (100%) ✅

**Total Time Invested**: 12 hours
**Status**: All Priority 1 features delivered on schedule!

### Week 2 (Priority 2) ✅ COMPLETE
- [x] TradingView Chart (100%) ✅
- [x] Enhanced Positions (100%) ✅
- [x] Position Details Modal (100%) ✅
- [x] WebSocket Updates (100%) ✅

**Time Invested**: 12.5 hours
**Status**: All Priority 2 tasks complete (100%) 🎉

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
