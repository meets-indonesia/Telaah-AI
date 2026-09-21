# Modern Financial Terminal UI Redesign (Telaah 360)

## Overview
Transform the current Telaah 360 interface from a generic chatbot/dashboard layout into a high-density, high-polish **Modern Financial Terminal** (inspired by Koyfin, TradingView, and Bloomberg Lite). The system brings financial data, technical charts, insider radars, and an interactive AI copilot into a cohesive, split-pane workspace.

## Goals & Philosophy
1. **Institutional Polish**: Replace neon AI badges, cartoon sparkles, and inconsistent card styling with high-density data grids, monochromatic dark obsidian themes, and sharp `tabular-nums` typography.
2. **Unified Split-Pane Workspace**: Seamlessly integrate the primary financial analytics stage (65% width) with a collapsible, context-aware AI Research Copilot (35% width, hotkey `⌘J` / `Ctrl+J`).
3. **Speed & Ergonomics**: Add global keyboard shortcuts (`⌘K` symbol search, `⌘J` AI toggle, `Esc` dismiss), instant tab switches, and clean micro-interactions.
4. **Data Clarity**: Present complex financial metrics (Foreign flow, broker accumulation, P/E, PBV, commodity sensitivity) with clean institutional styling and accessible retail-friendly explanations on hover.

---

## 1. Visual Design & Theme System

### 1.1 Color Palette
- **Obsidian Dark (Default)**:
  - Base background: `#090a0f`
  - Elevated surfaces (cards, docks): `#0f1118`
  - Borders & dividers: `#1b202c`
  - Subtle hover fills: `#161a24`
- **Light Theme**:
  - Base background: `#f8fafc`
  - Elevated surfaces: `#ffffff`
  - Borders: `#e2e8f0`
  - Hover fills: `#f1f5f9`
- **Semantic Accents**:
  - Bullish / Inflow / Positive: Emerald (`#10b981`, badge text `#34d399`, bg `#064e3b33`)
  - Bearish / Outflow / Negative: Crimson / Rose (`#f43f5e`, badge text `#fb7185`, bg `#4c051933`)
  - Informational / System: Slate / Indigo (`#6366f1`, text `#818cf8`, bg `#312e8133`)

### 1.2 Typography & Number Formatting
- Monospace tabular numbers (`font-mono tabular-nums tracking-tight`) for all stock prices, percentage changes, multiples (P/E, PBV), and dates.
- Clean hierarchy with compact line heights to optimize information density without feeling cramped.

---

## 2. Layout Architecture

### 2.1 Top Navigation & Global Ticker Bar
- **Global Macro Ticker**: Compact horizontal ribbon showing live indices (IHSG, USD/IDR, Brent, Coal, Nickel, Gold) with `font-mono tabular-nums`, green/red change pills, and timestamp.
- **Command & Search Bar (`⌘K`)**: Quick ticker search with auto-complete for top IDX stocks, recent history, and analysis mode selector.
- **Header Actions**: Fast buttons to launch tools (Dividend Calculator, Broker Radar, Compare, Jargon Buster) and layout toggle (`⌘J` Copilot toggle, Theme toggle).

### 2.2 Main Stage (65% width)
- **Emiten Header Strip**:
  - Ticker symbol, legal name, industry badge, listing board.
  - Big price display with absolute & percentage change, 52-week high/low range bar.
  - Instant metric strip: Market Cap, P/E, PBV, Dividend Yield, Foreign Net Flow (1D/1W).
- **Workspace Navigation Tabs**:
  1. **Ringkasan (Overview)**: AI executive summary, direct answer to queries, key catalysts & risks.
  2. **Teknikal & Chart**: Interactive candlestick chart with volume, RSI, moving averages (MA20/50/200), and timeframe controls.
  3. **Arus Broker & Whale**: Foreign flow timeline, top 5 buyer/seller brokers, and director/insider transactions.
  4. **Finansial & Peer**: Quarterly revenue & profit bar charts, margins, and peer valuation comparison table.
  5. **Komoditas & Makro**: Direct commodity price correlations (coal, nickel, oil, gold) and FX impact.
  6. **Timeline & Disclosure**: Corporate actions (dividends, rights issues, splits) and IDX filings.

### 2.3 Docked Right Pane: AI Research Copilot (35% width, Collapsible)
- **Persistent Context**: Header displays active stock ticker and status.
- **Chat Stream**:
  - Clean editorial markdown with syntax highlighting.
  - Interactive mini-cards and source citation drawer triggers.
- **Quick Alpha Prompts**: Dynamic contextual prompt chips tuned to the current stock.
- **Chat Input Bar**: Voice input, shortcut hints, and full query submission.

---

## 3. Micro-Interactions & Usability
- **Keyboard Shortcuts**:
  - `⌘K` / `Ctrl+K`: Focus search bar.
  - `⌘J` / `Ctrl+J`: Toggle right Copilot drawer.
  - `Esc`: Close modals and drawers.
- **Responsive Fallback**: On tablets and mobile screens, automatically collapses the copilot into a bottom sheet / drawer accessible via bottom bar.
- **Zero-Flicker State**: Retains analysis report and chat history seamlessly between views.

---

## 4. Testing & Verification Plan
- Build and type-check: `npm run build` with zero errors.
- Visual inspection via `orca_browser`:
  - Verify dark and light themes render with crisp terminal styling.
  - Verify layout responsiveness (split-screen vs collapsed copilot).
  - Verify keyboard shortcuts (`⌘K`, `⌘J`, `Esc`).
  - Verify charts, ticker tape, and interactive modules function smoothly.
