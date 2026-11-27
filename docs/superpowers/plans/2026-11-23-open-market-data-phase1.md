# Open Market Data Phase 1 Implementation Plan
## Yahoo Finance provider, no Sectors key required

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mandatory Sectors API with a Yahoo Finance-backed market-data provider so Telaah 360 runs without a paid data key.

**Architecture:** A `MarketDataProvider` interface sits in front of a composite `OpenMarketProvider`. Phase 1 implements the provider with a small raw Yahoo REST client (chart, fundamentals-timeseries, quoteSummary with cookie/crumb, recommendations), Google News RSS, Yahoo indices/commodities, and the existing quant engines. Sectors remains as an optional adapter. Scraper/Stockbit capabilities are intentionally absent in Phase 1 and return `null`/`unavailable`; Phase 2 adds them behind the same interface.

**Tech Stack:** Next.js 14 App Router, TypeScript, Vitest, native `fetch`, `fast-xml-parser`, Recharts (unchanged), OpenRouter (unchanged).

**Spec:** `docs/superpowers/specs/2026-11-23-open-market-data-provider-design.md`

---

## Global Constraints

- Node 20+; do **not** add `yahoo-finance2@4` (it requires Node 22). Use the raw Yahoo REST client in this plan.
- Default `MARKET_DATA_PROVIDER=open`; `sectors` is optional and only works with a key.
- No fabricated data. Unsupported/unavailable modules return `null` or `status: "unavailable"`, never zero-as-missing or seed data.
- USD-reported financial statements must be converted to IDR; share counts are never FX-converted.
- OHLCV must be split-adjusted before indicators/chart/trading-plan math.
- Cache payloads must carry `dataSource`/`dataVersion`; old Sectors reports must not be served.
- No API keys or tokens in the browser. All provider calls are server-side.
- Keep the existing visual language and component structure; do not redesign the app in Phase 1.
- `npm run lint`, `npm test`, and `npm run build` must pass with zero TypeScript errors.
- Phase 1 excludes the Python scraper, stealth Chromium, Stockbit, the SQLite feed, and IPOT. Those are Phase 2 and will be a separate plan.

## Review Focus

These are the failure modes most likely to bite a user in Phase 1; each has a test in the task that owns the code.

1. **ADRO-style USD reporters:** PB/PS must not mix USD statements with an IDR price; compute from normalized IDR equity/revenue or return `null`.
2. **A stock split inside the 95-day window:** OHLCV must be adjusted before indicators and trading-plan levels; raw pre-split prices are wrong.
3. **Sectors removed:** a Yahoo-only report must complete, keep technicals/financials/valuation/news, and show honest limitations for flow/insider.
4. **Old Sectors cache:** a Qdrant/localStorage report without the new `dataSource`/`dataVersion` must not be served.
5. **Missing flow/valuation in compare/watchlist:** show `N/A`/`—` and no winner, never `0` or a false conclusion.

---

## File Structure

**Create**
- `vitest.config.ts`
- `src/lib/market/errors.ts`
- `src/lib/market/fx.ts`
- `src/lib/market/yahoo.ts`
- `src/lib/market/news.ts`
- `src/lib/market/commodities.ts`
- `src/lib/market/indices.ts`
- `src/lib/market/provider.ts`
- `src/lib/market/open-market.ts`
- `src/lib/market/sectors-provider.ts`
- `src/lib/market/index.ts`
- `src/lib/market/__tests__/fx.test.ts`
- `src/lib/market/__tests__/yahoo-chart.test.ts`
- `src/lib/market/__tests__/yahoo-financials.test.ts`
- `src/lib/market/__tests__/yahoo-valuation.test.ts`
- `src/lib/market/__tests__/news.test.ts`
- `src/lib/market/__tests__/commodities.test.ts`
- `src/lib/market/__tests__/provider.test.ts`
- `src/lib/agent/__tests__/coordinator.test.ts`
- `src/lib/quant/__tests__/flow.test.ts`
- `src/lib/quant/__tests__/insider.test.ts`
- `src/lib/quant/__tests__/integrity.test.ts`
- `src/lib/quant/__tests__/tradingPlan.test.ts`
- `src/lib/vector/__tests__/qdrant.test.ts`
- `src/lib/storage/__tests__/history.test.ts`
- `scripts/test_open_market.ts`

**Modify**
- `package.json`
- `src/lib/sectors/types.ts`
- `src/lib/agent/types.ts`
- `src/lib/agent/coordinator.ts`
- `src/lib/agent/synthesizer.ts`
- `src/lib/quant/flow.ts`
- `src/lib/quant/insider.ts`
- `src/lib/quant/integrity.ts`
- `src/lib/quant/tradingPlan.ts`
- `src/lib/vector/qdrant.ts`
- `src/lib/storage/history.ts`
- `src/lib/storage/market-cache.ts`
- `src/app/api/analyze/route.ts`
- `src/app/api/compare/route.ts`
- `src/app/api/watchlist-metrics/route.ts`
- `src/app/api/insider-feed/route.ts`
- `src/app/api/market-overview/route.ts`
- `src/app/api/commodity-prices/route.ts`
- `src/app/api/qa/route.ts`
- `src/components/FlowLensModule.tsx`
- `src/components/InsiderWhaleRadar.tsx`
- `src/components/ReportHeader.tsx`
- `src/components/Sidebar.tsx`
- `src/components/EvidenceDrawer.tsx`
- `src/app/insider/page.tsx`
- `src/components/ShareModal.tsx`
- `src/components/retail/ShareAlphaCardModal.tsx`
- `src/components/chat/ChatFeed.tsx`
- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/RumorFactCheckerCard.tsx`
- `src/components/chat/StockCompareCard.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/technical/page.tsx`
- `src/app/watchlist/page.tsx`
- `src/app/commodity/page.tsx`
- `.env.example`
- `README.md`
- `API-MAP-Telaah-360.md`
- `DEPLOY_VPS.md`

---

### Task 1: Vitest harness and USD/IDR FX module

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/market/errors.ts`
- Create: `src/lib/market/fx.ts`
- Test: `src/lib/market/__tests__/fx.test.ts`

**Interfaces:**
- Produces: `getUsdIdrRate(fetchImpl?: typeof fetch): Promise<number | null>`, `clearFxCache(): void`, `MarketDataError`.
- `MarketDataError` constructor: `(message: string, source: string, kind?: "network" | "not_found" | "blocked" | "provider" | "config")`.

- [ ] **Step 1: Install Vitest and add the test script**

Run:
```bash
npm install -D vitest tsx
```
Modify `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 3: Write the failing test**

`src/lib/market/__tests__/fx.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearFxCache, getUsdIdrRate } from "../fx";

beforeEach(() => clearFxCache());

describe("getUsdIdrRate", () => {
  it("returns the IDR rate and caches it for the TTL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ rates: { IDR: 16250 } }), { status: 200 })
    );
    expect(await getUsdIdrRate(fetchMock)).toBe(16250);
    expect(await getUsdIdrRate(fetchMock)).toBe(16250);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when the provider fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("boom", { status: 503 }));
    expect(await getUsdIdrRate(fetchMock)).toBeNull();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/lib/market/__tests__/fx.test.ts`
Expected: FAIL because `../fx` does not exist.

- [ ] **Step 5: Implement `MarketDataError` and `fx.ts`**

`src/lib/market/errors.ts`:
```ts
export type MarketDataErrorKind = "network" | "not_found" | "blocked" | "provider" | "config";

export class MarketDataError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly kind: MarketDataErrorKind = "provider"
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}

export function marketDataErrorMessage(error: unknown): string {
  if (error instanceof MarketDataError) return error.message;
  return "Sumber data pasar tidak dapat diakses. Coba lagi beberapa saat.";
}
```

`src/lib/market/fx.ts`:
```ts
const FX_URL = "https://open.er-api.com/v6/latest/USD";
const TTL_MS = 60 * 60 * 1000;

let cached: { rate: number; expiresAt: number } | null = null;

export function clearFxCache(): void {
  cached = null;
}

