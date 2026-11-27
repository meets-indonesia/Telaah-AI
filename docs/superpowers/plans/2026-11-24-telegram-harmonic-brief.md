# Telegram Research Companion + Harmonic Brief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the owner an owner-only Telegram chat for Telaah 360 and a daily multi-timeframe harmonic brief that shortlists five liquid IDX tickers closest to a bullish buy zone.

**Architecture:** A deterministic harmonic engine (ZigZag pivots + XABCD ratio validation + PRZ clustering) runs over Yahoo 1h/5y-daily data resampled into 4H, 1D, 1W, and 1M. A cached screener ranks candidates. A secret-protected Telegram webhook reuses the existing analysis pipeline and sends condensed HTML messages; a host-triggered brief route posts to the owner's channel.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vitest, raw Yahoo REST, native `fetch`, Telegram Bot API, Podman.

**Spec:** `docs/superpowers/specs/2026-11-24-telegram-harmonic-brief-design.md`

## Global Constraints

- No new runtime, database, or Python service for this feature.
- Owner-only bot: webhook secret plus `TELEGRAM_OWNER_ID` allow-list.
- Never log or return `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, or `BRIEF_SECRET`.
- No fabricated prices or patterns. Failed tickers are counted and reported.
- Bullish candidates only in the buy-area shortlist; bearish matches stay diagnostic.
- All timestamps for "today" and the daily schedule use Asia/Jakarta.
- Telegram messages use HTML parse mode, are escaped, and split below 4096 characters.
- Long scans must not block the Telegram webhook: acknowledge first, scan asynchronously.
- `npm test`, `npm run lint`, and `npm run build` must pass.
- Keep existing app behaviour and copy; add warm Indonesian copy only where the spec asks.

## Review Focus

1. A pattern that looks valid but has D far outside its projected PRZ must be rejected, not ranked.
2. A bullish candidate already below its invalidation level must never appear as a buy-area idea.
3. A stranger messaging the bot must get no reply and no analysis.
4. A cold scan with several Yahoo failures must still produce a brief and state reduced coverage.
5. A Telegram message over 4096 characters must arrive in order, with no broken HTML tag.

---

## File Structure

**Create**
- `src/lib/quant/harmonic.ts` — pivots, pattern ratios, PRZ, scoring
- `src/lib/quant/__tests__/harmonic.test.ts`
- `src/lib/market/timeframes.ts` — 1h→4H, daily→weekly/monthly
- `src/lib/market/__tests__/timeframes.test.ts`
- `src/lib/screener/universe.ts`
- `src/lib/screener/harmonic-screener.ts`
- `src/lib/screener/__tests__/harmonic-screener.test.ts`
- `src/lib/agent/analysis-service.ts` — route-free analysis pipeline
- `src/lib/telegram/config.ts`
- `src/lib/telegram/client.ts`
- `src/lib/telegram/format.ts`
- `src/lib/telegram/state.ts`
- `src/lib/telegram/handler.ts`
- `src/lib/telegram/brief.ts`
- `src/lib/telegram/__tests__/*.test.ts`
- `src/app/api/telegram/webhook/route.ts`
- `src/app/api/brief/harmonic/route.ts`
- `src/app/api/brief/__tests__/route.test.ts`
- `scripts/setup_telegram.ts`
- `scripts/test_harmonic.ts`
- `deploy/podman/brief.sh`
- `docs/TELEGRAM_HARMONIC_BRIEF.md`

**Modify**
- `src/lib/market/yahoo.ts` — hourly chart rows
- `src/app/api/analyze/route.ts` — delegate to analysis service
- `.env.example`
- `README.md`
- `TODO.md`

---

### Task 1: Harmonic engine

**Files:**
- Create: `src/lib/quant/harmonic.ts`
- Test: `src/lib/quant/__tests__/harmonic.test.ts`

**Interfaces:**
- Produces: `HarmonicTimeframe`, `HarmonicPattern`, `HarmonicCandle`, `HarmonicPivot`, `HarmonicMatch`, `HarmonicEvaluation`, `TIMEFRAME_CONFIG`, `findPivots(candles, thresholdPct)`, `evaluateHarmonicPoints(points, direction)`, `detectHarmonicPatterns(candles, options)`.

- [ ] **Step 1: Write failing tests** for one synthetic Gartley, Bat, Butterfly, and Crab, plus an invalid AB/XA and a below-invalidation rejection.
- [ ] **Step 2: Run** `npx vitest run src/lib/quant/__tests__/harmonic.test.ts` and confirm failure.
- [ ] **Step 3: Implement** percentage ZigZag, bullish/bearish XABCD validation, PRZ from XA/BC/AB=CD projections, completed/forming status, distance, invalidation, targets, and 0–100 score.
- [ ] **Step 4: Run the test** and confirm pass.
- [ ] **Step 5: Commit** `feat: add multi-timeframe harmonic pattern engine`.

### Task 2: Timeframe data

**Files:**
- Modify: `src/lib/market/yahoo.ts`
- Create: `src/lib/market/timeframes.ts`
- Test: `src/lib/market/__tests__/timeframes.test.ts`, extend `src/lib/market/__tests__/yahoo-chart.test.ts`

**Interfaces:**
- Produces: `YahooClient.getHourlyTransactions(symbol, range?)`, `aggregateToFourHour(rows)`, `aggregateToWeekly(rows)`, `aggregateToMonthly(rows)`, `buildTimeframeCandles(rows, timeframe)`.

- [ ] **Step 1: Write failing aggregation tests** with known OHLCV values and a Jakarta session boundary.
- [ ] **Step 2: Run the tests** and confirm failure.
- [ ] **Step 3: Implement** the hourly chart method (reusing the existing split-adjustment path) and the three aggregators.
- [ ] **Step 4: Run the tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: add intraday and weekly/monthly timeframe data`.

### Task 3: Harmonic screener

**Files:**
- Create: `src/lib/screener/universe.ts`, `src/lib/screener/harmonic-screener.ts`
- Test: `src/lib/screener/__tests__/harmonic-screener.test.ts`

**Interfaces:**
- Produces: `LIQUID_IDX_UNIVERSE`, `HarmonicScanResult`, `HarmonicCandidate`, `scanHarmonicUniverse(options)`, `readHarmonicCache(maxAgeHours)`, `writeHarmonicCache(result)`.

- [ ] **Step 1: Write failing tests** with an injected two-ticker data source: ranking order, top-5 limit, failed-ticker count, cache round-trip.
- [ ] **Step 2: Run the tests** and confirm failure.
- [ ] **Step 3: Implement** the universe list, concurrency-limited scan, per-timeframe RSI, best-match selection, confluence count, ranking, and JSON cache in `data/harmonic_cache.json`.
- [ ] **Step 4: Run the tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: add liquid-IDX harmonic screener with daily cache`.

### Task 4: Analysis service refactor

**Files:**
- Create: `src/lib/agent/analysis-service.ts`
- Modify: `src/app/api/analyze/route.ts`
- Test: existing `src/app/api/__tests__/routes.test.ts`

**Interfaces:**
- Produces: `AnalysisResult` union (`error` | `message` | `confirmation` | `report`) and `runAnalysis({ prompt, mode?, confirmedSymbol? })`.

- [ ] **Step 1: Run existing route tests** to establish a green baseline.
- [ ] **Step 2: Move** the route's validation, conversation guard, classifier, coordinator, synthesizer, and cache calls into `runAnalysis`.
- [ ] **Step 3: Rewrite the route** as a thin mapper from `AnalysisResult` to JSON/status.
- [ ] **Step 4: Run the route tests** and confirm pass with no response-shape changes.
- [ ] **Step 5: Commit** `refactor: extract analysis pipeline for Telegram reuse`.

### Task 5: Telegram bot

**Files:**
- Create: `src/lib/telegram/config.ts`, `client.ts`, `format.ts`, `state.ts`, `handler.ts`, tests
- Create: `src/app/api/telegram/webhook/route.ts`

**Interfaces:**
- Produces: `loadTelegramConfig`, `isOwner`, `createTelegramClient`, `splitTelegramMessage`, `escapeTelegramHtml`, `formatReportMessage`, `formatBriefMessage`, `handleTelegramUpdate`, `getLastSymbol`, `setLastSymbol`.

- [ ] **Step 1: Write failing tests** for owner rejection, secret mismatch, chunking, HTML escaping, `/start`, `/brief` acknowledgement, and a plain greeting.
- [ ] **Step 2: Run the tests** and confirm failure.
- [ ] **Step 3: Implement** config parsing, Bot API client, formatters, persisted last-symbol state, command router, webhook secret check, and async brief kickoff.
- [ ] **Step 4: Run the tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: add owner-only Telegram research bot`.

### Task 6: Brief API and tooling

**Files:**
- Create: `src/app/api/brief/harmonic/route.ts`, `src/lib/telegram/brief.ts`, `scripts/setup_telegram.ts`, `scripts/test_harmonic.ts`, `deploy/podman/brief.sh`
- Test: `src/app/api/brief/__tests__/route.test.ts`

**Interfaces:**
- Produces: `POST /api/brief/harmonic` (`x-brief-secret`, `refresh=1`, `dry=1`), `createBriefDelivery`, `setup_telegram.ts`, `test_harmonic.ts`.

- [ ] **Step 1: Write failing route tests** for missing/wrong secret and dry-run.
- [ ] **Step 2: Run the tests** and confirm failure.
- [ ] **Step 3: Implement** the route, brief delivery helper, setup script, live scanner script, and shell wrapper.
- [ ] **Step 4: Run the tests** and confirm pass.
- [ ] **Step 5: Commit** `feat: add harmonic brief API and Telegram setup scripts`.

### Task 7: Docs, env, and operations

**Files:**
- Modify: `.env.example`, `README.md`, `TODO.md`
- Create: `docs/TELEGRAM_HARMONIC_BRIEF.md`

- [ ] **Step 1: Document** env vars, bot creation, webhook setup, channel setup, cron line, commands, cache, and limitations.
- [ ] **Step 2: Add** the new env keys to `.env.example` with empty values.
- [ ] **Step 3: Commit** `docs: document Telegram harmonic brief operations`.

### Task 8: Verification and live rollout

- [ ] **Step 1: Run** `npm test`, `npm run lint`, `npm run build`.
- [ ] **Step 2: Run** `npx tsx scripts/test_harmonic.ts` on a five-ticker subset; inspect timeframes and PRZ values.
- [ ] **Step 3: Run** a dry full brief: `./deploy/podman/brief.sh dry=1` (or the documented curl).
- [ ] **Step 4: Rebuild and restart** the Podman pod.
- [ ] **Step 5: Configure** the bot token/owner ID, run `npx tsx scripts/setup_telegram.ts`, and verify `getWebhookInfo`.
- [ ] **Step 6: Owner sends `/start`, then `/brief`;** confirm the brief arrives in the configured chat/channel.
- [ ] **Step 7: Commit** any final fixes and update `TODO.md`.
