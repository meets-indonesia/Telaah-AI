# Modern Financial Terminal UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Telaah 360 into a unified, high-density Modern Financial Terminal (split-pane 65/35 view with Koyfin/TradingView polish, tabular typography, and keyboard shortcuts `⌘K`/`⌘J`).

**Architecture:** Next.js 14 App Router + Tailwind CSS + Lucide Icons + Recharts. Centralized dark/light CSS variables with high-contrast obsidian neutrals and emerald/rose semantic badges. Split-pane layout with persistent emiten context, responsive collapsible drawer, and refined child analytics modules.

**Tech Stack:** TypeScript, Next.js 14, React 18, Tailwind CSS, Recharts, Lucide React.

**Spec:** `docs/superpowers/specs/2026-09-21-modern-financial-terminal-ui-design.md`

## Global Constraints
- Zero broken imports or type regressions (`npm run build` must pass cleanly).
- Tabular figures (`font-mono tabular-nums`) on all numeric metrics, prices, and changes.
- Monochromatic obsidian theme `#090a0f` / `#0f1118` as primary with crisp borders `#1c202a`.
- Keyboard shortcuts: `⌘K` / `Ctrl+K` for search, `⌘J` / `Ctrl+J` to toggle AI copilot, `Esc` to close drawers.
- No cartoon emojis or neon gradients in analytical cards.

---

### Task 1: Terminal Design Tokens & Theme Foundation
**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Update design tokens in globals.css**
  Define refined dark-first variables (`--background`, `--surface-base`, `--surface-elevated`, `--border-subtle`, `--border-strong`, `--accent-emerald`, `--accent-rose`) and clean typography rules.
- [ ] **Step 2: Update tailwind.config.ts**
  Add terminal color palettes (`terminal-dark`, `terminal-surface`, `terminal-border`, `terminal-emerald`, `terminal-rose`) and mono font defaults.
- [ ] **Step 3: Verify build**
  Run `npm run build` to ensure stylesheet and tailwind compile without errors.
- [ ] **Step 4: Commit**
  `git commit -m "style: add terminal design tokens and theme foundation"`

---

### Task 2: High-Density Macro Ticker Tape & Top Navigation
**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Refactor Header.tsx into institutional terminal bar**
  - Add live compact ticker ribbon with tabular-nums prices and emerald/rose micro-badges.
  - Add quick action triggers (Dividend Calculator, Broker Radar, Compare, Jargon Buster) with sleek text + icon styling.
  - Add keyboard shortcut badges (`⌘K` search, `⌘J` copilot toggle) and clean theme toggle.
- [ ] **Step 2: Verify in browser**
  Check header rendering in dark and light modes using orca_browser.
- [ ] **Step 3: Commit**
  `git commit -m "feat(ui): implement institutional terminal header and ticker ribbon"`

---

### Task 3: Koyfin-Style Emiten Header Strip
**Files:**
- Modify: `src/components/ReportHeader.tsx`

- [ ] **Step 1: Redesign ReportHeader.tsx**
  - Consolidate symbol, legal name, board badge, sector, current price, and 24h change into a crisp single-row trading strip.
  - Display key financial multiples (Market Cap, P/E, PBV, Foreign Net Flow, Dividend Yield) in high-density tabular metric tiles.
  - Clean action buttons for Evidence Drawer, Ask Report, and Export.
- [ ] **Step 2: Verify component rendering**
  Inspect layout responsiveness and ensure zero overflow on mobile/tablet.
- [ ] **Step 3: Commit**
  `git commit -m "feat(ui): redesign ReportHeader into Koyfin-style metric strip"`

---

### Task 4: Unified Split-Pane Terminal Layout in page.tsx
**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/InputStation.tsx`

- [ ] **Step 1: Build the unified split-pane workspace**
  - Primary Stage (65% width): Tabbed workstation for Overview, Technical, Flow & Whale, Financials & Peers, Commodity & Macro, and Filings.
  - Right Dock (35% width, collapsible via `⌘J`): Persistent AI Copilot panel with active stock badge, chat feed, and dynamic stock prompts.
  - Implement global keyboard shortcuts (`⌘K` focus search, `⌘J` toggle copilot, `Esc` dismiss).
- [ ] **Step 2: Streamline InputStation into a command palette style bar**
  Make the ticker input feel like an institutional search bar with quick analysis pills (Quick / Full / 360).
- [ ] **Step 3: Test keyboard shortcuts and split-pane collapse in orca_browser**
  Verify toggling the copilot smoothly resizes the main stage without jumping.
- [ ] **Step 4: Commit**
  `git commit -m "feat(ui): implement unified split-pane terminal layout with keyboard shortcuts"`

---

### Task 5: Clean Institutional Polish on Core Modules & Mini Cards
**Files:**
- Modify: `src/components/chat/StockMiniCard.tsx`
- Modify: `src/components/ClaimCards.tsx`
- Modify: `src/components/TechnicalModule.tsx`
- Modify: `src/components/FlowLensModule.tsx`
- Modify: `src/components/FinancialModule.tsx`

- [ ] **Step 1: Refactor StockMiniCard.tsx**
  Remove juvenile emojis and bright slop banners; format cleanly as an institutional stock summary card with tabular-nums and subtle indicator dots.
- [ ] **Step 2: Refactor ClaimCards.tsx**
  Style direct answers and executive thesis cards with clean editorial typography, structured bullet points, and high-contrast risk/catalyst pills.
- [ ] **Step 3: Refactor TechnicalModule & FlowLensModule**
  Clean up charts, volume bars, and broker tables with sharp borders, dark backgrounds, and clear column alignments.
- [ ] **Step 4: Run build check**
  Run `npm run build` and ensure TypeScript and CSS build cleanly.
- [ ] **Step 5: Commit**
  `git commit -m "feat(ui): elevate modules and mini-cards to institutional polish"`

---

### Task 6: Visual Verification & End-to-End Walkthrough
**Files:**
- Test across `orca_browser` on `http://localhost:3000`

- [ ] **Step 1: Verify dark and light themes**
  Take browser snapshots and verify typography, colors, and contrast.
- [ ] **Step 2: Verify interactive workflows**
  - Switch stock tabs (Overview -> Technical -> Whale -> Financials).
  - Test keyboard shortcuts (`⌘K` focus, `⌘J` toggle copilot).
  - Open and verify tool modals (Dividend Calculator, Broker Radar, Jargon Buster).
- [ ] **Step 3: Commit final adjustments**
  `git commit -m "chore: final terminal polish and verification"`
