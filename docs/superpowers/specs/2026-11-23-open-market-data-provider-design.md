# Open Market Data Provider Design
## Telaah 360 tanpa Sectors API: Yahoo Finance + IDX Public Data + Scrapling

**Status:** Proposed  
**Date:** 2026-11-23  
**Supersedes:** Sectors API v2 as the mandatory market-data source. The historical audit `Sectors-API-v2-Audit.md` stays as documentation of what the old provider could do.

---

## 1. Intent and Why

Telaah 360 must keep working after the Sectors API subscription is gone. The app currently depends on Sectors for almost every data module: OHLCV, quarterly financials, valuation, peers, broker summary, foreign flow, insider filings, corporate actions, suspensions, profile, ownership, and commodities.

The goal is not "find one magic open-source API". No single free source covers all of Sectors' IDX data. The workable design is a **composite provider**:

- **Yahoo Finance** for prices, OHLCV, fundamentals, valuation, peers, dividends, splits, indices, and global commodities.
- **IDX public endpoints** via **Scrapling StealthySession (stealth Chromium + Cloudflare solving)** for foreign flow, company profile, management, shareholders, suspensions, the exchange calendar, and as an insider-PDF fallback.
- **Stockbit (optional, user's own session)** for the full per-stock broker summary, structured insider/5% holder movements, and the market-wide insider feed. Stockbit is the primary source when a session is configured.
- **IPOT public broker-summary page** as a best-effort fallback when Stockbit is unavailable. It only exposes the top 10 buyers/sellers, so FlowLens is marked partial in that mode.
- **Google News RSS** for Indonesian news.
- **Sectors adapter kept optional** behind an env flag, so a future key can re-enable it without a rewrite.

The user explicitly chose approach **B** (Yahoo + IDX scraper), asked for **stealth Chromium**, a **market-wide insider feed**, and a **Stockbit session**. This design follows those decisions.

---

## 2. Goals

1. The app runs with **no Sectors API key** and no paid data key.
2. Core research still works end-to-end: company overview, technicals, quarterly financials, valuation, peers, news, dividends/splits, integrity, and trading plan.
3. Foreign flow works from public IDX data; insider filings work from Stockbit when a session is configured, with IDX PDF parsing as a fallback.
4. Per-stock broker summary works fully from Stockbit when configured; IPOT is the top-10 fallback; the UI tells the truth about coverage.
5. The `/insider` page has a **market-wide feed** backed by a scheduled Stockbit ingestion job into SQLite, not a per-request scrape of every PDF.
6. Every report states its data sources, timestamps, coverage, and limitations.
7. The app never fabricates missing data (no hardcoded insider trades, no zero-as-missing, no "Fakta Solid" when key modules are absent).
8. Sectors can be re-enabled later with `MARKET_DATA_PROVIDER=sectors` if a key returns.

## 3. Non-goals

- Guaranteeing 100% feature parity with Sectors (segments, full broker list, exact foreign value, all 962 tickers).
- Building a general-purpose IDX API or a public data redistribution service.
- Replacing OpenRouter or local quantitative engines.
- Real-time streaming quotes.
- Bypassing paywalls or login-only sources.
- Hiding the limitations of free sources from users.

## 4. Anti-goals

- Shipping fake insider transactions or fake broker data to make the UI look complete.
- Treating an unavailable module as "zero" or "neutral" in a way that changes the investment conclusion silently.
- Hammering IDX/IPOT without cache, concurrency limits, or retries.
- Mixing currencies in financial statements without conversion or disclosure.
- Serving yesterday's market data as today's after a cache-version change.

---

## 5. Constraints

- **No paid data key** for the default path.
- **IDX is behind Cloudflare.** The user chose **stealth Chromium**, so the scraper uses Scrapling `StealthySession` with `solve_cloudflare=True` as the primary IDX fetcher. Keep `Fetcher` (Chrome TLS impersonation) as a lightweight fallback for PDFs and for when the browser is unavailable. Recon on 2026-11-23 showed `Fetcher` passes IDX from the development machine; the stealth browser is the production hedge for VPS/Cloudflare variance.
- **Stealth Chromium costs resources.** The Docker image includes a browser (~1–2 GB) and the process needs ~300–600 MB RAM. Recommend 2 vCPU / 4 GB RAM minimum; 2 GB is risky.
- **Stockbit requires the user's own session.** It is an unofficial, undocumented API. Use a private browser session, store only the refresh token (`0600`), and never ask for the Gmail password. The refresh token rotates and lives ~7 days; the scraper must be the sole refresher. Stockbit ToS may prohibit automated access; use personal/educational only.
- **IPOT per-stock broker summary is not officially documented** and returned `502 Bad Gateway` for the whole `/module/saham/include/` path during recon on 2026-11-23. It worked as recently as October 2026 (recorded fixtures in the MIT `fzn0x/idx` project). Treat it as a top-10 fallback only.
- **IDX does not publish per-stock broker buy/sell** through its public `GetBrokerSummary` endpoint; that endpoint is market-wide. Stockbit is the full per-stock source; IPOT is the partial fallback.
- **Yahoo Finance is unofficial** and can rate-limit or change fields. Cache and graceful fallback are mandatory.
- **Financial statements can be reported in USD** (e.g. ADRO) while the stock trades in IDR. Currency normalization is required.
- **Scrapling requires Python 3.10+**. The scraper is a separate service; the Next.js app must still run when it is down.
- **Deployment is PM2 + Docker on a VPS with Node 20.** `yahoo-finance2` v4 requires Node >=22, so pin `yahoo-finance2@^3.15.4` (Node >=20) or implement the small raw Yahoo REST client described in section 12. Do not add v4 unless the VPS Node is upgraded to 22+.
- The scraper will run as a Docker Compose service bound to localhost, with a persistent SQLite feed DB and a mounted Stockbit session file.

---

## 6. Recon Evidence (2026-11-23)

These checks were run directly; they justify the design.

| Source | Check | Result |
|---|---|---|
| Yahoo chart | `BBCA.JK`, `^JKSE`, `^JKLQ45`, `IDX30.JK` | 200, daily OHLCV |
| Yahoo fundamentals-timeseries | BBCA, ADRO, TLKM, ANTM | 200, quarterly revenue/net income/assets/equity/debt/cash/OCF/FCF |
| Yahoo quoteSummary | BBCA via cookie+crumb | 200, PE/PB/market cap/EPS/dividend/ROE/profile/peers |
| Yahoo chart events | BBCA 2y | dividends + splits |
| Yahoo commodities | `GC=F`, `HG=F`, `MTF=F`, `TIO=F` | 200 (coal = API2, not Newcastle; nickel = no data) |
| IDX `GetTradingInfoSS` | BBCA 90 days | 200, `ForeignBuy`, `ForeignSell`, `Close` per day |
| IDX `GetCompanyProfilesDetail` | BBCA | 200, profile, directors, commissioners, shareholders, subsidiaries |
| IDX `GetAnnouncement` | BBCA 2024–2026 | 200, 211 announcements with PDF links |
| IDX insider PDF | BBCA, BBRI, ADRO ownership reports | parsed fields: name, position, before/after shares, transaction type, shares, price, date; consistent layout across issuer types |
| IDX `GetSuspendData` | latest | 200 |
| IDX `GetCalendar` | Nov 2026 | 200, dividends, RUPS, splits, rights, bonus |
| IDX `GetBrokerSummary` | 2026-11-20 | 200, **market-wide** 88 brokers; no per-stock filter |
| IPOT `data-brokersummary.php` | BBCA 2026-11-20 | **502**; whole `/module/saham/include/` path down during recon |
| Stockbit exodus | `/marketdetectors/BBCA`, `/insider/company/majorholder` | **401 without a session**; requires the user's bearer/refresh token |
| Stockbit docs | `fzn0x/idx` MIT docs | browser/local-page login, refresh rotation, full broker list, structured movements |
| Google News RSS | `BBCA saham` | 200, Indonesian headlines |

**Conclusion:** Yahoo + IDX covers the core and most of the specialized modules. Per-stock broker summary is the only module that currently depends on a fragile third-party page (IPOT) and may be unavailable. Stockbit, when the user's session is configured, fills that gap with a full broker list and structured insider movements. The stealth browser path itself was not exercised during recon (no browser installed); it is the production hedge and must be verified on the VPS.

---

## 7. Approaches Considered

### Approach A — Yahoo-only with graceful degradation
- Pros: simplest, no Python service, no scraping.
- Cons: loses broker summary, foreign flow, and insider filings. The user explicitly wants those.
- Verdict: rejected.

### Approach B — Yahoo + IDX/Stockbit/IPOT scraper (chosen)
- Pros: keeps foreign flow and insider filings; Stockbit gives a full broker list and structured movements; no paid key (only the user's own Stockbit session); IPOT is a free fallback.
- Cons: Python service, stealth browser resources, Cloudflare/IPOT fragility, Stockbit session/ToS/rotation, parser maintenance.
- Verdict: **chosen**, with Stockbit as the primary specialized source.

### Approach C — Yahoo + paid/freemium broker API
- Pros: guaranteed per-stock broker data, less scraping.
- Cons: still needs a key; not open source; free tiers are small; coverage varies.
- Verdict: rejected for the default path, but the provider interface leaves room for it.

### Within B

- **B1 — Best-effort IPOT + IDX foreign flow/insider + honest partial status.** If IPOT is down, FlowLens shows foreign flow only, broker panels are hidden, and the report says so. No fake data.
- **B2 — B1 + Stockbit session (chosen).** Stockbit's `exodus` API gives the full broker list and structured insider/5% holder movements, and the market-wide feed is built from it. Requires the user's own session/refresh token; IPOT remains the fallback.
- **B3 — B1 + paid broker API.** Not open source; deferred.

**Decision:** **B2** for this build. Stockbit is primary when configured; IPOT is fallback; IDX PDFs are fallback/audit. If the Stockbit session is missing or expired, the app degrades to B1 and says so.

---

## 8. Architecture

```text
Browser
  └─ Next.js App Router (Node runtime)
       ├─ /api/analyze, /api/compare, /api/watchlist-metrics, /api/insider-feed
       ├─ MarketDataProvider (composite)
       │    ├─ YahooFinanceProvider (HTTP, no key)
       │    │    ├─ chart / fundamentals-timeseries / quoteSummary
       │    │    ├─ recommendationsBySymbol (peers)
       │    │    └─ Google News RSS (news)
       │    ├─ IdxScraperProvider (HTTP -> Python service)
       │    │    └─ /v1/idx/*, /v1/ipot/*
       │    └─ SectorsProvider (optional, only if MARKET_DATA_PROVIDER=sectors)
       ├─ Local quant engines (unchanged)
       ├─ Qdrant semantic cache (dataSource + dataVersion aware)
       └─ OpenRouter synthesis (unchanged)

Python scraper service (FastAPI + Scrapling)
  ├─ StealthySession (Chromium + solve_cloudflare) -> IDX JSON/HTML
  ├─ Fetcher (Chrome TLS impersonation) -> IDX PDFs / fallback
  ├─ StockbitClient (user session, refresh rotation, rate limit)
  │    ├─ /marketdetectors -> full per-stock broker summary
  │    └─ /insider/company/majorholder -> structured movements
  ├─ SQLite feed DB (market-wide insider feed)
  ├─ background ingestion task (Stockbit movements -> SQLite)
  ├─ IPOT public broker summary (HTML, top-10 fallback)
  ├─ TTL + disk cache
  └─ concurrency/retry/backoff
```

The Next.js app never imports Python. It calls the scraper over HTTP with a short timeout. If `SCRAPER_URL` is unset or the service is unhealthy, the app runs Yahoo-only. If Stockbit is unavailable but the scraper is up, FlowLens uses IPOT top-10 and insider uses IDX PDFs.

---

## 9. Data Source Mapping

| Domain method | Primary source | Endpoint / method | Notes / limitations |
|---|---|---|---|
| `getCompanyReport` — overview | IDX profile | `ListedCompany/GetCompanyProfilesDetail` via stealth | sector/sub-sector/industry, address, website, listing board/date, business description |
| `getCompanyReport` — market cap, valuation | Yahoo | `quoteSummary` (`summaryDetail`, `defaultKeyStatistics`) | PE/PB/PS/forward PE/dividend yield/market cap; currency-mixed PB/PS guarded |
| `getCompanyReport` — peers | Yahoo | `recommendationsBySymbol` + `quoteSummary` per peer | top 5 similar tickers; not IDX-IC peer groups |
| `getCompanyReport` — ownership/management | IDX profile | `PemegangSaham`, `Direktur`, `Komisaris` via stealth | richer than Yahoo; includes directors' shareholdings |
| `getQuarterlyFinancials` | Yahoo | `fundamentalsTimeSeries` | quarterly; currency conversion when `currencyCode != IDR` |
| `getDailyTransactions` | Yahoo | `chart` (95 days, 1d, split events) | split-adjusted OHLCV for technicals/chart |
| `getBrokerSummary` | **Stockbit** (primary) / IPOT (fallback) | Stockbit `/marketdetectors/{sym}`; IPOT `data-brokersummary.php` | Stockbit = full broker list; IPOT = top 10; `coverage` tells the UI which |
| `getForeignFlow` | IDX | `ListedCompany/GetTradingInfoSS` via stealth | daily `ForeignBuy`/`ForeignSell` in shares; rupiah = net shares × close (estimate) |
| `getFilings` | **Stockbit** (primary) / IDX PDF (fallback) | Stockbit `/insider/company/majorholder`; IDX `GetAnnouncement` + PDF | Stockbit is structured; IDX form parsing is the fallback/audit |
| `getInsiderFeed` (market-wide) | Stockbit -> SQLite | background `/insider/company/majorholder` ingestion | feed reads SQLite; no per-request market-wide PDF scrape |
| `getSuspensions` | IDX | `Home/GetSuspendData` via stealth | filter by symbol |
| `getCorporateActions` | IDX calendar + Yahoo | `Home/GetCalendar`, chart events | RUPS/dividends/splits/rights/bonus; Yahoo supplies cash amounts |
| `getNews` | Google News RSS | `news.google.com/rss/search` | Indonesian; strip source suffix; cache 15 min |
| `getCompanySegments` | — | unavailable | return `null`; no reliable free segment breakdown |
| `getShareholdersComposition` | — | not used by coordinator | could map IDX profile categories later |
| Indices | Yahoo | `^JKSE`, `^JKLQ45`, `IDX30.JK` | cache 1 hour |
| FX USD/IDR | open.er-api.com | existing | cache 1 hour; used for currency conversion |
| Commodities | Yahoo | `MTF=F` (coal API2), `GC=F`, `HG=F`, `TIO=F` (iron ore) | nickel has no reliable free daily source; label benchmarks accurately. `HG=F` is USD/lb, so convert to USD/ton (×2204.62) for the existing commodity card; `GC=F` is USD/oz. |

### Data not available from free sources
- Per-stock **full** broker summary (IPOT gives top 10 only).
- Nickel daily price (Yahoo has no contract; do not mislabel another contract).
- Revenue by business segment.
- Free, real-time Level 2 order book.
- Official Sectors-style "foreign flow in rupiah" exact values; IDX gives shares, so rupiah is an estimate at close.

---

## 10. Provider Contract

Create `src/lib/market/provider.ts`:

```ts
export type MarketDataCapability =
  | "companyProfile"
  | "valuation"
  | "quarterlyFinancials"
  | "dailyOHLCV"
  | "peers"
  | "news"
  | "corporateActions"
  | "brokerSummary"
  | "foreignFlow"
  | "insiderFilings"
  | "suspensions"
  | "segments";

export interface MarketDataProvider {
  readonly id: "open-market" | "sectors";
  readonly capabilities: ReadonlySet<MarketDataCapability>;

  getBrokersRegistry(): Promise<BrokerRegistryItem[]>;
  getCompanyReport(symbol: string, sections?: CompanyReportSection[]): Promise<CompanyReport | null>;
  getQuarterlyFinancials(symbol: string, nQuarters?: number): Promise<QuarterlyFinancialMetrics[] | null>;
  getDailyTransactions(symbol: string, startDate?: string, endDate?: string): Promise<DailyTransaction[] | null>;
  getBrokerSummary(symbol: string, startDate?: string, endDate?: string): Promise<BrokerSummaryResponse | null>;
  getForeignFlow(symbol: string, startDate?: string, endDate?: string): Promise<ForeignFlowResponse | null>;
  getCorporateActions(symbol: string): Promise<CorporateActionsResponse | null>;
  getFilings(symbol?: string, params?: Record<string, unknown>): Promise<{ results: FilingItem[] } | null>;
  getInsiderFeed(params: { days?: number; limit?: number; type?: "buy" | "sell" | "all" }): Promise<{ results: FilingItem[]; unavailable?: boolean }>;
  getNews(symbol: string, limit?: number): Promise<{ results: NewsItem[] }>;
  getSuspensions(symbol: string): Promise<{ results: any[] } | null>;
  getCompanySegments(symbol: string): Promise<any | null>;

  // Diagnostics for the evidence drawer; open-market reports 0 credits.
  getCreditsUsed(): number;
  getCallLog(): Array<{
    endpoint: string;
    params: Record<string, unknown>;
    credits: number;
    provider: string;
    timestamp: string;
  }>;
}
```

Rules:
- Unsupported or unavailable data returns `null` (or an empty result for news), not a fabricated zero.
- Provider methods may throw only for configuration errors; network/data errors are caught and represented as `null` plus a limitation.
- `capabilities` drives which modules the coordinator fetches and which UI modules render.
- Extend `BrokerSummaryResponse` with `source: "stockbit" | "ipot"` and `coverage: "full" | "top10"`. Extend `FilingItem` with the structured Stockbit/OJK fields listed in section 13.4 and a `source` field.
- Keep the existing `src/lib/sectors/types.ts` as shared domain types for this change to avoid a mass rename. Add a comment that the folder name is legacy. A later refactor can move it to `src/lib/market/types.ts`.

---

## 11. Next.js Modules to Create

| File | Purpose |
|---|---|
| `src/lib/market/provider.ts` | Interface, capability type, provider factory |
| `src/lib/market/open-market.ts` | Composite provider (Yahoo + scraper + news) |
| `src/lib/market/yahoo.ts` | YahooFinance2 wrapper + normalization |
| `src/lib/market/scraper-client.ts` | HTTP client for the Python service, health/circuit breaker |
| `src/lib/market/news.ts` | Google News RSS parser |
| `src/lib/market/fx.ts` | USD/IDR cached rate |
| `src/lib/market/commodities.ts` | Yahoo futures quotes/history |
| `src/lib/market/sectors-provider.ts` | Thin adapter around the existing `SectorsClient` |
| `src/lib/market/index.ts` | `getMarketProvider()` from env |

Modify:
- `src/lib/agent/coordinator.ts` — accept `MarketDataProvider`, use capabilities, track attempted/failed sources, emit `dataLimitations`.
- `src/lib/quant/flow.ts` — return `partial` when broker data is missing but foreign flow exists.
- `src/lib/quant/insider.ts` — remove hardcoded BBCA/BBRI/ADRO seed transactions; accept `filingsAvailable` and return `unavailable` when the provider cannot supply filings.
- `src/lib/quant/integrity.ts` — add data-quality/confidence metadata; do not imply full certainty when flow/insider are absent.
- `src/lib/agent/synthesizer.ts` — include data limitations in the prompt/evidence summary.
- API routes: `analyze`, `compare`, `watchlist-metrics`, `insider-feed`, `market-overview`, `commodity-prices`.
- UI: `FlowLensModule` partial state, `InsiderWhaleRadar` unavailable state, branding/credit labels, market ticker commodity labels.

---

## 12. Yahoo Normalization Rules

**Client choice:** use `yahoo-finance2@^3.15.4`, which supports Node 20, or a small in-house REST client with a cookie/crumb cache for `quoteSummary`. Do not use `yahoo-finance2@4` unless the deployment moves to Node 22+. The normalization rules below are independent of the client.

### `getDailyTransactions`
- `chart(symbol.JK, { period1: 95 days ago, period2: now, interval: "1d", events: "split" })`.
- Map timestamps to `YYYY-MM-DD` in `Asia/Jakarta`.
- **Split handling:** Yahoo raw OHLCV has a price discontinuity on a split. Detect split events inside the window and adjust the pre-split OHLC prices to the latest share basis (multiply by the cumulative split ratio) before computing SMA/MACD/RSI/support-resistance/trading-plan levels. Keep a `splitAdjusted: true` flag and the split metadata in the evidence record. The chart should show the adjusted series so indicators and candles agree; disclose that historical prices are split-adjusted. Do not feed a raw pre-split series into the indicators.
- Drop rows without a close or volume.

### `getQuarterlyFinancials`
- `fundamentalsTimeSeries` with types:
  `quarterlyTotalRevenue`, `quarterlyGrossProfit`, `quarterlyOperatingIncome`, `quarterlyNetIncome`, `quarterlyEBITDA`, `quarterlyTotalAssets`, `quarterlyTotalLiabilities`, `quarterlyStockholdersEquity`, `quarterlyTotalDebt`, `quarterlyCashAndCashEquivalents`, `quarterlyOperatingCashFlow`, `quarterlyFreeCashFlow`, `quarterlyBasicEPS`, `quarterlyOrdinarySharesNumber`.
- Fetch at least `nQuarters + 1` periods so the local YoY calculation has a same-quarter comparison; `financials.ts` uses `periods[length - 5]` for YoY, so prefer 5 periods when available.
- Build a period per `asOfDate`; accept only `periodType: "3M"` (quarterly); skip periods with no monetary values. Sort ascending by date.
- **Currency:** if `currencyCode` is `USD` (or anything not `IDR`), convert monetary fields to IDR using the cached USD/IDR rate. Do **not** convert share counts or per-share prices using the FX rate blindly: EPS in USD must be converted; share counts are unitless.
- Add optional metadata to each period: `currency: "IDR"`, `sourceCurrency: "USD"`, `fxRate` (add fields to `QuarterlyFinancialMetrics`; existing analyzers ignore them).
- If FX is unavailable, return `null` for financials rather than mixing currencies. The UI/report must say financials are unavailable, not show USD numbers formatted as Rp.

### `getCompanyReport`
- `quoteSummary` modules: `price`, `summaryDetail`, `defaultKeyStatistics`, `financialData`, `assetProfile`, `majorHoldersBreakdown`.
- Map:
  - `company_name`: `price.longName` / `price.shortName`; IDX `NamaEmiten` wins.
  - `market_cap`: `summaryDetail.marketCap`.
  - `current_pe`: `summaryDetail.trailingPE`.
  - `current_pb`: `defaultKeyStatistics.priceToBook`.
  - `current_ps`: `summaryDetail.priceToSalesTrailing12Months`.
  - `forward_pe`: `summaryDetail.forwardPE` / `defaultKeyStatistics.forwardPE`.
  - `last_close_price`: `financialData.currentPrice` / `price.regularMarketPrice`.
  - `daily_close_change`: `price.regularMarketChangePercent / 100` (fraction, because `watchlist-metrics` multiplies by 100).
  - `eps`: `defaultKeyStatistics.trailingEps`.
  - `yoy_quarter_revenue_growth`: `financialData.revenueGrowth` (fraction).
  - `yoy_quarter_earnings_growth`: `financialData.earningsGrowth` (fraction).
- IDX profile wins for `overview`, `ownership`, `management`.
- Peers: `recommendationsBySymbol(BBCA.JK)` -> up to 5; fetch `quoteSummary`/`quote` for each; map market cap/PE/PB/dividend yield. Cache 24h.
- **Currency-mixed multiples:** Yahoo can mix USD statements with an IDR price for issuers such as ADRO. `financialData.financialCurrency` states the statement currency. If it is not `IDR`, **do not use** Yahoo's `priceToBook` or `priceToSalesTrailing12Months` (recon showed ADRO PB 13,314x and PS 27,651x, which are mixing artifacts). Prefer Yahoo's `trailingPE` when present (Yahoo normally converts EPS), but compute PB and PS from normalized IDR figures:
  - `marketCapIDR = price * sharesOutstanding`;
  - `PB = marketCapIDR / equityIDR`;
  - `PS = marketCapIDR / revenueTTM_IDR`;
  - `PE = marketCapIDR / netIncomeTTM_IDR` if Yahoo's trailing PE is missing or suspect.
  Use the latest four quarters when available; otherwise mark the multiple as estimated and let the UI show it as such. Never score a multiple that mixes USD and IDR without conversion.
- For peer rows, if `financialData.financialCurrency !== "IDR"`, set PB/PS to `null` rather than showing a mixed-currency value; PE from Yahoo may still be used.
- If `quoteSummary` fails, still return profile/price from chart + IDX; valuation/peers may be missing. Do not throw.

### `getCorporateActions`
- Yahoo chart `events: "div,split"` over 2 years -> `CorporateActionItem[]`.
- IDX `GetCalendar` current+next month -> RUPS/public expose/bonus/rights for the symbol.
- Merge and dedupe by type + date + description.
- Return `{ symbol, corporate_actions: [...] }` directly (the coordinator already accepts an array).

### IDX profile mapping
- `overview`: `NamaEmiten`, `Sektor`, `SubSektor`, `Industri`, `SubIndustri`, `Alamat`, `Website`, `KegiatanUsahaUtama`, `TanggalPencatatan`, `PapanPencatatan`.
- `ownership.major_shareholders`: `PemegangSaham` with category `"Lebih dari 5%"` or a named holder >=5%; exclude `"Masyarakat ..."` and `"Saham Treasury"`.
- `ownership.whale_investors`: directors/commissioners/controllers and other named holders.
- `ownership.conglomerates_group`: controller name, if any.
- `management.key_executives`: `Direktur` + `Komisaris` (`Nama`, `Jabatan`).
- `management.executives_shareholdings`: match director/commissioner names to `PemegangSaham` entries.
- Do not treat the public float lines (`Masyarakat Warkat`, `Masyarakat Non Warkat`) as named shareholders.

### `getNews`
- Google News RSS: `https://news.google.com/rss/search?q=<symbol>+saham&hl=id&gl=ID&ceid=ID:id`.
- Parse `<item>` with `fast-xml-parser`; decode HTML entities.
- Strip `" - <source>"` suffix from title; map `<source>` to `source`, `<pubDate>` to `published_at`, `<link>` to `url`.
- Limit (default 5); cache 15 min; return empty results on failure.

---

## 13. Scraper Service

### 13.1 Runtime
- Python 3.12, FastAPI + Uvicorn.
- **IDX primary fetcher:** Scrapling `StealthySession(headless=True, solve_cloudflare=True, max_pages=2)` with a persistent browser session created in the FastAPI lifespan. A single `asyncio.Lock`/semaphore serializes browser fetches; the browser is expensive, so do not open one per request.
- **Lightweight fallback:** Scrapling `Fetcher(impersonate="chrome", stealthy_headers=True)` for IDX PDFs and for when the browser is unavailable/blocked. If the stealth session fails, try `Fetcher` once before giving up.
- **Stockbit client:** Python `httpx`/`requests` with bearer auth, refresh rotation, a 1 req/sec pacing, and a persistent session file. It never uses the browser.
- **IPOT fallback:** `Fetcher`/`httpx` HTML fetch; no browser.
- All IDX calls go through a semaphore (max 1 browser fetch at a time; max 3 lightweight fetches) and a retry policy:
  - retry on 403/429/5xx and Cloudflare challenge, 3 attempts, backoff 1s/2s/4s;
  - on persistent block, serve a stale cache copy if available, marked `stale: true`, and log the refusal.
- IPOT calls retry on 404/502 with 1s/2s/4s (the old IPOT page is known for spurious 404s; currently 502).
- Never log full response bodies with personal data or tokens; log URL, status, latency, source, and cache hit. Redact `Authorization` headers and `credentialStorage`.

### 13.2 API
All endpoints are `GET`, return JSON, and accept an optional `Authorization: Bearer <SCRAPER_TOKEN>`.

| Endpoint | Returns |
|---|---|
| `/health` | `{ status, sources: { idx, stockbit, ipot, feed }, session: { stockbit: "ok"|"missing"|"expired" }, version, time }` |
| `/v1/idx/profile/{symbol}` | profile, directors, commissioners, shareholders, subsidiaries |
| `/v1/idx/foreign-flow/{symbol}?days=90` | daily foreign buy/sell shares, close, net shares, net rupiah estimate |
| `/v1/idx/suspensions/{symbol}` | suspensions |
| `/v1/idx/corporate-actions/{symbol}?months=2` | calendar events for the symbol |
| `/v1/broker-summary/{symbol}?days=14` | Stockbit full broker list if session works; else IPOT top-10; `coverage`/`source` in meta |
| `/v1/insider/{symbol}?months=12&limit=50` | Stockbit structured movements if session works; else IDX PDF fallback |
| `/v1/insider-feed?days=30&limit=25&type=buy\|sell\|all` | SQLite market-wide feed, populated by the Stockbit ingestion job; `unavailable: true` if no session and no cache |
| `/v1/stockbit/status` | session status (`ok`, `missing`, `expired`, token expiries, last refresh) |

Each response includes:
```json
{
  "data": { ... },
  "meta": {
    "source": "idx",
    "fetchedAt": "2026-11-23T14:00:00Z",
    "cached": false,
    "stale": false,
    "limitations": ["..."]
  }
}
```

### 13.2a Stockbit session (Gmail/Google login)
Yes, the user can sign in with their Gmail/Google account. **We never ask for the Gmail password or 2FA code.** The safe flow is:

1. On the user's own machine, open a **private/incognito** browser window and sign in at `https://stockbit.com/login` with Google/Gmail. Complete whatever Stockbit asks (password, OTP, captcha) yourself.
2. Open DevTools (F12) -> Application -> Cookies -> `https://stockbit.com` -> copy the value of `credentialStorage`.
3. Run `python -m scraper.stockbit_login --manual`, paste the cookie (or pipe it via stdin). The helper parses `state.refresh.token` from the cookie, validates it with one `POST https://exodus.stockbit.com/login/refresh`, and writes `data/stockbit_session.json` with mode `0600`.
4. Copy that file to the VPS (`scp data/stockbit_session.json user@vps:/var/www/telaah-ai/data/`) or put the refresh token in the VPS `.env` as `STOCKBIT_REFRESH_TOKEN`. The file is preferred because the token rotates.
5. Mount the session file into the scraper container (`./data/stockbit_session.json:/app/data/stockbit_session.json:ro` is **not** enough because refresh rotates; mount the directory read-write). The scraper is the **sole refresher**.
6. Close the private window **without signing out**. Do not use the same session in the everyday browser; signing out or another refresher can invalidate the rotating refresh token.

Important:
- Google blocks automated Chromium sign-in ("This browser or app may not be secure"). That is why the manual cookie path is the supported Gmail path. A browser-driven login can be added later for password/OTP accounts, but it is not required.
- Access token lasts ~24h; refresh token ~7 days and rotates on every refresh. The scraper refreshes only when needed and writes the new pair atomically with a file lock. If the refresh token expires, the user repeats the login.
- Stockbit's API is unofficial. Use personal/educational only; it may conflict with Stockbit's ToS and could get an account flagged. Do not run two refreshers (e.g. the scraper and the Stockbit web app) on the same session.

### 13.2b Market-wide insider feed (SQLite)
The feed is a **scheduled ingestion job**, not a per-request scrape.

- Source: Stockbit `GET /insider/company/majorholder?page=N&date_start=YYYY-MM-DD&date_end=YYYY-MM-DD` (50 rows/page, `is_more`).
- Storage: SQLite at `SCRAPER_FEED_DB` (default `/app/data/feed.sqlite`, WAL mode).
- Table `filings`:
  `id TEXT PRIMARY KEY` (SHA-256 of the canonical row), `symbol`, `date`, `holder_name`, `holder_id`,
  `holder_type`, `action`, `source_type`, `shares_change`, `pct_change`, `price`, `value`,
  `estimated_price`, `broker`, `purpose`, `raw_json`, `ingested_at`.
- Table `ingest_state`: `key`, `value` (last successful run, last cursor/page, last error).
- Ingestion loop: every 30 minutes during 08:00–18:00 WIB on weekdays, every 6 hours otherwise. On first run, backfill the last 30 days; subsequently fetch from the last successful date minus 1 day. Dedupe by hash; upsert.
- Rate: 1 request/sec, max 20 pages per run (1000 rows), stop at `is_more=false`. If the session is missing/expired, skip and keep the last DB rows; `/health` reports `feed: stale`.
- Feed endpoint reads SQLite with filters (`days`, `type`, `limit`) and orders by date desc. It does not touch Stockbit.
- If Stockbit is unavailable, the feed can show cached rows marked `stale: true`; if the DB is empty, return `unavailable: true`. Optionally, a lightweight IDX announcement fallback (titles/links only, no PDF parsing) can fill the gap, but it is not required for v1.

### 13.3 IDX endpoints
- Profile: `https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=BBCA&language=id-id`
- Foreign flow: `https://www.idx.co.id/primary/ListedCompany/GetTradingInfoSS?code=BBCA&start=0&length=90`
- Announcements: `https://www.idx.co.id/primary/ListedCompany/GetAnnouncement?kodeEmiten=BBCA&indexFrom=0&pageSize=1000&dateFrom=YYYYMMDD&dateTo=YYYYMMDD&lang=id`
- Suspensions: `https://www.idx.co.id/primary/Home/GetSuspendData?resultCount=100`
- Calendar: `https://www.idx.co.id/primary/Home/GetCalendar?range=m&date=YYYYMMDD`
- Listed stocks (optional): `https://www.idx.co.id/primary/StockData/GetSecuritiesStock?start=0&length=9999`

### 13.4 Insider parsing (Stockbit primary, IDX PDF fallback)

**Stockbit primary** (`GET https://exodus.stockbit.com/insider/company/majorholder?page=N&symbol=BBCA&date_start=...&date_end=...`):
- Rows contain `id` (holder id), `name`, `symbol`, `date` (`"25 Mar 26"`), `previous`/`current`/`changes` (`{value, percentage}`), `action_type` (`ACTION_TYPE_BUY`, `_SELL`, `_TRANSFER`, `_CROSS`, `_RIGHT_ISSUE`, `_PRIVATE_PLACEMENT`, `_TENDER_OFFER`, ...), `data_source.type` (`SOURCE_TYPE_IDX` insider disclosure, `SOURCE_TYPE_KSEI` 5% holder), `nationality`, `badges` (`SHAREHOLDER_BADGE_DIREKTUR`, `_KOMISARIS`), `price.raw.value`, `value.raw.value`, `is_estimated_price`, `purpose`, `broker_detail`.
- Map to `FilingItem`:
  - `holder_name` = `name`; `holder_type` = `insider` if badges include director/commissioner, else `major_holder`;
  - `transaction_type` = action lowercased (`buy`, `sell`, `transfer`, ...);
  - `amount_transaction` = absolute `changes.value`; `price` = non-estimated `price.raw.value`; `transaction_value` = `value.raw.value`;
  - `share_percentage_before` = `previous.percentage`, `share_percentage_after` = `current.percentage`;
  - `date` = parsed `date`; `title` = `<ACTION> by <name>`; `body` = purpose/source; `source` = `IDX`/`KSEI`; `attachment_url` optional.
- Paginate up to 50 rows/page, max 5 pages for a symbol; cache 1 hour.

**IDX PDF fallback** (only when Stockbit is missing/expired or has no rows):
1. Fetch announcements for the last `months` (default 12), page size 1000.
2. Filter titles to the OJK ownership form only: `LAPORAN KEPEMILIKAN ATAU SETIAP PERUBAHAN KEPEMILIKAN SAHAM PERUSAHAAN TERBUKA` and `LAPORAN KEPEMILIKAN SAHAM`. Explicitly exclude `Laporan Bulanan Registrasi Pemegang Efek`, `Perubahan Struktur Pemegang Saham`, and buyback reports; those are not insider transaction forms.
3. For each announcement, take PDF attachments, download (max 3 concurrent, max `limit` filings), extract text with `pypdf`; if text is empty, mark as `unparsed` and keep the filing without transaction fields.
4. Parse the OJK form:
   - `Nama (sesuai SID) : ...`
   - `Jabatan : ...`
   - `Jumlah Saham Sebelum Transaksi : ...`
   - `Jumlah Saham Setelah Transaksi : ...`
   - `Hak Suara Sebelum/Sesudah Transaksi : ...`
   - transaction row containing `Pembelian|Penjualan|Hibah|Waris|Pengalihan` with `Jumlah Saham`, `Harga (Rp)`, `Tanggal Transaksi`.
5. Normalize Indonesian numbers (`1.057.378,00` -> `1057378.00`; `6.982,00` -> `6982.00`) and dates (`25- Mar- 2026` -> `2026-03-25`, with `Mei`/`Agu`/`Okt`/`Des` month mapping).
6. Map to `FilingItem` plus the same structured fields; `holder_type` is `insider` when `Jabatan` is non-empty, else `major_holder`.
7. Cache parsed results by announcement ID + attachment hash. Filings are immutable; parsed results can be cached for 30 days.
8. If no ownership filings are found, return an empty list with a limitation; the Next.js layer must mark the insider module `unavailable`, not `partial`.
9. **Parse-rate policy:** the PDF fallback parses text-based PDFs only. Scanned/image-only filings are still returned in the filing list with their title, date, and attachment link, marked `unparsed: true`; they do not become structured transactions. No OCR/vision dependency in this change. The Stockbit path is structured and does not need PDF parsing; the 70% parse-rate target applies only to the fallback.

### 13.5a Stockbit broker summary (primary)
- URL: `https://exodus.stockbit.com/marketdetectors/BBCA?transaction_type=TRANSACTION_TYPE_GROSS&market_board=MARKET_BOARD_ALL&investor_type=INVESTOR_TYPE_ALL&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=1000`
- Headers: `Authorization: Bearer <access>`, `accept: application/json`, `origin: https://stockbit.com`, `referer: https://stockbit.com/`.
- Response: `data.broker_summary.brokers_buy[]` / `brokers_sell[]`, fields `netbs_broker_code`, `type` (`Asing`/`Lokal`/`Pemerintah`), `freq`, `blot`/`slot` (lots), `blotv`/`slotv` (shares), `bval`/`sval`, `bvalv`/`svalv` (IDR), `netbs_buy_avg_price`/`netbs_sell_avg_price`. Figures may be strings or numbers.
- Build `BrokerSummaryResponse`:
  - one `DailyBrokerSummary` for the range end (or one per day if the API supports daily; the current endpoint returns a range aggregate);
  - buyer rows: `bval`, `blot`, `bavg_per_share`; seller rows: `sval`, `slot`, `savg_per_share`;
  - `nval = bval - sval`, `nlot = blot - slot`, `bfreq`/`sfreq` = `freq` if present;
  - `source: "stockbit"`, `coverage: "full"`.
- Filter support: all/foreign investors and all/regular board are verified; domestic/cash/negotiated are not, so fall back to IPOT for those.
- A 401 means the access token expired: refresh once, retry; a second 401 marks the session expired. A 404 is an unknown symbol; an empty list is a day without trades.

### 13.5b IPOT broker summary parsing (fallback)
- URL: `https://www.indopremier.com/module/saham/include/data-brokersummary.php?code=BBCA&start=MM/DD/YYYY&end=MM/DD/YYYY&fd=all&board=all`
- Parse the HTML table:
  - columns: Buyer, B.Lot, B.Val, B.Avg, #, Seller, S.Lot, S.Val, S.Avg
  - numbers: `352.5 B` -> `352_500_000_000`, `841.2 M` -> `841_200_000`, `2.2 T` -> `2_200_000_000_000`, `5,130` -> `5130`
- Build `BrokerSummaryResponse`:
  - one `DailyBrokerSummary` for the range end;
  - buyer rows: `bval`, `blot`, `bavg_per_share`;
  - seller rows: `sval`, `slot`, `savg_per_share`;
  - `nval = bval - sval`, `nlot = blot - slot`;
  - `bfreq`/`sfreq` = 0 (not published).
- Add `source: "ipot"`, `coverage: "top10"`, and `limitation: "Hanya 10 broker teratas per sisi; bukan daftar lengkap."`.
- If IPOT returns 502/404 after retries, return HTTP 503 with a clear error. The Next.js provider maps it to `null`.

### 13.6 Caching
- Disk cache directory: `SCRAPER_CACHE_DIR` (default `/app/cache` in Docker, `./data/scraper_cache` locally).
- Atomic JSON writes with SHA-256 keys.
- TTLs:
  - profile: 24h
  - foreign flow: 30m during market hours, 24h after close
  - announcements: 6h
  - insider parsed (IDX PDF): 30d
  - Stockbit movements: 1h per symbol; feed DB is incremental
  - suspensions: 30m
  - calendar: 6h
  - Stockbit broker summary: 10m during market hours, 24h after close (range closed)
  - IPOT broker summary: 10m during market hours, 24h after close
  - IPOT/Stockbit failures: negative cache 5m; session-expired flag 5m
- Market hours: 09:00–16:15 WIB, Monday–Friday; use `Asia/Jakarta`.
- Stale-while-error: if a live fetch fails and a cached copy exists, serve it with `stale: true` and the failure reason.

---

## 14. Coordinator and Degradation Rules

### 14.1 Capability-aware fetching
- Only fetch modules the provider supports.
- Track `attempted` and `failed` per source.
- `providerError` is set when **core** data (company report + daily transactions) is missing, or when every supported module failed. It is not set merely because broker summary or segments are unsupported.
- Add `dataLimitations: string[]` to `EvidenceCollectionResult` and the final report. Examples:
  - "Broker summary tidak tersedia; FlowLens hanya menampilkan foreign flow."
  - "Segmen pendapatan tidak tersedia dari sumber gratis."
  - "Laporan keuangan dikonversi dari USD ke IDR pada kurs X."

### 14.2 FlowLens partial state and broker coverage
Change `analyzeFlowLens`:
- If broker summary is missing but foreign flow exists: `status: "partial"`, `topBuyers: []`, `topSellers: []`, `bandarmologySummary: undefined`, `limitationDisclaimer` explains that broker data is unavailable and only foreign flow is shown.
- If both missing: `status: "unavailable"`.
- **Coverage-aware mode:** Stockbit gives the full broker list (`coverage: "full"`) when its session works. IPOT only publishes the top 10 buyers/sellers (`coverage: "top10"`). Add `coverage` and `source` to `BrokerSummaryResponse`. When `coverage === "top10"`:
  - still show the broker table (top buyers/sellers) and foreign flow;
  - **do not** publish `bandarmologySummary` phase/cohort/integrity conclusions, because `totalTurnover` would only be the sum of those rows and the Rp20B/Rp5B thresholds no longer mean what they did with a full broker list;
  - set `status: "partial"` and a limitation such as "Hanya 10 broker teratas per sisi; fase akumulasi/distribusi tidak dihitung."
- `FlowLensModule` renders the foreign flow chart/cards and top-10 table in `partial` mode, with the limitation note. It must not render empty top-buyer/seller panels or a phase badge when coverage is top10.
- `integrity.ts` skips the bandarmology phase check when the summary is absent or coverage is top10; foreign outflow divergence can still be evaluated.
- `dataQuality.brokerFlow` becomes `"full" | "partial" | "none"`, not a boolean.

### 14.3 Insider unavailable state
- Remove the hardcoded BBCA/BBRI/ADRO transactions from `insider.ts`.
- Add a `filingsAvailable: boolean` argument (or equivalent) to `analyzeInsiderCluster`.
- If filings are unavailable (provider returned `null`), return `status: "unavailable"` with a clear summary. Do not return `partial` with a "no insider activity" narrative.
- If filings are available but none parse into transactions, return `partial` with "Tidak ada transaksi insider yang dapat diverifikasi" and list the filings.
- Stockbit rows are already structured; if Stockbit returns no rows for a symbol, fall back to IDX PDFs before declaring unavailable.
- `InsiderWhaleRadar` already hides `unavailable`; add a `partial` note for unparsed PDF fallback filings.

### 14.4 Integrity confidence
Add to `RedFlagAnalysisResult`:
```ts
dataQuality: {
  financials: boolean;
  brokerFlow: boolean;
  insider: boolean;
  valuation: boolean;
};
confidence: "high" | "medium" | "low";
limitations: string[];
```
- If broker flow and insider are both absent: `confidence: "low"`, and the UI shows "Skor berbasis data terbatas (tanpa broker/insider)".
- Do not change the existing verdict enum; add the badge/limitations instead. This avoids breaking UI types.
- The score itself remains a deterministic checklist; the confidence tells the user how much of the checklist was actually available.

### 14.5 Compare route and watchlist
- When foreign flow is unavailable, show "N/A" instead of `+Rp 0.0 M` and do not declare a flow winner.
- When valuation is unavailable, show "N/A" and no winner.
- `retailSummary` must not claim a flow-based conclusion when flow data is missing.
- `watchlist-metrics` returns `flow5d: null` when foreign flow is unavailable; the watchlist table renders `—`/`N/A` rather than `0`.

### 14.6 Trading plan intrinsic value
`tradingPlan.ts` currently uses `intrinsicVal = multiples.intrinsicValue || currentPrice * 1.25`. Yahoo/IDX supply no intrinsic value, so the fallback invents a fair value and feeds it into long-term TP1/TP2. **Remove the invented fallback.** For this change:
- If `valuation.intrinsicValue` is present (legacy Sectors path), use it.
- Otherwise, label the long-term targets as **technical projections** derived from resistance/pivot levels, and add a limitation to the trading plan and modal: "Target jangka panjang dihitung dari level teknikal, bukan nilai intrinsik fundamental."
- Do not add a DCF/intrinsic-value engine in this change; that is a separate product decision.

---

## 15. Cache and Freshness

### 15.1 Yahoo/scraper caches
- Yahoo: in-memory TTL map (prices 5m, fundamentals 1h, profile/peers 24h, news 15m, commodities 1h).
- Scraper: disk TTL cache as above.
- Market overview: existing 1-hour disk cache, now fed by Yahoo/fx/commodities.
- Never cache errors as success. Negative cache IPOT for 5 minutes only.

### 15.2 Semantic cache versioning
- Add `dataSource: "open-market"` and `dataVersion: 1` to `VectorCachePayload`.
- `searchSemanticReportCache` filters on `dataSource` and `dataVersion`; old Sectors points are ignored.
- Add Qdrant payload indexes for `dataSource` and `dataVersion` (optional but recommended).
- When `MARKET_DATA_PROVIDER=sectors`, use `dataSource: "sectors"` and the same versioning.
- Browser localStorage: add `dataSource`/`dataVersion` to stored reports and ignore mismatches when reopening history. Do not show an old Sectors report as if it were freshly fetched open-market data.

### 15.3 Report metadata
`CompanyIntelligenceReport` gains:
- `dataSource: "open-market" | "sectors"`;
- `dataVersion: 1`;
- `dataLimitations: string[]`;
- `creditsConsumed` remains for compatibility but is `0` for open-market;
- `toolCallTrace` entries gain `provider: "yahoo" | "idx" | "ipot" | "google-news"` and keep `credits: 0`.

---

## 16. UI and Copy Changes

- Replace "Sectors API v2" / "Sectors v2" branding with **"Yahoo Finance + IDX + Stockbit"** or **"Open Market Data"**. Do not call Yahoo/Stockbit official.
- Sidebar quota bar: replace "Kredit" with a compact data-source line, e.g. `Yahoo · IDX · Stockbit`. If the scraper is unhealthy, show `Yahoo only`; if Stockbit is missing, show `Yahoo · IDX · IPOT`.
- `EvidenceDrawer`: show provider name and "0 kredit" or simply "Sumber: IDX/Yahoo" instead of a credit count.
- `ShareModal` / `ShareAlphaCardModal`: update data-source note to "Data publik Yahoo Finance, IDX, Stockbit/IPOT; dapat tertunda/tidak lengkap."
- Market ticker labels:
  - `MTF=F` -> "Coal API2" (not Newcastle Coal);
  - `HG=F` -> "COMEX Copper" (not LME Copper);
  - `GC=F` -> "COMEX Gold";
  - `TIO=F` -> "Iron Ore 62% Fe";
  - no nickel card if the data is unavailable; show a note instead of a fake price.
- `technical/page.tsx` loading copy: "Memuat data transaksi 90 hari ... dari Yahoo Finance..."
- `qa/route.ts` fallback answer: "Berdasarkan data pasar yang tersedia..." not "data resmi Sectors API".
- **`/insider` page:** the market-wide feed is now backed by the Stockbit SQLite feed. Add a small banner when the Stockbit session is `missing`/`expired`: "Feed market-wide memerlukan sesi Stockbit; menampilkan data terakhir/…". The per-symbol radar still works via IDX PDF fallback.
- **Market-cap rank:** `market_cap_rank` is not available from the free sources. Drop the "Peringkat #N" badge or render `—`; do not build a nightly all-market rank job in this change.
- **Commodity page:** `analyzeCommodityLens` is intentionally stubbed, and the page's issuer/commodity/market-cap table is hardcoded. Do not present those static market caps as live data. For this change, make the commodity page **benchmark-only** (Coal API2, Gold, Copper, Iron Ore) and either remove the hardcoded issuer table or label it clearly as a static, non-live illustrative list. Rebuilding issuer→commodity sensitivity is out of scope.
- Add a small "Data limitations" section in the report/Sidebar when `dataLimitations` is non-empty.

---

## 17. Security, Legal, and Operational Rules

- **Yahoo Finance** is an unofficial API. The app must not claim official data. Use it for personal/educational research; for commercial redistribution, use a licensed provider.
- **IDX/Stockbit/IPOT scraping** is for personal/educational use. Respect their terms, robots.txt where applicable, and rate limits. Do not redistribute raw data as a standalone API.
- **Stockbit session security:** never ask for or store the Gmail password/2FA code. The user signs in themselves; the helper stores only `credentialStorage`'s refresh token, mode `0600`. Do not log the token or cookie. Do not commit `stockbit_session.json`. The token rotates; the scraper is the sole refresher. Using the same session in the Stockbit web app can invalidate it.
- **Stockbit ToS:** the API is unofficial; automated access may conflict with Stockbit's Terms and could flag the account. Make the session optional and document the risk. Do not enable it by default without the user's explicit choice.
- The scraper binds to `127.0.0.1:8001` in production; do not expose it publicly. If it must be reachable over a network, require `SCRAPER_TOKEN`.
- Do not store personal data from insider filings/PDFs beyond the fields needed for the report. Do not log full PDF text or raw Stockbit rows with holder identities beyond the DB.
- Add a `User-Agent` that identifies the app and contact URL; avoid pretending to be a browser beyond what is needed for Cloudflare.
- Add a kill switch: `SCRAPER_ENABLED=false` disables all scraper calls; `STOCKBIT_ENABLED=false` disables Stockbit and falls back to IPOT/IDX PDF; `MARKET_DATA_PROVIDER=sectors` reverts to the old provider if a key exists.
- No secrets in the browser. `SCRAPER_TOKEN`, `STOCKBIT_REFRESH_TOKEN`, and the session file stay server-side.
- Add `data/stockbit_session.json`, `data/feed.sqlite`, and `data/scraper_cache/` to `.gitignore`. The feed DB contains public holder names; keep it local and back it up only if needed.

---

## 18. Deployment

### Local development
```bash
# terminal 1: scraper (install browsers once)
cd scraper
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
scrapling install            # stealth Chromium + fingerprint deps
uvicorn app:app --host 127.0.0.1 --port 8001 --reload

# Stockbit session (one-time, on your own machine)
python -m scraper.stockbit_login --manual
# paste the credentialStorage cookie after signing in with Gmail in a private window

# terminal 2: Next.js
npm run dev
```

`.env`:
```env
MARKET_DATA_PROVIDER=open
SCRAPER_URL=http://127.0.0.1:8001
SCRAPER_TOKEN=
SCRAPER_BROWSER_FALLBACK=false
STOCKBIT_SESSION_FILE=./data/stockbit_session.json
STOCKBIT_REFRESH_TOKEN=
SCRAPER_FEED_DB=./data/feed.sqlite
# Optional; only for MARKET_DATA_PROVIDER=sectors
SECTORS_API_KEY=
```

### Production preflight (must run on the actual VPS)
The recon ran from the development machine, not the VPS. Before promising IDX modules in production, run the same checks from the VPS:
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://www.idx.co.id/primary/ListedCompany/GetTradingInfoSS?code=BBCA&start=0&length=5"
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://www.indopremier.com/module/saham/include/data-brokersummary.php?code=BBCA&start=11/20/2026&end=11/20/2026&fd=all&board=all"
```
- The scraper uses stealth Chromium first. Verify `/v1/idx/profile/BBCA` and `/v1/idx/foreign-flow/BBCA?days=5` from the VPS; check `/health` for `idx: ok`.
- If stealth Chromium fails, try the `Fetcher` fallback. If both fail, the app degrades to Yahoo-only and the report says so.
- Do not add a paid residential proxy by default. That is a cost decision for the human.
- Record the preflight result in the scraper `/health` output and the deployment notes.

### Docker Compose
Add:
```yaml
  telaah-scraper:
    build: ./scraper
    container_name: telaah-scraper
    restart: unless-stopped
    ports:
      - "127.0.0.1:8001:8001"
    environment:
      - SCRAPER_CACHE_DIR=/app/cache
      - SCRAPER_TOKEN=${SCRAPER_TOKEN:-}
      - STOCKBIT_SESSION_FILE=/app/data/stockbit_session.json
      - SCRAPER_FEED_DB=/app/data/feed.sqlite
    volumes:
      - ./data/scraper_cache:/app/cache
      - ./data:/app/data          # Stockbit session (rw: refresh rotates) + feed.sqlite
    shm_size: "1gb"               # Chromium
```

The scraper image uses the Scrapling browser image (or `python:3.12-slim` + `scrapling install`) + `pypdf` + FastAPI. It includes Chromium. Expected image size is large (~1–2 GB); build it once.

Update `DEPLOY_VPS.md`:
- Add scraper setup, `scrapling install`, Stockbit session copy, and health check.
- Add `docker compose up -d --build` to the deploy workflow.
- Recommended VPS: 2 vCPU / **4 GB RAM minimum** with stealth Chromium; 8 GB if comfortable. 2 GB is not safe.
- Add `curl http://127.0.0.1:8001/health`.
- Document the Stockbit session rotation: copy `stockbit_session.json` once; the scraper rewrites it; do not run a second refresher.

Update `.github/workflows/deploy.yml`:
- `docker compose up -d --build` (so the scraper image rebuilds).
- Keep `npm install`, `npm run build`, PM2 reload.

---

## 19. Migration and Rollout

The Sectors key is already gone, so the app is broken today. Plan a **phased rollout** rather than a single big-bang cutover:

**Phase 1 — Yahoo-only core (first deployable)**
1. Add the provider interface and the Yahoo/fx/news/commodities modules.
2. Version the Qdrant/local caches.
3. **Remove the hardcoded insider seed data and make `analyzeInsiderCluster` return `unavailable` when filings are not supplied.** This must happen before the first open-provider deploy; otherwise Yahoo-only reports would show fake BBCA/BBRI/ADRO insider buys.
4. Switch `market-overview`, `commodity-prices`, `watchlist-metrics`, `compare`, and `analyze` to the open provider with scraper capabilities disabled.
5. Result: the app runs without Sectors; flow/insider show honest "tidak tersedia" states.

**Phase 2 — Scraper service**
6. Add the Python scraper with stealth Chromium, IDX profile/foreign flow/calendar/suspensions, IPOT fallback, and IDX PDF insider fallback.
7. Add the Stockbit client/session/refresh, full broker summary, structured insider movements, and the SQLite market-wide feed ingestion.
8. Enable the scraper capabilities; FlowLens is full with Stockbit, partial top-10 with IPOT, or foreign-flow-only when neither works.

**Phase 3 — Polish**
9. Update UI copy/branding/docs, add limitations banners, and the Stockbit session status banner.

Keep `SectorsClient` and a thin adapter behind `MARKET_DATA_PROVIDER=sectors`. Because no Sectors key is available, this rollback is **code-only and unverified**; do not advertise it as a tested fallback. If a key returns, run the adapter smoke test before relying on it.

---

## 20. Testing and Verification

### Python scraper
- `pytest` with fixtures, no live network:
  - IDX profile JSON normalization.
  - IDX foreign-flow JSON normalization.
  - Insider form text parser (synthetic text based on the OJK form; no personal data).
  - IPOT broker summary HTML parser (fixture from the MIT `fzn0x/idx` project, with attribution).
  - Stockbit broker summary JSON parser (fixture from the MIT `fzn0x/idx` project, with attribution).
  - Stockbit movement row -> `FilingItem` mapping; date parsing; signed shares/percentages.
  - Stockbit auth refresh rotation with a fake backend: access expired -> one refresh -> new pair persisted; second 401 -> session expired, no loop.
  - Feed ingestion dedupe/upsert with a fake page; `is_more` pagination; stale DB behavior.
  - Number abbreviation parser (`M`, `B`, `T`).
  - Cache TTL/stale behavior.
  - IPOT 502 -> clear error -> no fake data.
- `ruff`/`black` optional; at minimum `python -m compileall`.
- Stealth browser: a manual smoke test on the VPS (not CI); log the preflight result.

### TypeScript
- Add `vitest` and `npm run test`:
  - Yahoo normalization (fixture JSON -> domain types).
  - Currency conversion: USD statements -> IDR; share counts untouched; missing FX -> null.
  - Capability routing: scraper down -> no broker/insider calls; Yahoo-only report.
  - FlowLens partial state.
  - Insider unavailable vs partial.
  - Cache version filter.
- `npm run lint` and `npm run build` must pass with zero TypeScript errors.

### Live smoke test
- `scripts/test_open_market.ts`:
  - BBCA: Yahoo daily + financials + profile; IDX foreign flow; insider filings; broker summary (expected maybe unavailable).
  - ADRO: USD financials -> IDR conversion.
  - Assert prices are finite and dates are recent.
- Manual: run scraper, `curl /health`, `curl /v1/idx/foreign-flow/BBCA?days=10`, then open the app and analyze BBCA.

### Acceptance criteria
- App builds and runs with `SECTORS_API_KEY` unset.
- BBCA analysis produces technical, financial, valuation, profile, news, dividends, foreign flow, and insider modules.
- With a working Stockbit session: broker summary has `coverage: "full"`; FlowLens can compute bandarmology; `/insider` feed returns rows from SQLite without scraping PDFs per request.
- With Stockbit missing/expired but IPOT up: broker summary is `coverage: "top10"`; FlowLens is `partial` and suppresses phase/cohort conclusions.
- With both broker sources down: FlowLens shows foreign-flow-only partial/unavailable and no fake broker rows.
- If scraper is down, analysis still completes with Yahoo-only data and a visible limitation.
- No old Sectors report is served from Qdrant/localStorage under the new data version.
- No hardcoded insider transactions appear in any report.
- No Gmail password/2FA is ever requested or stored; the session file is `0600` and not committed.

---

## 21. Files to Create / Modify (high level)

**Create**
- `src/lib/market/provider.ts`
- `src/lib/market/open-market.ts`
- `src/lib/market/yahoo.ts`
- `src/lib/market/scraper-client.ts`
- `src/lib/market/news.ts`
- `src/lib/market/fx.ts`
- `src/lib/market/commodities.ts`
- `src/lib/market/sectors-provider.ts`
- `src/lib/market/index.ts`
- `scraper/app.py`
- `scraper/settings.py`
- `scraper/cache.py`
- `scraper/sources/idx.py`
- `scraper/sources/ipot.py`
- `scraper/sources/stockbit.py`
- `scraper/sources/stockbit_auth.py`
- `scraper/sources/insider.py`
- `scraper/feed.py`
- `scraper/stockbit_login.py`
- `scraper/models.py`
- `scraper/requirements.txt`
- `scraper/Dockerfile`
- `scraper/README.md`
- `scraper/tests/...`
- `scripts/test_open_market.ts`
- `docs/superpowers/plans/2026-11-23-open-market-data-provider.md` (next step)

**Modify**
- `src/lib/agent/coordinator.ts`
- `src/lib/agent/synthesizer.ts`
- `src/lib/agent/types.ts`
- `src/lib/quant/flow.ts`
- `src/lib/quant/insider.ts`
- `src/lib/quant/integrity.ts`
- `src/lib/storage/market-cache.ts`
- `src/lib/vector/qdrant.ts`
- `src/app/api/analyze/route.ts`
- `src/app/api/compare/route.ts`
- `src/app/api/watchlist-metrics/route.ts`
- `src/app/api/insider-feed/route.ts`
- `src/app/api/market-overview/route.ts`
- `src/app/api/commodity-prices/route.ts`
- `src/app/api/qa/route.ts`
- UI components listed in section 16
- `docker-compose.yml`
- `.env.example`
- `.gitignore`
- `.github/workflows/deploy.yml`
- `DEPLOY_VPS.md`
- `README.md`
- `API-MAP-Telaah-360.md` (mark Sectors sections as legacy; add new source map)

---

## 22. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| IDX Cloudflare blocks the VPS | Stealth Chromium primary; `Fetcher` fallback; retries; stale cache; clear limitation |
| Stealth Chromium OOM on a small VPS | 4 GB RAM minimum; `shm_size: 1gb`; single browser session; `max_pages=2`; monitor `/health` |
| Stockbit session expires/rotates/logs out | File-backed refresh with lock; `status` endpoint; fallback to IPOT/IDX PDF; user re-runs login |
| Stockbit ToS/account risk | Optional, explicit user choice; personal use; rate limit; document risk |
| Feed ingestion stops/stale | `/health` reports feed age; serve last rows with `stale: true`; alert in UI |
| IPOT endpoint stays down | Stockbit primary; IPOT top-10 fallback; partial FlowLens; no fake data |
| Yahoo changes fields/rate-limits | Cache; fallback to chart + timeseries; provider error surfaced; optional Sectors fallback |
| Yahoo data missing for small caps | Partial/unavailable modules; never invent numbers; app remains usable for liquid names |
| Insider PDFs vary by issuer | Multiple regex strategies; mark unparsed filings; keep titles/links; no fake transactions |
| USD-reporting issuers | FX conversion + metadata; skip if FX unavailable |
| Old Sectors cache served | `dataSource`/`dataVersion` filter; localStorage versioning |
| Scraper becomes a security hole | localhost binding, optional bearer token, no raw PDF logging, kill switch |
| Too many PDF downloads | Limit months/filings, cache parsed results, concurrency cap |
| Free-source legal/ToS risk | personal/educational disclaimer; no redistribution; recommend licensed API for commercial use |

---

## 23. Decisions Left to the Builder

These are implementation calls, not open product questions:

- Exact retry counts/backoff (start with 3 attempts, 1s/2s/4s).
- Exact PDF parser regex fallbacks (must be fixture-tested).
- Whether to include the optional stealth browser in the default Docker image (default: no).
- Whether to expose a `/api/data-sources` health route (nice-to-have).
- Exact UI wording for limitations.
- Whether to add the optional Stockbit adapter in this build (default: no; leave an interface hook).

## 24. Decisions and Remaining Operational Questions

### Decided by the user

1. **Stealth Chromium** is the primary IDX fetcher; `Fetcher` is the lightweight fallback. The scraper image includes a browser; VPS needs at least 4 GB RAM.
2. **Market-wide insider feed** is in scope. It is backed by a scheduled Stockbit ingestion job into SQLite, not per-request PDF scraping.
3. **Stockbit session** is in scope. Stockbit is the primary broker-summary and insider source; IPOT and IDX PDFs are fallbacks.

### Gmail/Google login (answer)

Yes, the user can sign in with Gmail, but **not by giving the agent the Gmail password or 2FA code**. Google blocks automated browser sign-in. The supported flow is:
1. Sign in at `stockbit.com` with Google in a private/incognito window.
2. Copy the `credentialStorage` cookie from DevTools.
3. Run `python -m scraper.stockbit_login --manual` and paste the cookie.
4. Copy the resulting `data/stockbit_session.json` to the VPS.
The helper stores only the refresh token (`0600`) and validates it with Stockbit. If the token expires (~7 days), repeat the flow.

### Remaining operational questions

- **VPS specs:** confirm the VPS has at least 4 GB RAM (8 GB preferred) for stealth Chromium. If it has 2 GB, the browser may OOM; the app will fall back to Yahoo-only.
- **Stockbit account risk:** confirm the user accepts that this is an unofficial API, may conflict with Stockbit's ToS, and could flag the account. Keep `STOCKBIT_ENABLED=false` if not acceptable.
- **Session setup timing:** the user needs to run the login helper and place the session file on the VPS before the full broker/feed features work. Until then, the app degrades to IPOT/IDX PDF or Yahoo-only.

### Safe defaults (override if you disagree)

- **Nickel:** no reliable free daily source; show Coal API2, Gold, Copper, and Iron Ore, and mark nickel unavailable.
- **Old Sectors reports:** ignore them via `dataSource`/`dataVersion`; do not serve them as fresh open-market data.
- **Commodity page:** benchmark-only; remove or clearly label the hardcoded issuer table. No issuer→commodity sensitivity rebuild in this change.
- **Market-cap rank:** drop the badge/`—`; no nightly all-market rank job.
- **Scanned PDFs:** list them with links, mark `unparsed`, no OCR in v1.
- **Sectors rollback:** adapter retained but unverified without a key.

---

## 25. Approval

This design replaces Sectors as the default source while keeping it optional. It uses Yahoo Finance for market/fundamental data, IDX public endpoints via Scrapling stealth Chromium for foreign flow/profile/calendar, Stockbit for full broker summary and structured insider movements, a SQLite-backed market-wide feed, and IPOT/IDX PDF as fallbacks.

**No code will be written until this document is approved.**