export async function getUsdIdrRate(fetchImpl: typeof fetch = fetch): Promise<number | null> {
  if (cached && cached.expiresAt > Date.now()) return cached.rate;
  try {
    const res = await fetchImpl(FX_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = Number(data?.rates?.IDR);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    cached = { rate, expiresAt: Date.now() + TTL_MS };
    return rate;
  } catch {
    return null;
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/lib/market/__tests__/fx.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/market/errors.ts src/lib/market/fx.ts src/lib/market/__tests__/fx.test.ts
git commit -m "test: add vitest harness and USD/IDR FX cache"
```

---

### Task 2: Yahoo daily OHLCV with split adjustment

**Files:**
- Create: `src/lib/market/yahoo.ts`
- Test: `src/lib/market/__tests__/yahoo-chart.test.ts`

**Interfaces:**
- Produces: `toYahooSymbol(symbol: string): string`.
- Produces: `class YahooClient` with constructor:
  ```ts
  {
    fetchImpl?: typeof fetch;
    now?: () => number;
    getUsdIdrRate?: () => Promise<number | null>;
    getQuarterlyFinancials?: (symbol: string, nQuarters?: number) => Promise<QuarterlyFinancialMetrics[] | null>;
  }
  ```
  and `getDailyTransactions(symbol: string, startDate?: string, endDate?: string): Promise<DailyTransaction[]>`, `getCallLog(): CallLogEntry[]`.
- `CallLogEntry` shape: `{ endpoint: string; params: Record<string, unknown>; credits: 0; provider: "yahoo"; timestamp: string }`.

- [ ] **Step 1: Write the failing test**

`src/lib/market/__tests__/yahoo-chart.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { YahooClient, toYahooSymbol } from "../yahoo";

const chartBody = {
  chart: {
    result: [{
      meta: { symbol: "BBCA.JK", currency: "IDR" },
      timestamp: [1700000000, 1700086400, 1700172800],
      indicators: { quote: [{
        open: [100, 50, 51], high: [102, 52, 53], low: [99, 49, 50],
        close: [101, 51, 52], volume: [1000, 2000, 3000],
      }] },
      events: { splits: { "1700086400": { numerator: 2, denominator: 1, splitRatio: "2:1" } } },
    }],
  },
};

describe("YahooClient.getDailyTransactions", () => {
  it("maps and split-adjusts OHLCV", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(chartBody), { status: 200 }));
    const client = new YahooClient({ fetchImpl: fetchMock });
    const rows = await client.getDailyTransactions("BBCA", "2026-08-20");
    expect(rows).toHaveLength(3);
    expect(rows[0].close).toBeCloseTo(50.5);
    expect(rows[0].volume).toBe(2000);
    expect(rows[1].close).toBe(51);
    expect(rows[2].close).toBe(52);
    expect(fetchMock.mock.calls[0][0]).toContain("BBCA.JK");
    expect(fetchMock.mock.calls[0][0]).toContain("events=split");
  });

  it("throws MarketDataError when Yahoo returns no result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ chart: { result: null, error: { code: "Not Found" } } }), { status: 200 }));
    const client = new YahooClient({ fetchImpl: fetchMock });
    await expect(client.getDailyTransactions("ZZZZ")).rejects.toMatchObject({ kind: "not_found" });
  });
});

describe("toYahooSymbol", () => {
  it("adds .JK exactly once", () => {
    expect(toYahooSymbol("BBCA")).toBe("BBCA.JK");
    expect(toYahooSymbol("BBCA.JK")).toBe("BBCA.JK");
    expect(toYahooSymbol("^JKSE")).toBe("^JKSE");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/market/__tests__/yahoo-chart.test.ts`
Expected: FAIL because `../yahoo` does not exist.

- [ ] **Step 3: Implement the chart path in `yahoo.ts`**

Requirements:
- `toYahooSymbol` returns `^` symbols unchanged, adds `.JK` only when absent.
- `getDailyTransactions` builds `https://query1.finance.yahoo.com/v8/finance/chart/{encodedSymbol}?period1={unix}&period2={unix}&interval=1d&events=split`.
- `period1` defaults to 95 days before `now`; `period2` defaults to now.
- Parse `chart.result[0]`; throw `MarketDataError("...", "yahoo", "not_found")` when missing.
- For each split event within the window: for bars with timestamp `< splitTimestamp`, multiply OHLC by `denominator / numerator` and volume by `numerator / denominator`. Apply the cumulative factor for multiple splits.
- Map timestamps to `YYYY-MM-DD` in `Asia/Jakarta`.
- Sort ascending; drop rows with no finite close or volume.
- Push a call-log entry with provider `yahoo`, credits `0`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/market/__tests__/yahoo-chart.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/market/yahoo.ts src/lib/market/__tests__/yahoo-chart.test.ts
git commit -m "feat: add split-adjusted Yahoo daily OHLCV client"
```

---

### Task 3: Yahoo quarterly financials with USD→IDR conversion

**Files:**
- Modify: `src/lib/market/yahoo.ts`
- Modify: `src/lib/sectors/types.ts`
- Test: `src/lib/market/__tests__/yahoo-financials.test.ts`

**Interfaces:**
- Produces: `YahooClient.getQuarterlyFinancials(symbol: string, nQuarters?: number): Promise<QuarterlyFinancialMetrics[] | null>`.
- Extends `QuarterlyFinancialMetrics` with optional `currency?: string`, `sourceCurrency?: string`, `fxRate?: number`.

- [ ] **Step 1: Write the failing test**

`src/lib/market/__tests__/yahoo-financials.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { YahooClient } from "../yahoo";

function series(type: string, asOfDate: string, raw: number, currencyCode: string, periodType = "3M") {
  return {
    meta: { type: [type] },
    timestamp: [1],
    [type]: [{ asOfDate, periodType, currencyCode, reportedValue: { raw } }],
  };
}

const body = {
  timeseries: { result: [
    series("quarterlyTotalRevenue", "2026-09-30", 902_262_000, "USD"),
    series("quarterlyNetIncome", "2026-09-30", 207_186_000, "USD"),
    series("quarterlyStockholdersEquity", "2026-09-30", 5_031_405_000, "USD"),
    series("quarterlyOrdinarySharesNumber", "2026-09-30", 28_800_494_200, "USD"),
    series("quarterlyTotalRevenue", "2025-09-30", 1_000_000_000, "USD", "12M"),
  ] },
};

describe("YahooClient.getQuarterlyFinancials", () => {
  it("converts USD monetary values to IDR and leaves shares alone", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    const client = new YahooClient({ fetchImpl: fetchMock, getUsdIdrRate: async () => 16000 });
    const rows = await client.getQuarterlyFinancials("ADRO", 4);
    expect(rows).toHaveLength(1);
    expect(rows![0].revenue).toBe(902_262_000 * 16000);
    expect(rows![0].earnings).toBe(207_186_000 * 16000);
    expect(rows![0].total_equity).toBe(5_031_405_000 * 16000);
    expect(rows![0].currency).toBe("IDR");
    expect(rows![0].sourceCurrency).toBe("USD");
    expect(rows![0].fxRate).toBe(16000);
    expect(rows![0].financials_sector_metrics?.ordinary_shares).toBe(28_800_494_200);
  });

  it("returns null when FX is needed but unavailable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    const client = new YahooClient({ fetchImpl: fetchMock, getUsdIdrRate: async () => null });
    expect(await client.getQuarterlyFinancials("ADRO", 4)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/market/__tests__/yahoo-financials.test.ts`
Expected: FAIL because `getQuarterlyFinancials` is not implemented.

- [ ] **Step 3: Implement the financials path**

Requirements:
- URL: `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/{symbol}?symbol={symbol}&type=...&period1=...&period2=...`.
- Types: `quarterlyTotalRevenue`, `quarterlyGrossProfit`, `quarterlyOperatingIncome`, `quarterlyNetIncome`, `quarterlyEBITDA`, `quarterlyTotalAssets`, `quarterlyTotalLiabilities`, `quarterlyStockholdersEquity`, `quarterlyTotalDebt`, `quarterlyCashAndCashEquivalents`, `quarterlyOperatingCashFlow`, `quarterlyFreeCashFlow`, `quarterlyBasicEPS`, `quarterlyOrdinarySharesNumber`.
- Group by `asOfDate`; accept only `periodType === "3M"`; sort ascending; take the last `nQuarters + 1` (minimum 5 when available).
- Map monetary fields to IDR when `currencyCode !== "IDR"` using `getUsdIdrRate` (injected, default imported FX). If any needed conversion has no rate, return `null`.
- Map shares to `financials_sector_metrics.ordinary_shares` without conversion.
- Add `currency: "IDR"`, `sourceCurrency`, `fxRate`.
- Map: revenue, gross_profit, operating_pnl (operating income), earnings (net income), ebitda, total_assets, total_liabilities, total_equity (stockholders equity), total_debt, cash_and_short_term_investments, operating_cash_flow, free_cash_flow.
- Extend `QuarterlyFinancialMetrics` in `src/lib/sectors/types.ts`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/market/__tests__/yahoo-financials.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/market/yahoo.ts src/lib/sectors/types.ts src/lib/market/__tests__/yahoo-financials.test.ts
git commit -m "feat: add Yahoo quarterly financials with USD to IDR normalization"
```

---

### Task 4: Yahoo quoteSummary, valuation guard, and peers

**Files:**
- Modify: `src/lib/market/yahoo.ts`
- Modify: `src/lib/sectors/types.ts`
- Test: `src/lib/market/__tests__/yahoo-valuation.test.ts`

**Interfaces:**
- Produces: `YahooClient.getCompanySnapshot(symbol: string, sections?: CompanyReportSection[]): Promise<Partial<CompanyReport> | null>`.
- Produces: `YahooClient.getCorporateActions(symbol: string): Promise<CorporateActionItem[]>`.
- `getCompanySnapshot` returns `overview`, `valuation`, `financials`, `peers`, `management`.
- Valuation rule: if `financialData.financialCurrency !== "IDR"`, compute `current_pb` from `marketCap / equityIDR` and `current_ps` from `marketCap / revenueTTM_IDR`; do not use Yahoo `priceToBook`/`priceToSalesTrailing12Months`.
- Extends `ValuationData` with optional `financialCurrency?: string`, `multipleBasis?: "reported" | "computed"`.

- [ ] **Step 1: Write the failing test**

`src/lib/market/__tests__/yahoo-valuation.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { YahooClient } from "../yahoo";

const quoteSummary = {
  quoteSummary: { result: [{
    price: { longName: "PT Alamtri Resources Indonesia Tbk", regularMarketPrice: 2330, regularMarketChangePercent: 0.43, currency: "IDR" },
    summaryDetail: { marketCap: 67_105_152_040_960, trailingPE: 5.8781977, forwardPE: 4.512356, priceToSalesTrailing12Months: 27651.088 },
    defaultKeyStatistics: { sharesOutstanding: 28_800_494_200, trailingEps: 396.38, priceToBook: 13314.286 },
    financialData: { currentPrice: 2330, financialCurrency: "USD", revenueGrowth: 0.84, earningsGrowth: 0.643 },
    assetProfile: { sector: "Energy", industry: "Thermal Coal", longBusinessSummary: "Coal miner", website: "https://example.com" },
  }] },
};

describe("YahooClient.getCompanySnapshot", () => {
  it("computes PB/PS from IDR financials for a USD reporter", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 200, headers: { "set-cookie": "A=1; Path=/" } }))
      .mockResolvedValueOnce(new Response("crumb-1", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(quoteSummary), { status: 200 }));
    const client = new YahooClient({
      fetchImpl: fetchMock,
      getUsdIdrRate: async () => 16000,
      getQuarterlyFinancials: async () => [{
        symbol: "ADRO", date: "2026-09-30", revenue: 15_000_000_000_000,
        total_equity: 80_500_000_000_000, earnings: 3_300_000_000_000,
      }] as any,
    });
    const snap = await client.getCompanySnapshot("ADRO");
    expect(snap?.valuation?.current_pe).toBeCloseTo(5.8781977);
    expect(snap?.valuation?.current_pb).toBeCloseTo(0.833);
    expect(snap?.valuation?.current_pb).not.toBe(13314.286);
    expect(snap?.valuation?.multipleBasis).toBe("computed");
    expect(snap?.overview?.sector).toBe("Energy");
  });

  it("maps peers and nulls peer PB when the peer reports in USD", async () => {
    const recommendations = { finance: { result: [{ symbol: "ADRO.JK", recommendedSymbols: [{ symbol: "BBRI.JK", score: 0.4 }] }] } };
    const peerSummary = { quoteSummary: { result: [{
      price: { longName: "PT Bank Rakyat Indonesia", regularMarketPrice: 5200 },
      summaryDetail: { marketCap: 78_000_000_000_000, trailingPE: 11.8 },
      defaultKeyStatistics: { priceToBook: 2.1 },
      financialData: { financialCurrency: "USD" },
    }] } };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 200, headers: { "set-cookie": "A=1; Path=/" } }))
      .mockResolvedValueOnce(new Response("crumb-1", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(quoteSummary), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(recommendations), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(peerSummary), { status: 200 }));
    const client = new YahooClient({ fetchImpl: fetchMock, getUsdIdrRate: async () => 16000, getQuarterlyFinancials: async () => [] });
    const snap = await client.getCompanySnapshot("ADRO", ["overview", "valuation", "peers"]);
    expect(snap?.peers?.[0]?.peers_data?.companies?.[0]?.symbol).toBe("BBRI");
    expect(snap?.peers?.[0]?.peers_data?.companies?.[0]?.pb).toBeNull();
  });

  it("maps dividends and splits from chart events", async () => {
    const eventsBody = { chart: { result: [{ meta: { symbol: "BBCA.JK" }, timestamp: [1700000000], indicators: { quote: [{ open: [1], high: [1], low: [1], close: [1], volume: [1] }] }, events: { dividends: { "1700000000": { amount: 25 } }, splits: { "1700086400": { numerator: 2, denominator: 1, splitRatio: "2:1" } } } }] } };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(eventsBody), { status: 200 }));
    const client = new YahooClient({ fetchImpl: fetchMock });
    const actions = await client.getCorporateActions("BBCA");
    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ action_type: "Dividen Tunai", amount: 25 }),
      expect.objectContaining({ action_type: "Stock Split", ratio: "1:2" }),
    ]));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/market/__tests__/yahoo-valuation.test.ts`
Expected: FAIL because `getCompanySnapshot` is not implemented.

- [ ] **Step 3: Implement quoteSummary with cookie/crumb and valuation guard**

Requirements:
- `ensureSession()`:
  - GET `https://fc.yahoo.com` with `redirect: "manual"`; collect `set-cookie` values via `headers.getSetCookie()` or fallback `headers.get("set-cookie")`.
  - GET `https://query1.finance.yahoo.com/v1/test/getcrumb` with `Cookie` header; store the crumb.
  - Cache both for 6 hours; on 401/429 clear and retry once.
- `quoteSummary` URL: `https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}?modules=price,summaryDetail,defaultKeyStatistics,financialData,assetProfile&crumb={crumb}`.
- `getCompanySnapshot`:
  - Map `overview` from `price`/`assetProfile`.
  - Map `valuation` with `last_close_price`, `daily_close_change` (percent/100), `current_pe`, `forward_pe`, `current_pb`, `current_ps`, `financialCurrency`, `multipleBasis`.
  - If `financialCurrency !== "IDR"`: call `getQuarterlyFinancials` (injected or default) for the latest equity/revenue/earnings; compute `marketCap / equity`, `marketCap / revenue`, and PE fallback `marketCap / (earnings * 4)` only if Yahoo PE missing; mark `multipleBasis: "computed"`. Never use Yahoo PB/PS.
  - Map `financials` with `eps`, `yoy_quarter_revenue_growth`, `yoy_quarter_earnings_growth`.
  - Map `management.key_executives` from `assetProfile.companyOfficers` (`name`, `title`).
  - `ownership` returns empty arrays in Phase 1.
  - Peers: call `https://query1.finance.yahoo.com/v6/finance/recommendationsbysymbol/{symbol}`; take up to 5; fetch `quoteSummary` for each (cache 24h); set PB/PS null if peer `financialCurrency !== "IDR"`; map to `PeerData[]` with `peers_data.companies` and `group_name.sector` from the target overview.
  - If `sections` excludes `peers`, skip peer calls.
  - `getCorporateActions`: chart `events=div,split` over 2 years; map dividends to `{ date, action_type: "Dividen Tunai", description, amount, ex_date }` and splits to `{ date, action_type: "Stock Split", description, ratio: "1:<numerator/denominator>" }`; sort descending.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/market/__tests__/yahoo-valuation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/market/yahoo.ts src/lib/sectors/types.ts src/lib/market/__tests__/yahoo-valuation.test.ts
git commit -m "feat: add Yahoo snapshot with currency-safe valuation and peers"
```

---

### Task 5: Google News RSS, indices, and commodities

**Files:**
- Create: `src/lib/market/news.ts`
- Create: `src/lib/market/indices.ts`
- Create: `src/lib/market/commodities.ts`
- Test: `src/lib/market/__tests__/news.test.ts`
- Test: `src/lib/market/__tests__/commodities.test.ts`

**Interfaces:**
- `fetchGoogleNews(symbol: string, limit?: number, fetchImpl?: typeof fetch): Promise<NewsItem[]>`.
- `getMarketIndices(fetchImpl?: typeof fetch): Promise<MarketItem[]>`.
- `getCommodityPrices(fetchImpl?: typeof fetch): Promise<CommodityQuote[]>`.
- `CommodityQuote`: `{ name, code, unit, latestPrice, changePct, history: Array<{ date, price }> }`.
- `MarketItem` is a **type-only** import from `@/lib/storage/market-cache` (`import type`), because `market-cache` imports `indices`; no runtime cycle.

- [ ] **Step 1: Write the failing news test**

```ts
import { describe, expect, it, vi } from "vitest";
import { fetchGoogleNews } from "../news";

const rss = `<?xml version="1.0"?><rss><channel>
<item><title>BBCA naik - Kontan</title><link>https://example.com/a</link><pubDate>Mon, 23 Nov 2026 08:00:00 GMT</pubDate><source url="https://kontan.co.id">Kontan</source></item>
<item><title>BBCA turun - Bisnis</title><link>https://example.com/b</link><pubDate>Mon, 23 Nov 2026 09:00:00 GMT</pubDate><source url="https://bisnis.com">Bisnis</source></item>
</channel></rss>`;

it("parses Indonesian Google News RSS and strips the source suffix", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(rss, { status: 200 }));
  const items = await fetchGoogleNews("BBCA", 1, fetchMock);
  expect(items).toHaveLength(1);
  expect(items[0].title).toBe("BBCA naik");
  expect(items[0].source).toBe("Kontan");
  expect(Number.isNaN(Date.parse(items[0].published_at!))).toBe(false);
});
```

- [ ] **Step 2: Write the failing commodities/indices test**

```ts
it("returns the four Yahoo benchmarks and converts copper lb to ton", async () => {
  const chart = (price: number) => ({ chart: { result: [{ timestamp: [1700000000, 1700086400], indicators: { quote: [{ close: [price, price] }] } }] } });
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(chart(104.75)), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(chart(3669.5)), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(chart(5.74)), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(chart(161.91)), { status: 200 }));
  const quotes = await getCommodityPrices(fetchMock);
  expect(quotes).toHaveLength(4);
  expect(quotes.find((q) => q.code === "COAL")?.latestPrice).toBe(104.75);
  expect(quotes.find((q) => q.code === "COPPER")?.latestPrice).toBeCloseTo(5.74 * 2204.62);
  expect(quotes.find((q) => q.code === "COAL")?.unit).toBe("USD / Ton");
  expect(quotes.find((q) => q.code === "NICKEL")).toBeUndefined();
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/market/__tests__/news.test.ts src/lib/market/__tests__/commodities.test.ts`
Expected: FAIL because modules do not exist.

- [ ] **Step 4: Implement the modules**

- Install `fast-xml-parser`.
- News: URL `https://news.google.com/rss/search?q=<encoded symbol>+saham&hl=id&gl=ID&ceid=ID:id`; parse XML; decode entities; strip `" - <source>"`; map title/link/pubDate/source; cache 15 min.
- Indices: Yahoo chart for `^JKSE` (`IHSG`), `^JKLQ45` (`LQ45`), `IDX30.JK` (`IDX30`); last two closes for change; format price with `toLocaleString("id-ID")`.
- Commodities:
  - `MTF=F` -> `Coal API2`, `USD / Ton`, factor 1;
  - `GC=F` -> `COMEX Gold`, `USD / Oz`, factor 1;
  - `HG=F` -> `COMEX Copper`, `USD / Ton`, factor 2204.62 (lb→ton);
  - `TIO=F` -> `Iron Ore 62% Fe`, `USD / Ton`, factor 1.
  - Use `range=1mo&interval=1d`; last 24 points; change vs previous.
- No nickel entry. Do not fake one.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/market/__tests__/news.test.ts src/lib/market/__tests__/commodities.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/market/news.ts src/lib/market/indices.ts src/lib/market/commodities.ts src/lib/market/__tests__/news.test.ts src/lib/market/__tests__/commodities.test.ts
git commit -m "feat: add Google News RSS, Yahoo indices, and commodity quotes"
```

---

### Task 6: Provider interface, OpenMarketProvider, factory, Sectors adapter

**Files:**
- Create: `src/lib/market/provider.ts`
- Create: `src/lib/market/open-market.ts`
- Create: `src/lib/market/sectors-provider.ts`
- Create: `src/lib/market/index.ts`
- Modify: `src/lib/sectors/types.ts`
- Test: `src/lib/market/__tests__/provider.test.ts`

**Interfaces:**
- `MarketDataProvider` exactly as in the spec, including `getInsiderFeed`, `getCreditsUsed`, `getCallLog`.
- `MarketDataCapability` union.
- `CompanyReportSection` union.
- `CallLogEntry` shape.
- `OpenMarketProvider` constructor: `{ yahoo?: YahooClient; news?: typeof fetchGoogleNews; scraper?: undefined }`.
- `getMarketProvider(): MarketDataProvider` reads `process.env.MARKET_DATA_PROVIDER` (`open` default, `sectors` allowed).
- `SectorsProvider` delegates to `SectorsClient`; add `id`, `capabilities`, `getCreditsUsed`, `getCallLog` with `provider: "sectors"`.
- Extend `BrokerSummaryResponse` with `source?: "stockbit" | "ipot"`, `coverage?: "full" | "top10"`.
- Extend `FilingItem` with optional structured fields and `source?: string`.
- Extend `ForeignFlowItem` with `net_foreign_shares?: number`, `close?: number`.

- [ ] **Step 1: Write the failing test**

`src/lib/market/__tests__/provider.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { OpenMarketProvider } from "../open-market";
import { getMarketProvider } from "../index";

const yahoo = {
  getCompanySnapshot: vi.fn().mockResolvedValue({ overview: { company_name: "PT Bank Central Asia Tbk" }, valuation: { current_pe: 12 } }),
  getQuarterlyFinancials: vi.fn().mockResolvedValue([]),
  getDailyTransactions: vi.fn().mockResolvedValue([]),
  getCorporateActions: vi.fn().mockResolvedValue([]),
  getCallLog: vi.fn().mockReturnValue([]),
};

it("exposes Yahoo capabilities and returns null for scraper-only modules", async () => {
  const provider = new OpenMarketProvider({ yahoo: yahoo as any });
  expect(provider.capabilities.has("dailyOHLCV")).toBe(true);
  expect(provider.capabilities.has("brokerSummary")).toBe(false);
  expect(await provider.getBrokerSummary("BBCA")).toBeNull();
  expect(await provider.getForeignFlow("BBCA")).toBeNull();
  expect(await provider.getFilings("BBCA")).toBeNull();
  expect((await provider.getInsiderFeed({})).unavailable).toBe(true);
});

it("factory defaults to open", () => {
  delete process.env.MARKET_DATA_PROVIDER;
  expect(getMarketProvider().id).toBe("open-market");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/market/__tests__/provider.test.ts`
Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement the interface and open provider**

Requirements:
- `OpenMarketProvider.getCompanyReport`: call `yahoo.getCompanySnapshot`; return `null` if no snapshot. It may return partial `CompanyReport`; fill `company_name` from overview or symbol.
- `getQuarterlyFinancials`, `getDailyTransactions`, `getCorporateActions`, `getNews`: delegate.
- `getBrokersRegistry`: read `data/brokers_registry.json` (same as SectorsClient).
- Unsupported Phase 1 methods: `getBrokerSummary` -> null, `getForeignFlow` -> null, `getFilings` -> null, `getSuspensions` -> null, `getCompanySegments` -> null, `getInsiderFeed` -> `{ results: [], unavailable: true }`.
- `getCreditsUsed` -> 0; `getCallLog` -> Yahoo call log.
- `SectorsProvider` delegates all methods; `capabilities` includes all. Its `getInsiderFeed` calls `getFilings(undefined, params)` and maps the results, so the Sectors path keeps a market-wide feed.
- `getMarketProvider`:
  - `open` (default): `new OpenMarketProvider()`;
  - `sectors`: `new SectorsProvider()`; if `SECTORS_API_KEY` missing, throw a `MarketDataError` with kind `config`.
- Add type extensions.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/market/__tests__/provider.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/market/provider.ts src/lib/market/open-market.ts src/lib/market/sectors-provider.ts src/lib/market/index.ts src/lib/sectors/types.ts src/lib/market/__tests__/provider.test.ts
git commit -m "feat: add market data provider interface and Yahoo-only provider"
```

---

### Task 7: Capability-aware coordinator and data limitations

**Files:**
- Modify: `src/lib/agent/coordinator.ts`
- Modify: `src/lib/agent/types.ts`
- Test: `src/lib/agent/__tests__/coordinator.test.ts`

**Interfaces:**
- `executeEvidencePlan(provider: MarketDataProvider, symbol, mode, intent, claims): Promise<EvidenceCollectionResult>`.
- `EvidenceCollectionResult` adds `dataLimitations: string[]`.
- Uses `provider.capabilities`; unsupported methods are not called.
- `insiderRadar` gets `filingsAvailable` (true only when `getFilings` is supported and returned non-null).
- Throws `MarketDataError` only when both `getCompanyReport` and `getDailyTransactions` return `null` (core data missing).

- [ ] **Step 1: Write the failing test**

`src/lib/agent/__tests__/coordinator.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { executeEvidencePlan } from "../coordinator";

vi.mock("@/lib/quant/indicators", () => ({ computeTechnicalIndicators: () => ({ trendAssessment: "Neutral", lastPrice: 100, chartSeries: [] }) }));
vi.mock("@/lib/quant/financials", () => ({ analyzeFinancialHealth: () => ({ status: "unavailable", latest: null, periods: [] }) }));
vi.mock("@/lib/quant/flow", () => ({ analyzeFlowLens: () => ({ status: "unavailable", foreignFlow: { cumulative5d: 0, series: [] } }) }));
vi.mock("@/lib/quant/insider", () => ({ analyzeInsiderCluster: (_f: unknown, _m: unknown, _o: unknown, _s: string, _p: number, available: boolean) => ({ status: available ? "partial" : "unavailable" }) }));
vi.mock("@/lib/quant/commodity", () => ({ analyzeCommodityLens: () => ({ isCommodityIssuer: false }) }));
vi.mock("@/lib/quant/integrity", () => ({ calculateIntegrityScore: () => ({ score: 100, verdict: "Fakta Solid", riskCount: { danger: 0, warning: 0, pass: 0 } }) }));
vi.mock("@/lib/quant/tradingPlan", () => ({ calculateTradingPlan: () => ({ horizons: { swing: { label: "Swing", rrr: 2 } }, bestFitHorizon: "swing", supports: { s1: 1 }, resistances: { r1: 2 } }) }));

function makeProvider() {
  return {
    id: "open-market",
    capabilities: new Set(["companyProfile", "valuation", "quarterlyFinancials", "dailyOHLCV", "news", "corporateActions"]),
    getCompanyReport: vi.fn().mockResolvedValue({ company_name: "BBCA", overview: { company_name: "BBCA" } }),
    getDailyTransactions: vi.fn().mockResolvedValue([{ date: "2026-11-20", open: 1, high: 2, low: 1, close: 2, volume: 100, symbol: "BBCA" }]),
    getQuarterlyFinancials: vi.fn().mockResolvedValue([]),
    getCorporateActions: vi.fn().mockResolvedValue({ symbol: "BBCA", corporate_actions: [] }),
    getNews: vi.fn().mockResolvedValue({ results: [] }),
    getBrokerSummary: vi.fn(),
    getForeignFlow: vi.fn(),
    getFilings: vi.fn(),
    getSuspensions: vi.fn(),
    getCompanySegments: vi.fn(),
    getBrokersRegistry: vi.fn().mockResolvedValue([]),
    getCreditsUsed: vi.fn().mockReturnValue(0),
    getCallLog: vi.fn().mockReturnValue([]),
  } as any;
}

it("skips unsupported modules and records limitations", async () => {
  const provider = makeProvider();
  const result = await executeEvidencePlan(provider, "BBCA", "quick", "company_overview", []);
  expect(provider.getBrokerSummary).not.toHaveBeenCalled();
  expect(provider.getForeignFlow).not.toHaveBeenCalled();
  expect(provider.getFilings).not.toHaveBeenCalled();
  expect(result.flowLens.status).toBe("unavailable");
  expect(result.insiderRadar.status).toBe("unavailable");
  expect(result.dataLimitations.join(" ")).toContain("Broker");
  expect(result.creditsConsumed).toBe(0);
});

it("throws when core Yahoo data is missing", async () => {
  const provider = makeProvider();
  provider.getCompanyReport.mockResolvedValue(null);
  provider.getDailyTransactions.mockResolvedValue(null);
  await expect(executeEvidencePlan(provider, "BBCA", "quick", "company_overview", [])).rejects.toThrow();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/agent/__tests__/coordinator.test.ts`
Expected: FAIL because coordinator still imports `SectorsClient`.

- [ ] **Step 3: Implement capability-aware fetching**

Requirements:
- Replace `SectorsClient` type with `MarketDataProvider`.
- Compute `needFlow`, `needTechnical`, `needFinancials`, `needEvents` as today, then gate with capability:
  - `needFlow = needFlow && (has("brokerSummary") || has("foreignFlow"))`;
  - `needEventsFilings = has("insiderFilings")`;
  - `needSuspensions = has("suspensions")`;
  - `needSegments = has("segments")`.
- Use `Promise.resolve(null)` for unsupported calls; do not call the provider.
- `providerErrors`: if `companyReport === null && dailyTransactions === null`, throw `new MarketDataError("Data inti pasar tidak tersedia...", "provider")`.
- Build `dataLimitations`:
  - company report missing -> "Profil/valuasi emiten tidak tersedia.";
  - daily missing -> "Data harga harian tidak tersedia.";
  - flow capability but both null -> "Broker summary/foreign flow tidak tersedia; FlowLens dinonaktifkan.";
  - broker null but foreign available -> "Broker summary tidak tersedia; FlowLens hanya menampilkan foreign flow.";
  - filings null -> "Keterbukaan informasi insider tidak tersedia.";
  - segments unsupported -> "Rincian segmen pendapatan tidak tersedia dari sumber gratis.";
  - FX conversion note if any financial period has `sourceCurrency !== "IDR"`.
- Pass `filingsAvailable` to `analyzeInsiderCluster`.
- Return `dataLimitations`, `creditsConsumed` from provider, `toolCallTrace` from provider.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/agent/__tests__/coordinator.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/coordinator.ts src/lib/agent/types.ts src/lib/agent/__tests__/coordinator.test.ts
git commit -m "feat: make coordinator capability-aware with data limitations"
```

---

### Task 8: FlowLens partial state and broker coverage

**Files:**
- Modify: `src/lib/quant/flow.ts`
- Modify: `src/components/FlowLensModule.tsx`
- Test: `src/lib/quant/__tests__/flow.test.ts`

**Interfaces:**
- `FlowLensAnalysis` adds `coverage: "full" | "top10" | "none"` and `source?: "stockbit" | "ipot"`.
- `analyzeFlowLens` returns:
  - `unavailable` when broker and foreign flow are both absent;
  - `partial` when broker absent but foreign flow exists;
  - `partial` when broker coverage is `top10` (no `bandarmologySummary`);
  - `available` when broker coverage is `full` and bandarmology is computed.

- [ ] **Step 1: Write the failing test**

`src/lib/quant/__tests__/flow.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { analyzeFlowLens } from "../flow";

const foreign = { symbol: "BBCA", data: [
  { date: "2026-11-19", net_foreign_inflow: 10_000_000_000 },
  { date: "2026-11-20", net_foreign_inflow: 20_000_000_000 },
] };

it("is partial with foreign flow only", () => {
  const r = analyzeFlowLens(null, foreign, []);
  expect(r.status).toBe("partial");
  expect(r.foreignFlow.cumulative5d).toBe(30_000_000_000);
  expect(r.topBuyers).toEqual([]);
  expect(r.bandarmologySummary).toBeUndefined();
});

it("is partial and suppresses bandarmology for top10 coverage", () => {
  const broker = { symbol: "BBCA", coverage: "top10", source: "ipot", data: [{ date: "2026-11-20", summary: [
    { broker_code: "AK", bval: 1e9, sval: 0, blot: 100, slot: 0, bavg_per_share: 1000, savg_per_share: 0 },
  ] }] } as any;
  const r = analyzeFlowLens(broker, foreign, []);
  expect(r.status).toBe("partial");
  expect(r.coverage).toBe("top10");
  expect(r.bandarmologySummary).toBeUndefined();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/quant/__tests__/flow.test.ts`
Expected: FAIL because `analyzeFlowLens` returns `unavailable` for null broker.

- [ ] **Step 3: Implement the partial/coverage logic**

Requirements:
- If no broker data and no foreign data -> `unavailable` with `coverage: "none"`.
- If no broker data but foreign data -> `partial`, `coverage: "none"`, empty top arrays, foreign series, `limitationDisclaimer`.
- If broker data with `coverage === "top10"` -> `partial`; still compute top buyers/sellers and foreign flow; do not compute `bandarmologySummary`; `limitationDisclaimer` says top-10 only.
- If broker data with `coverage !== "top10"` -> `available`; compute bandarmology as today.
- Ensure `foreignFlow.cumulative5d` works even when broker is missing.

- [ ] **Step 4: Update `FlowLensModule`**

Requirements:
- `status === "unavailable"`: existing message.
- `status === "partial"`: render header + foreign flow card/chart; render top buyer/seller tables only when arrays are non-empty; show a note `"Broker summary tidak tersedia / hanya top-10; fase akumulasi-distribusi tidak dihitung."`; do not render `bandarmologySummary` phase badge.
- `status === "available"`: existing full UI.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/quant/__tests__/flow.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/quant/flow.ts src/components/FlowLensModule.tsx src/lib/quant/__tests__/flow.test.ts
git commit -m "feat: add partial FlowLens and coverage-aware bandarmology"
```

---

### Task 9: Insider unavailable state and removal of seed data

**Files:**
- Modify: `src/lib/quant/insider.ts`
- Modify: `src/components/InsiderWhaleRadar.tsx`
- Test: `src/lib/quant/__tests__/insider.test.ts`

**Interfaces:**
- `analyzeInsiderCluster(filings, management, ownership, symbol, lastPrice, filingsAvailable = true)`.
- If `filingsAvailable === false`: `status: "unavailable"`, `transactions: []`, no seed data, summary "Data keterbukaan informasi insider tidak tersedia."
- If `filingsAvailable === true` and no transactions: `status: "partial"`, summary "Tidak ada transaksi insider yang dapat diverifikasi dari filings yang tersedia."

- [ ] **Step 1: Write the failing test**

`src/lib/quant/__tests__/insider.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { analyzeInsiderCluster } from "../insider";

it("returns unavailable and no seed transactions when filings are unavailable", () => {
  const r = analyzeInsiderCluster([], undefined, undefined, "BBCA", 5000, false);
  expect(r.status).toBe("unavailable");
  expect(r.transactions).toEqual([]);
  expect(r.totalBuyShares).toBe(0);
});

it("maps structured Filings into buy transactions", () => {
  const r = analyzeInsiderCluster([
    { date: "2026-03-25", title: "Pembelian", holder_name: "Haryanto", holder_type: "insider", transaction_type: "buy", amount_transaction: 379_428, price: 6982, share_percentage_before: 0.001, share_percentage_after: 0.001 },
  ], { key_executives: [{ name: "Haryanto", title: "Direksi" }] }, undefined, "BBCA", 5675, true);
  expect(r.status).toBe("available");
  expect(r.totalBuyShares).toBe(379_428);
  expect(r.transactions[0].action).toBe("BUY");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/quant/__tests__/insider.test.ts`
Expected: FAIL because the seed data appears for BBCA when filings are empty.

- [ ] **Step 3: Remove the seed block and implement the flag**

Requirements:
- Delete the hardcoded BBCA/BBRI/ADRO seed section entirely (do not gate it behind an env).
- Add the `filingsAvailable` parameter; return unavailable before the computation loop when false.
- When true and transactions are empty, return `partial` with the new summary; do not claim "no insider activity" as a fact.
- Keep the existing structured-field parsing and cluster logic.

- [ ] **Step 4: Update `InsiderWhaleRadar`**

Requirements:
- `unavailable`: existing hidden/message state.
- `partial` with empty transactions: show a note "Filings tersedia, tetapi transaksi belum dapat diverifikasi" and the filing list if available.
- Keep the existing buy/sell filters.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/quant/__tests__/insider.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/quant/insider.ts src/components/InsiderWhaleRadar.tsx src/lib/quant/__tests__/insider.test.ts
git commit -m "fix: never fabricate insider transactions and add unavailable state"
```

---

### Task 10: Integrity confidence, trading-plan intrinsic guard, compare/watchlist N/A

**Files:**
- Modify: `src/lib/quant/integrity.ts`
- Modify: `src/lib/quant/tradingPlan.ts`
- Modify: `src/app/api/compare/route.ts`
- Modify: `src/app/api/watchlist-metrics/route.ts`
- Modify: `src/app/watchlist/page.tsx`
- Modify: `src/components/ReportHeader.tsx`
- Test: `src/lib/quant/__tests__/integrity.test.ts`
- Test: `src/lib/quant/__tests__/tradingPlan.test.ts`

**Interfaces:**
- `RedFlagAnalysisResult` adds:
  `dataQuality: { financials: boolean; brokerFlow: "full" | "partial" | "none"; insider: boolean; valuation: boolean }`,
  `confidence: "high" | "medium" | "low"`,
  `limitations: string[]`.
- `calculateTradingPlan` uses `multiples.intrinsicValue` only when present; otherwise `r2`-derived technical targets and a limitation.
- `watchlist-metrics` returns `flow5d: number | null`.
- Compare metrics return `"N/A"` and no winner when flow/valuation missing.

- [ ] **Step 1: Write the failing integrity test**

```ts
it("marks confidence low when broker flow and insider are absent", () => {
  const r = calculateIntegrityScore({ financials: { status: "available", latest: { netIncome: 1, cashFlowOperating: 1, debtToEquity: 0.5 } } as any, flow: { status: "unavailable" } as any, insiderRadar: { status: "unavailable" } as any, valuation: {} as any });
  expect(r.confidence).toBe("low");
  expect(r.dataQuality.brokerFlow).toBe("none");
  expect(r.limitations.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Write the failing trading-plan test**

```ts
it("does not invent a 25% intrinsic value", () => {
  const technical = {
    lastPrice: 1000, dailyReturnPct: 0, rsi14: 50, sma20: 1000, sma50: 950,
    trendAssessment: "Neutral", chartSeries: [{ date: "2026-11-20", open: 990, high: 1100, low: 900, close: 1000, volume: 1000 }],
    volume: { relativeVolume: 1, todayVolume: 1000, avg20Volume: 1000 },
  } as any;
  const r = calculateTradingPlan({ symbol: "BBCA", technical, valuation: {} as any });
  expect(r.horizons.investing.target1).not.toBe(1250);
  expect(r.horizons.investing.catalystFocus.toLowerCase()).toContain("teknikal");
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/quant/__tests__/integrity.test.ts src/lib/quant/__tests__/tradingPlan.test.ts`
Expected: FAIL because confidence/dataQuality do not exist and the intrinsic fallback still applies.

- [ ] **Step 4: Implement integrity confidence**

Requirements:
- Infer `dataQuality` from the passed analyses:
  - `financials`: `status !== "unavailable"` and `latest != null`;
  - `brokerFlow`: `flow?.status === "available" ? "full" : flow?.status === "partial" ? "partial" : "none"`;
  - `insider`: `insiderRadar?.status === "available" || "partial"`;
  - `valuation`: `valuation != null`.
- `confidence`:
  - `high`: financials + brokerFlow full + insider + valuation;
  - `medium`: at least two of the four, or brokerFlow partial;
  - `low`: otherwise.
- `limitations`:
  - "Broker/foreign flow tidak tersedia..." when none;
  - "Broker summary hanya top-10..." when partial;
  - "Insider filings tidak tersedia..." when absent;
  - "Valuasi tidak tersedia..." when absent.
- Keep the existing score/verdict unchanged.

- [ ] **Step 5: Implement trading-plan guard**

Replace `const intrinsicVal = multiples.intrinsicValue || currentPrice * 1.25;` with `const intrinsicVal = multiples.intrinsicValue;`.
Use:
```ts
const investTP1 = roundToTick(Math.max(intrinsicVal ?? r2 * 1.1, currentPrice * 1.2));
const investTP2 = roundToTick(Math.max((intrinsicVal ?? r2) * 1.2, currentPrice * 1.35));
```
Set `catalystFocus` for the investing horizon to "Proyeksi teknikal (bukan nilai intrinsik fundamental)" and append a limitation to the plan disclaimer.

- [ ] **Step 6: Implement compare/watchlist N/A**

- In `compare`, if `flowData` is null/empty for a symbol, set `valueA/B = "N/A"`, `winner: undefined`, `verdictA/B = "Data arus asing tidak tersedia"`, and do not mention flow in `retailSummary`.
- In `watchlist-metrics`, return `flow5d: null` when `getForeignFlow` fails; type `number | null`.
- In `watchlist/page.tsx`, render `—` when `flow5d === null`; sorting treats null as last.
- In `ReportHeader`, add a small badge next to the integrity score: `Keyakinan: Tinggi/Sedang/Rendah`, with a tooltip/list of `integrity.limitations`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/lib/quant/__tests__/integrity.test.ts src/lib/quant/__tests__/tradingPlan.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/quant/integrity.ts src/lib/quant/tradingPlan.ts src/app/api/compare/route.ts src/app/api/watchlist-metrics/route.ts src/app/watchlist/page.tsx src/components/ReportHeader.tsx src/lib/quant/__tests__/integrity.test.ts src/lib/quant/__tests__/tradingPlan.test.ts
git commit -m "feat: add integrity confidence, remove invented intrinsic value, show N/A for missing flow"
```

---

### Task 11: Cache versioning and report metadata

**Files:**
- Modify: `src/lib/vector/qdrant.ts`
- Modify: `src/lib/storage/history.ts`
- Modify: `src/lib/agent/types.ts`
- Modify: `src/lib/agent/synthesizer.ts`
- Test: `src/lib/vector/__tests__/qdrant.test.ts`
- Test: `src/lib/storage/__tests__/history.test.ts`

**Interfaces:**
- `CACHE_DATA_SOURCE = "open-market"`, `CACHE_DATA_VERSION = 1`.
- `VectorCachePayload` adds `dataSource: string`, `dataVersion: number`.
- `CompanyIntelligenceReport` adds `dataSource: "open-market" | "sectors"`, `dataVersion: number`, `dataLimitations: string[]`.
- `isReportCacheCompatible(report: { dataSource?: string; dataVersion?: number }): boolean`.
- `searchSemanticReportCache` adds `dataSource`/`dataVersion` must conditions.
- `upsertReportToVectorCache` sets the fields.
- `getReportFromCache` returns null when `isReportCacheCompatible` is false and removes the stale key.

- [ ] **Step 1: Write the failing Qdrant test**

Mock `../embeddings` with `getEmbedding: async () => [0.1, 0.2]`, mock `fetch`; call `searchSemanticReportCache("...", "BBCA", 0.88, "full")`; capture the search body; assert:
```ts
expect(body.filter.must).toEqual(expect.arrayContaining([
  { key: "dataSource", match: { value: "open-market" } },
  { key: "dataVersion", match: { value: 1 } },
]));
```
Also mock the Qdrant upsert response and assert the point payload contains the fields.

- [ ] **Step 2: Write the failing history test**

Use a fake storage object and a defined `window` (no jsdom needed):
```ts
const store = new Map<string, string>();
vi.stubGlobal("window", {});
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
});
it("ignores a report from an older data source/version", () => {
  localStorage.setItem("telaah360_cache_rep_BBCA", JSON.stringify({ symbol: "BBCA", dataSource: "sectors", dataVersion: 0 }));
  expect(getReportFromCache("BBCA")).toBeNull();
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/vector/__tests__/qdrant.test.ts src/lib/storage/__tests__/history.test.ts`
Expected: FAIL because the filters/fields do not exist.

- [ ] **Step 4: Implement versioning**

- Add constants and fields.
- In `ensureCollectionExists`, add payload indexes for `dataSource` and `dataVersion` alongside `symbol`/`mode`.
- In `searchSemanticReportCache`, always add `dataSource`/`dataVersion` must conditions.
- In `upsert`, set `dataSource`/`dataVersion`.
- In `synthesizer`, set `dataSource: "open-market"`, `dataVersion: 1`, `dataLimitations: evidence.dataLimitations`.
- In `history`, `isReportCacheCompatible` checks `dataSource === "open-market" && dataVersion === 1` (or accepts a matching `sectors` report if the user explicitly uses Sectors); `getReportFromCache` removes incompatible keys.
- Ensure the report type includes the new fields.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/vector/__tests__/qdrant.test.ts src/lib/storage/__tests__/history.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/vector/qdrant.ts src/lib/storage/history.ts src/lib/agent/types.ts src/lib/agent/synthesizer.ts src/lib/vector/__tests__/qdrant.test.ts src/lib/storage/__tests__/history.test.ts
git commit -m "feat: version semantic and local report caches by data source"
```

---

### Task 12: Routes, market cache, and commodity page

**Files:**
- Modify: `src/app/api/analyze/route.ts`
- Modify: `src/app/api/compare/route.ts`
- Modify: `src/app/api/watchlist-metrics/route.ts`
- Modify: `src/app/api/insider-feed/route.ts`
- Modify: `src/app/api/market-overview/route.ts`
- Modify: `src/app/api/commodity-prices/route.ts`
- Modify: `src/app/api/qa/route.ts`
- Modify: `src/lib/storage/market-cache.ts`
- Modify: `src/app/commodity/page.tsx`
- Test: `src/lib/storage/__tests__/market-cache.test.ts`
- Test: `src/app/api/__tests__/routes.test.ts`

**Interfaces:**
- `getOrFetchDailyMarketData(forceRefresh?: boolean): Promise<MarketCacheData>` uses `getMarketIndices`, `getCommodityPrices`, `getUsdIdrRate`; no Sectors.
- `/api/insider-feed` returns `{ success: true, filings: FilingItem[], unavailable: boolean, stale?: boolean }`.
- `/api/commodity-prices` returns `{ success: true, commodities: CommodityQuote[] }` with the 4 Yahoo benchmarks.
- `/api/analyze` uses `getMarketProvider()` and `marketDataErrorMessage`.

- [ ] **Step 1: Write the failing market-cache test**

```ts
it("builds indices and commodities without Sectors", async () => {
  // mock getMarketIndices/getCommodityPrices/getUsdIdrRate via vi.mock
  const data = await getOrFetchDailyMarketData(true);
  expect(data.indices.some((i) => i.code === "COMPOSITE")).toBe(true);
  expect(data.indices.some((i) => i.code === "COAL")).toBe(true);
  expect(data.indices.some((i) => i.code === "NICKEL")).toBe(false);
});
```

- [ ] **Step 2: Write the failing route test**

```ts
vi.mock("@/lib/market", () => ({
  getMarketProvider: () => ({
    getInsiderFeed: async () => ({ results: [], unavailable: true, stale: false }),
    getCompanyReport: async () => null,
    getDailyTransactions: async () => null,
    getForeignFlow: async () => null,
  }),
}));

it("returns unavailable for the insider feed without a scraper", async () => {
  const res = await GET(new Request("http://localhost/api/insider-feed?limit=5"));
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.filings).toEqual([]);
  expect(body.unavailable).toBe(true);
});
```
Also test `/api/commodity-prices` with a mocked `getCommodityPrices` returning two quotes; assert the JSON contains them and no error.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/storage/__tests__/market-cache.test.ts src/app/api/__tests__/routes.test.ts`
Expected: FAIL because routes still instantiate `SectorsClient`.

- [ ] **Step 4: Implement the route changes**

- `analyze`: `const provider = getMarketProvider(); executeEvidencePlan(provider, ...)`; replace `sectorsErrorMessage` with `marketDataErrorMessage`.
- `compare`: `getMarketProvider`; handle null flow/valuation (Task 10 logic already).
- `watchlist-metrics`: `getMarketProvider`; flow null.
- `insider-feed`: `provider.getInsiderFeed({ limit, type })`; return `filings`, `unavailable`, `stale`.
- `market-overview`: call `getOrFetchDailyMarketData`.
- `commodity-prices`: call `getCommodityPrices`; no Sectors.
- `qa`: update fallback copy to "Berdasarkan data pasar yang tersedia...".
- `market-cache`: replace Sectors fetches with `getMarketIndices`, `getCommodityPrices`, `getUsdIdrRate`; keep 1-hour disk cache and `MarketItem` shape.
- `commodity/page.tsx`: update labels to "Coal API2", "COMEX Copper", "Iron Ore"; remove/mark the static issuer table as illustrative; no nickel price.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/storage/__tests__/market-cache.test.ts src/app/api/__tests__/routes.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/analyze/route.ts src/app/api/compare/route.ts src/app/api/watchlist-metrics/route.ts src/app/api/insider-feed/route.ts src/app/api/market-overview/route.ts src/app/api/commodity-prices/route.ts src/app/api/qa/route.ts src/lib/storage/market-cache.ts src/app/commodity/page.tsx src/lib/storage/__tests__/market-cache.test.ts src/app/api/__tests__/routes.test.ts
git commit -m "feat: switch API routes and market cache to the open provider"
```

---

### Task 13: Branding, docs, env, and Phase 1 deployment notes

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `API-MAP-Telaah-360.md`
- Modify: `DEPLOY_VPS.md`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/technical/page.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/ReportHeader.tsx`
- Modify: `src/components/EvidenceDrawer.tsx`
- Modify: `src/app/insider/page.tsx`
- Modify: `src/components/ShareModal.tsx`
- Modify: `src/components/retail/ShareAlphaCardModal.tsx`
- Modify: `src/components/chat/ChatFeed.tsx`
- Modify: `src/components/chat/ChatSidebar.tsx`
- Modify: `src/components/chat/RumorFactCheckerCard.tsx`
- Modify: `src/components/chat/StockCompareCard.tsx`

**Interfaces:**
- Phase 1 `.env.example`:
```env
MARKET_DATA_PROVIDER=open
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=qwen/qwen3.5-397b-a17b
QDRANT_URL=http://localhost:6333
REDIS_URL=redis://localhost:6379
# Optional; only for MARKET_DATA_PROVIDER=sectors
SECTORS_API_KEY=
```

- [ ] **Step 1: Update env and docs**

- `.env.example`: remove the required Sectors key; add `MARKET_DATA_PROVIDER=open`; mark Sectors optional.
- `README.md`: change the intro/architecture from Sectors to Yahoo Finance + IDX/Stockbit (Phase 2 note); update the installation requirements and cache section.
- `API-MAP-Telaah-360.md`: add a "Phase 1 source map" section; mark Sectors sections as legacy.
- `DEPLOY_VPS.md`: remove the Sectors key requirement; add `MARKET_DATA_PROVIDER=open`; note Phase 1 needs no scraper; Phase 2 will add it.

- [ ] **Step 2: Replace user-facing Sectors strings**

Search:
```bash
rg -n "Sectors API v2|Sectors v2|Sectors API" src README.md .env.example DEPLOY_VPS.md
```
Replace with:
- `Open Market Data` / `Yahoo Finance + IDX` (not "official").
- Sidebar: `Yahoo · IDX` source line; no credit meter. Keep a compact label.
- `ReportHeader`: replace `cr` with `Open Data` or `0 cr`; add the confidence badge from Task 10.
- `EvidenceDrawer`: show `call.provider` and "Sumber" instead of a credit count; keep the timestamp.
- `insider/page.tsx`: when `/api/insider-feed` returns `unavailable`, show "Feed market-wide insider memerlukan scraper Phase 2" and keep the per-symbol radar.
- `ShareModal`/`ShareAlphaCardModal`: "Data publik Yahoo Finance, IDX, dan IPOT/Stockbit; dapat tertunda/tidak lengkap."
- `ChatFeed` loading: "Memproses data pasar..."
- `ChatSidebar`: footer "Open Market Data" instead of Sectors quota.
- `RumorFactCheckerCard`: "Audit silang data pasar real-time".
- `StockCompareCard`: "Open Data".
- `layout.tsx` description: "data pasar publik Yahoo Finance dan IDX".
- `page.tsx`: "Open Data Engine" label; market overview comment.
- `technical/page.tsx`: loading copy "dari Yahoo Finance".

- [ ] **Step 3: Verify no stale strings remain**

Run:
```bash
rg -n "Sectors API v2|Sectors v2|Sectors API" src README.md .env.example DEPLOY_VPS.md
```
Expected: no matches in `src` or `.env.example`; only historical docs/audit may mention Sectors.

- [ ] **Step 4: Commit**

```bash
git add .env.example README.md API-MAP-Telaah-360.md DEPLOY_VPS.md src/app/layout.tsx src/app/page.tsx src/app/technical/page.tsx src/components/Sidebar.tsx src/components/ReportHeader.tsx src/components/ShareModal.tsx src/components/retail/ShareAlphaCardModal.tsx src/components/chat/ChatFeed.tsx src/components/chat/ChatSidebar.tsx src/components/chat/RumorFactCheckerCard.tsx src/components/chat/StockCompareCard.tsx
git commit -m "docs: rebrand Phase 1 to open market data sources"
```

---

### Task 14: Phase 1 live smoke test and verification

**Files:**
- Create: `scripts/test_open_market.ts`
- Modify: `package.json` (optional script `test:market`)

**Interfaces:**
- Script prints a compact status for BBCA and ADRO:
  - daily rows count and last date;
  - quarterly rows count and latest period; ADRO `sourceCurrency === "USD"` and `currency === "IDR"`;
  - snapshot name/sector/PE/PB;
  - news count;
  - broker/flow/insider null/unavailable (Phase 1).

- [ ] **Step 1: Write the smoke script**

`scripts/test_open_market.ts`:
```ts
import { YahooClient } from "../src/lib/market/yahoo";
import { getMarketProvider } from "../src/lib/market";

async function main() {
  const yahoo = new YahooClient();
  for (const symbol of ["BBCA", "ADRO"]) {
    const daily = await yahoo.getDailyTransactions(symbol);
    const financials = await yahoo.getQuarterlyFinancials(symbol, 4);
    const snapshot = await yahoo.getCompanySnapshot(symbol);
    console.log(symbol, {
      daily: daily.length,
      lastDate: daily.at(-1)?.date,
      quarters: financials?.length ?? null,
      latestPeriod: financials?.at(-1)?.date,
      currency: financials?.at(-1)?.currency,
      sourceCurrency: financials?.at(-1)?.sourceCurrency,
      name: snapshot?.overview?.company_name,
      pe: snapshot?.valuation?.current_pe,
      pb: snapshot?.valuation?.current_pb,
    });
    if (!daily.length) throw new Error(`${symbol}: no daily data`);
    if (!financials?.length) throw new Error(`${symbol}: no financials`);
  }
  const provider = getMarketProvider();
  console.log("provider", provider.id, [...provider.capabilities]);
}
main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Run the smoke test**

Run: `npx tsx scripts/test_open_market.ts`
Expected: BBCA and ADRO print finite data; ADRO shows `sourceCurrency: "USD"`, `currency: "IDR"`, and `pb` not 13314.

- [ ] **Step 3: Run the full checks**

Run:
```bash
npm test
npm run lint
npm run build
```
Expected:
- all Vitest suites pass;
- lint passes;
- build completes with zero TypeScript errors.

- [ ] **Step 4: Manual app smoke**

Run `npm run dev`; open the app; analyze BBCA in quick mode.
Expected:
- report renders technical/financial/valuation/news;
- FlowLens shows "unavailable/partial" with no fake broker rows;
- Insider shows "tidak tersedia" (Phase 1);
- no hardcoded insider transactions;
- no Sectors branding;
- old cached reports are ignored.

- [ ] **Step 5: Commit**

```bash
git add scripts/test_open_market.ts package.json package-lock.json
git commit -m "test: add Phase 1 open market smoke test"
```

---

## Phase 2 Handoff

Phase 1 produces a deployable Yahoo-only app. After it passes, write the Phase 2 plan for:
- Python FastAPI scraper + stealth Chromium + `Fetcher` fallback.
- IDX profile/foreign flow/calendar/suspensions.
- Stockbit session, full broker summary, structured movements, SQLite feed ingestion.
- IPOT top-10 fallback and IDX PDF insider fallback.
- Next.js `ScraperClient`, capability updates, `/insider` feed, Stockbit status banner.
- Docker/VPS/Stockbit login deployment.

The spec already contains the design for Phase 2; do not start it until Phase 1 is verified.
