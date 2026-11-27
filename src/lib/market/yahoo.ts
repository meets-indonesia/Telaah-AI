import type {
  CompanyOverview,
  CompanyReport,
  CompanyReportSection,
  CorporateActionItem,
  DailyTransaction,
  FinancialsReportData,
  ManagementData,
  OwnershipData,
  PeerCompany,
  QuarterlyFinancialMetrics,
  ValuationData,
} from "../sectors/types";
import { MarketDataError } from "./errors";
import { getUsdIdrRate as fetchUsdIdrRate } from "./fx";

const CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const TIMESERIES_BASE =
  "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries";
const QUOTE_SUMMARY_BASE = "https://query1.finance.yahoo.com/v10/finance/quoteSummary";
const RECOMMENDATIONS_BASE =
  "https://query1.finance.yahoo.com/v6/finance/recommendationsbysymbol";
const SESSION_COOKIE_URL = "https://fc.yahoo.com";
const CRUMB_URL = "https://query1.finance.yahoo.com/v1/test/getcrumb";
const DEFAULT_LOOKBACK_DAYS = 95;
const FINANCIALS_LOOKBACK_DAYS = 3 * 365;
const CORPORATE_ACTIONS_LOOKBACK_DAYS = 2 * 365;
const DEFAULT_FINANCIALS_QUARTERS = 4;
const MIN_FINANCIALS_PERIODS = 5;
const REQUEST_TIMEOUT_MS = 10_000;
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const PEER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PEERS = 5;
const QUOTE_SUMMARY_MODULES =
  "price,summaryDetail,defaultKeyStatistics,financialData,assetProfile";

const DEFAULT_SNAPSHOT_SECTIONS: CompanyReportSection[] = [
  "overview",
  "valuation",
  "financials",
  "peers",
  "management",
];

const MONETARY_FINANCIAL_TYPES = [
  "quarterlyTotalRevenue",
  "quarterlyGrossProfit",
  "quarterlyOperatingIncome",
  "quarterlyNetIncome",
  "quarterlyEBITDA",
  "quarterlyTotalAssets",
  "quarterlyTotalLiabilities",
  "quarterlyStockholdersEquity",
  "quarterlyTotalDebt",
  "quarterlyCashAndCashEquivalents",
  "quarterlyOperatingCashFlow",
  "quarterlyFreeCashFlow",
] as const;

const FINANCIAL_TYPES = [
  ...MONETARY_FINANCIAL_TYPES,
  "quarterlyBasicEPS",
  "quarterlyOrdinarySharesNumber",
] as const;

export interface CallLogEntry {
  endpoint: string;
  params: Record<string, unknown>;
  credits: 0;
  provider: "yahoo";
  timestamp: string;
}

export interface YahooClientOptions {
  fetchImpl?: typeof fetch;
  now?: () => number;
  getUsdIdrRate?: () => Promise<number | null>;
  getQuarterlyFinancials?: (
    symbol: string,
    nQuarters?: number
  ) => Promise<QuarterlyFinancialMetrics[] | null>;
}

interface YahooSplit {
  timestamp: number;
  numerator: number;
  denominator: number;
}

interface ChartResult {
  meta?: { symbol?: string; currency?: string };
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
  events?: {
    splits?: Record<string, { numerator?: number; denominator?: number }>;
    dividends?: Record<string, { amount?: unknown; date?: unknown }>;
  };
}

interface QuoteSummaryModules {
  price?: {
    longName?: unknown;
    shortName?: unknown;
    regularMarketPrice?: unknown;
    regularMarketChangePercent?: unknown;
    marketCap?: unknown;
    currency?: unknown;
  };
  summaryDetail?: {
    marketCap?: unknown;
    trailingPE?: unknown;
    forwardPE?: unknown;
    priceToSalesTrailing12Months?: unknown;
    dividendYield?: unknown;
  };
  defaultKeyStatistics?: {
    sharesOutstanding?: unknown;
    trailingEps?: unknown;
    priceToBook?: unknown;
    forwardPE?: unknown;
  };
  financialData?: {
    currentPrice?: unknown;
    financialCurrency?: unknown;
    revenueGrowth?: unknown;
    earningsGrowth?: unknown;
  };
  assetProfile?: {
    sector?: unknown;
    industry?: unknown;
    longBusinessSummary?: unknown;
    website?: unknown;
    companyOfficers?: Array<{ name?: unknown; title?: unknown }>;
  };
}

interface QuoteSummaryBody {
  quoteSummary?: {
    result?: QuoteSummaryModules[] | null;
    error?: { code?: string; description?: string } | null;
  };
}

interface RecommendationsBody {
  finance?: {
    result?: Array<{ recommendedSymbols?: Array<{ symbol?: unknown }> }> | null;
    error?: { code?: string; description?: string } | null;
  };
}

interface YahooSession {
  cookie: string | null;
  crumb: string;
  expiresAt: number;
}

interface PeerCacheEntry {
  modules: QuoteSummaryModules | null;
  expiresAt: number;
}

interface TimeseriesEntry {
  asOfDate?: string;
  periodType?: string;
  currencyCode?: string;
  reportedValue?: { raw?: unknown };
}

interface TimeseriesResultItem {
  meta?: { type?: string[] };
  [key: string]: unknown;
}

interface FinancialPeriodDraft {
  date: string;
  currency: string | null;
  values: Map<string, number>;
}

export function toYahooSymbol(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  if (clean === "IHSG" || clean === "COMPOSITE") return "^JKSE";
  if (!clean || clean.startsWith("^")) return clean;
  return clean.endsWith(".JK") ? clean : `${clean}.JK`;
}

const JAKARTA_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function jakartaDate(unixSeconds: number): string {
  return JAKARTA_DATE.format(new Date(unixSeconds * 1000));
}

function parseDateArg(value: string, endOfDay: boolean): number {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T${endOfDay ? "23:59:59" : "00:00:00"}Z`
    : value;
  const ms = Date.parse(normalized);
  if (!Number.isFinite(ms)) {
    throw new MarketDataError(`Tanggal tidak valid: "${value}"`, "yahoo", "config");
  }
  return Math.floor(ms / 1000);
}

function toFiniteNumber(value: unknown): number | null {
  const num = typeof value === "string" ? Number(value) : value;
  return typeof num === "number" && Number.isFinite(num) ? num : null;
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stripJakartaSuffix(yahooSymbol: string): string {
  return yahooSymbol.startsWith("^") ? yahooSymbol : yahooSymbol.replace(/\.JK$/, "");
}

function collectCookieHeader(headers: Headers): string | null {
  const setCookies =
    typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  const raw =
    setCookies.length > 0
      ? setCookies
      : headers.get("set-cookie")
        ? [headers.get("set-cookie") as string]
        : [];
  const pairs = raw
    .map((value) => value.split(";")[0]?.trim())
    .filter((value): value is string => Boolean(value));
  return pairs.length > 0 ? pairs.join("; ") : null;
}

function sortByDate(
  rows: QuarterlyFinancialMetrics[]
): QuarterlyFinancialMetrics[] {
  return [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function latestFinancialValue(
  rows: QuarterlyFinancialMetrics[] | null,
  field: "total_equity" | "earnings" | "revenue"
): number | null {
  if (!rows || rows.length === 0) return null;
  const sorted = sortByDate(rows);
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const value = toFiniteNumber(sorted[i][field]);
    if (value !== null) return value;
  }
  return null;
}

/**
 * Trailing-twelve-month revenue requires four quarters. Filter out quarters
 * whose revenue is not yet filed before picking the window, so a missing newer
 * quarter cannot push a valid older one out. With fewer than four reported
 * values the sum would understate revenue, so PS is left unavailable instead.
 */
function trailingRevenue(rows: QuarterlyFinancialMetrics[] | null): number | null {
  if (!rows) return null;
  const revenues = sortByDate(rows)
    .map((row) => toFiniteNumber(row.revenue))
    .filter((value): value is number => value !== null);
  if (revenues.length < 4) return null;
  return revenues.slice(-4).reduce((sum, value) => sum + value, 0);
}

function parseSplits(result: ChartResult): YahooSplit[] {
  const raw = result.events?.splits;
  if (!raw) return [];
  return Object.entries(raw)
    .map(([key, split]) => ({
      timestamp: Number(key),
      numerator: toFiniteNumber(split?.numerator) ?? 0,
      denominator: toFiniteNumber(split?.denominator) ?? 0,
    }))
    .filter(
      (split) =>
        Number.isFinite(split.timestamp) &&
        split.numerator > 0 &&
        split.denominator > 0
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

function groupFinancialPeriods(results: TimeseriesResultItem[]): FinancialPeriodDraft[] {
  const byDate = new Map<string, FinancialPeriodDraft>();

  for (const item of results) {
    const type = item?.meta?.type?.[0];
    if (!type) continue;
    const entries = item[type];
    if (!Array.isArray(entries)) continue;

    for (const entry of entries as TimeseriesEntry[]) {
      if (!entry || entry.periodType !== "3M") continue;
      const date = typeof entry.asOfDate === "string" ? entry.asOfDate : null;
      const raw = toFiniteNumber(entry.reportedValue?.raw);
      if (!date || raw === null) continue;

      let period = byDate.get(date);
      if (!period) {
        period = { date, currency: null, values: new Map() };
        byDate.set(date, period);
      }
      if (period.currency === null && typeof entry.currencyCode === "string" && entry.currencyCode) {
        period.currency = entry.currencyCode.toUpperCase();
      }
      period.values.set(type, raw);
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export class YahooClient {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly usdIdrRate: () => Promise<number | null>;
  private readonly financialsOverride?: YahooClientOptions["getQuarterlyFinancials"];
  private readonly callLog: CallLogEntry[] = [];
  private session: YahooSession | null = null;
  private readonly peerCache = new Map<string, PeerCacheEntry>();

  constructor(options: YahooClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.usdIdrRate = options.getUsdIdrRate ?? (() => fetchUsdIdrRate(this.fetchImpl));
    this.financialsOverride = options.getQuarterlyFinancials;
  }

  public getCallLog(): CallLogEntry[] {
    return [...this.callLog];
  }

  private async fetchChartResult(
    yahooSymbol: string,
    params: Record<string, string>
  ): Promise<ChartResult> {
    const endpoint = `/v8/finance/chart/${yahooSymbol}`;
    const url = `${CHART_BASE}/${encodeURIComponent(yahooSymbol)}?${new URLSearchParams(params).toString()}`;

    let res: Response;
    try {
      res = await this.fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (error) {
      throw new MarketDataError(
        `Yahoo chart request gagal untuk ${yahooSymbol}: ${(error as Error)?.message ?? "unknown"}`,
        "yahoo",
        "network"
      );
    }

    if (!res.ok) {
      const kind = res.status === 404 ? "not_found" : "provider";
      throw new MarketDataError(
        `Yahoo chart error [${res.status}] untuk ${yahooSymbol}.`,
        "yahoo",
        kind
      );
    }

    this.callLog.push({
      endpoint,
      params: { symbol: yahooSymbol, ...params },
      credits: 0,
      provider: "yahoo",
      timestamp: new Date(this.now()).toISOString(),
    });

    let body: { chart?: { result?: ChartResult[] | null; error?: { code?: string; description?: string } } };
    try {
      body = await res.json();
    } catch {
      throw new MarketDataError(
        `Yahoo chart mengembalikan JSON tidak valid untuk ${yahooSymbol}.`,
        "yahoo",
        "provider"
      );
    }

    const result = body?.chart?.result?.[0];
    if (!result) {
      const code = body?.chart?.error?.code;
      throw new MarketDataError(
        `Yahoo chart tidak menemukan data untuk ${yahooSymbol}${code ? ` (${code})` : ""}.`,
        "yahoo",
        "not_found"
      );
    }

    return result;
  }

  private mapChartRows(
    result: ChartResult,
    idSymbol: string,
    intraday: boolean
  ): DailyTransaction[] {
    const timestamps = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0];
    if (timestamps.length === 0) return [];
    if (!quote) {
      throw new MarketDataError(
        `Yahoo chart tidak menyertakan data OHLCV untuk ${idSymbol}.`,
        "yahoo",
        "provider"
      );
    }

    const splits = parseSplits(result);
    const rows: DailyTransaction[] = [];

    for (let i = 0; i < timestamps.length; i += 1) {
      const timestamp = timestamps[i];
      if (!Number.isFinite(timestamp)) continue;

      const close = toFiniteNumber(quote.close?.[i]);
      const volume = toFiniteNumber(quote.volume?.[i]);
      const open = toFiniteNumber(quote.open?.[i]);
      const high = toFiniteNumber(quote.high?.[i]);
      const low = toFiniteNumber(quote.low?.[i]);
      if (close === null || volume === null || open === null || high === null || low === null) {
        continue;
      }

      let priceFactor = 1;
      let volumeFactor = 1;
      for (const split of splits) {
        if (timestamp < split.timestamp) {
          priceFactor *= split.denominator / split.numerator;
          volumeFactor *= split.numerator / split.denominator;
        }
      }

      rows.push({
        symbol: idSymbol,
        date: intraday
          ? new Date(timestamp * 1000).toISOString()
          : jakartaDate(timestamp),
        open: open * priceFactor,
        high: high * priceFactor,
        low: low * priceFactor,
        close: close * priceFactor,
        volume: Math.round(volume * volumeFactor),
      });
    }

    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Daily OHLCV, split-adjusted so bars before a split line up with bars after
   * it. Yahoo returns splits as events keyed by the split's unix timestamp.
   */
  public async getDailyTransactions(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<DailyTransaction[]> {
    const yahooSymbol = toYahooSymbol(symbol);
    if (!yahooSymbol) {
      throw new MarketDataError("Simbol emiten kosong.", "yahoo", "config");
    }
    const idSymbol = stripJakartaSuffix(yahooSymbol);

    const nowSeconds = Math.floor(this.now() / 1000);
    const period1 =
      startDate !== undefined
        ? parseDateArg(startDate, false)
        : nowSeconds - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60;
    const period2 =
      endDate !== undefined ? parseDateArg(endDate, true) : nowSeconds;

    const result = await this.fetchChartResult(yahooSymbol, {
      period1: String(period1),
      period2: String(period2),
      interval: "1d",
      events: "split",
    });

    return this.mapChartRows(result, idSymbol, false);
  }

  /**
   * Hourly OHLCV for the 4H screener. Split-adjusted like the daily series so
   * a corporate action inside the window does not create a fake gap.
   */
  public async getHourlyTransactions(
    symbol: string,
    range: string = "6mo"
  ): Promise<DailyTransaction[]> {
    const yahooSymbol = toYahooSymbol(symbol);
    if (!yahooSymbol) {
      throw new MarketDataError("Simbol emiten kosong.", "yahoo", "config");
    }
    const idSymbol = stripJakartaSuffix(yahooSymbol);

    const result = await this.fetchChartResult(yahooSymbol, {
      range,
      interval: "1h",
      events: "split",
    });

    return this.mapChartRows(result, idSymbol, true);
  }

  /**
   * Quarterly statements normalized to IDR. IDX issuers may report in USD
   * (e.g. ADRO), so monetary values are converted with the USD/IDR rate while
   * share counts stay untouched. Returns null when a conversion is needed but
   * no rate is available, rather than mixing currencies.
   */
  public async getQuarterlyFinancials(
    symbol: string,
    nQuarters: number = DEFAULT_FINANCIALS_QUARTERS
  ): Promise<QuarterlyFinancialMetrics[] | null> {
    if (this.financialsOverride) {
      return this.financialsOverride(symbol, nQuarters);
    }

    const yahooSymbol = toYahooSymbol(symbol);
    if (!yahooSymbol) {
      throw new MarketDataError("Simbol emiten kosong.", "yahoo", "config");
    }
    const idSymbol = yahooSymbol.startsWith("^")
      ? yahooSymbol
      : yahooSymbol.replace(/\.JK$/, "");

    const nowSeconds = Math.floor(this.now() / 1000);
    const period1 = nowSeconds - FINANCIALS_LOOKBACK_DAYS * 24 * 60 * 60;
    const params = {
      symbol: yahooSymbol,
      type: FINANCIAL_TYPES.join(","),
      period1: String(period1),
      period2: String(nowSeconds),
    };
    const endpoint = `/ws/fundamentals-timeseries/v1/finance/timeseries/${yahooSymbol}`;
    const url = `${TIMESERIES_BASE}/${encodeURIComponent(yahooSymbol)}?${new URLSearchParams(params).toString()}`;

    let res: Response;
    try {
      res = await this.fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (error) {
      throw new MarketDataError(
        `Yahoo fundamentals request gagal untuk ${yahooSymbol}: ${(error as Error)?.message ?? "unknown"}`,
        "yahoo",
        "network"
      );
    }

    if (!res.ok) {
      const kind = res.status === 404 ? "not_found" : "provider";
      throw new MarketDataError(
        `Yahoo fundamentals error [${res.status}] untuk ${yahooSymbol}.`,
        "yahoo",
        kind
      );
    }

    this.callLog.push({
      endpoint,
      params,
      credits: 0,
      provider: "yahoo",
      timestamp: new Date(this.now()).toISOString(),
    });

    let body: {
      timeseries?: {
        result?: TimeseriesResultItem[] | null;
        error?: { code?: string; description?: string } | null;
      };
    };
    try {
      body = await res.json();
    } catch {
      throw new MarketDataError(
        `Yahoo fundamentals mengembalikan JSON tidak valid untuk ${yahooSymbol}.`,
        "yahoo",
        "provider"
      );
    }

    const results = body?.timeseries?.result;
    if (!results) {
      const code = body?.timeseries?.error?.code;
      if (code) {
        throw new MarketDataError(
          `Yahoo fundamentals tidak menemukan data untuk ${yahooSymbol} (${code}).`,
          "yahoo",
          "not_found"
        );
      }
      return [];
    }

    const periods = groupFinancialPeriods(results).filter((period) =>
      MONETARY_FINANCIAL_TYPES.some((type) => period.values.has(type))
    );
    if (periods.length === 0) return [];

    const wanted = Number.isFinite(nQuarters) && nQuarters > 0
      ? Math.floor(nQuarters)
      : DEFAULT_FINANCIALS_QUARTERS;
    const selected = periods.slice(-Math.max(wanted + 1, MIN_FINANCIALS_PERIODS));

    if (selected.some((period) => period.currency === null)) return null;
    const foreignCurrencies = [
      ...new Set(
        selected
          .map((period) => period.currency as string)
          .filter((currency) => currency !== "IDR")
      ),
    ];
    let usdIdrRate: number | null = null;
    if (foreignCurrencies.length > 0) {
      // Only USD/IDR is available; converting any other currency with it would
      // silently misstate the numbers.
      if (foreignCurrencies.some((currency) => currency !== "USD")) return null;
      usdIdrRate = await this.usdIdrRate();
      if (usdIdrRate === null || !Number.isFinite(usdIdrRate) || usdIdrRate <= 0) {
        return null;
      }
    }

    return selected.map((period) => {
      const sourceCurrency = period.currency as string;
      const fxRate = sourceCurrency === "IDR" ? 1 : (usdIdrRate as number);
      const toIdr = (type: string): number | undefined => {
        const value = period.values.get(type);
        return value === undefined ? undefined : value * fxRate;
      };

      const shares = period.values.get("quarterlyOrdinarySharesNumber");
      const basicEps = period.values.get("quarterlyBasicEPS");
      const sectorMetrics: Record<string, number> = {};
      if (shares !== undefined) sectorMetrics.ordinary_shares = shares;
      if (basicEps !== undefined) sectorMetrics.basic_eps = basicEps * fxRate;

      return {
        symbol: idSymbol,
        date: period.date,
        currency: "IDR",
        sourceCurrency,
        fxRate,
        revenue: toIdr("quarterlyTotalRevenue"),
        gross_profit: toIdr("quarterlyGrossProfit"),
        operating_pnl: toIdr("quarterlyOperatingIncome"),
        earnings: toIdr("quarterlyNetIncome"),
        ebitda: toIdr("quarterlyEBITDA"),
        total_assets: toIdr("quarterlyTotalAssets"),
        total_liabilities: toIdr("quarterlyTotalLiabilities"),
        total_equity: toIdr("quarterlyStockholdersEquity"),
        total_debt: toIdr("quarterlyTotalDebt"),
        cash_and_short_term_investments: toIdr("quarterlyCashAndCashEquivalents"),
        operating_cash_flow: toIdr("quarterlyOperatingCashFlow"),
        free_cash_flow: toIdr("quarterlyFreeCashFlow"),
        financials_sector_metrics:
          Object.keys(sectorMetrics).length > 0 ? sectorMetrics : undefined,
      };
    });
  }

  /**
   * Company report snapshot from Yahoo quoteSummary. Returns null when the
   * summary cannot be fetched; the caller can fall back to a lighter report.
   * PB/PS are never taken from Yahoo when the statements are not reported in
   * IDR (Yahoo divides an IDR price by USD statements for issuers like ADRO).
   */
  public async getCompanySnapshot(
    symbol: string,
    sections: CompanyReportSection[] = DEFAULT_SNAPSHOT_SECTIONS
  ): Promise<Partial<CompanyReport> | null> {
    const yahooSymbol = toYahooSymbol(symbol);
    if (!yahooSymbol) {
      throw new MarketDataError("Simbol emiten kosong.", "yahoo", "config");
    }
    const idSymbol = stripJakartaSuffix(yahooSymbol);
    const wanted = new Set<CompanyReportSection>(
      sections.length > 0 ? sections : DEFAULT_SNAPSHOT_SECTIONS
    );

    let modules: QuoteSummaryModules;
    try {
      modules = await this.fetchQuoteSummaryModules(yahooSymbol);
    } catch {
      return this.buildFallbackSnapshot(idSymbol, yahooSymbol, wanted);
    }

    const price = modules.price ?? {};
    const summary = modules.summaryDetail ?? {};
    const stats = modules.defaultKeyStatistics ?? {};
    const financialData = modules.financialData ?? {};
    const profile = modules.assetProfile ?? {};

    const marketCap =
      toFiniteNumber(summary.marketCap) ?? toFiniteNumber(price.marketCap);
    const companyName = asText(price.longName) ?? asText(price.shortName);
    const financialCurrency =
      asText(financialData.financialCurrency)?.toUpperCase() ?? null;

    const overview: CompanyOverview = {
      company_name: companyName,
      sector: asText(profile.sector),
      industry: asText(profile.industry),
      description: asText(profile.longBusinessSummary),
      website: asText(profile.website),
      market_cap: marketCap ?? undefined,
    };

    const snapshot: Partial<CompanyReport> = {
      symbol: idSymbol,
      company_name: companyName ?? idSymbol,
    };

    if (wanted.has("overview")) {
      snapshot.overview = overview;
    }

    if (wanted.has("valuation")) {
      const lastClose =
        toFiniteNumber(financialData.currentPrice) ??
        toFiniteNumber(price.regularMarketPrice);
      const dailyChangePct = toFiniteNumber(price.regularMarketChangePercent);
      const forwardPe =
        toFiniteNumber(summary.forwardPE) ??
        toFiniteNumber(stats.forwardPE);
      let currentPe = toFiniteNumber(summary.trailingPE);
      let currentPb: number | null = null;
      let currentPs: number | null = null;
      let multipleBasis: "reported" | "computed" = "reported";

      if (financialCurrency === "IDR") {
        currentPb = toFiniteNumber(stats.priceToBook);
        currentPs = toFiniteNumber(summary.priceToSalesTrailing12Months);
      } else {
        multipleBasis = "computed";
        const rows = await this.getQuarterlyFinancials(
          idSymbol,
          DEFAULT_FINANCIALS_QUARTERS
        ).catch(() => null);
        const equity = latestFinancialValue(rows, "total_equity");
        const earnings = latestFinancialValue(rows, "earnings");
        const revenueTtm = trailingRevenue(rows);

        if (marketCap !== null && equity !== null && equity > 0) {
          currentPb = marketCap / equity;
        }
        if (marketCap !== null && revenueTtm !== null && revenueTtm > 0) {
          currentPs = marketCap / revenueTtm;
        }
        if (
          currentPe === null &&
          marketCap !== null &&
          earnings !== null &&
          earnings > 0
        ) {
          currentPe = marketCap / (earnings * 4);
        }
      }

      const valuation: ValuationData = {
        last_close_price: lastClose ?? undefined,
        daily_close_change:
          dailyChangePct === null ? undefined : dailyChangePct / 100,
        current_pe: currentPe,
        forward_pe: forwardPe,
        current_pb: currentPb,
        current_ps: currentPs,
        financialCurrency: financialCurrency ?? undefined,
        multipleBasis,
      };
      snapshot.valuation = valuation;
    }

    if (wanted.has("financials")) {
      const financials: FinancialsReportData = {
        eps: toFiniteNumber(stats.trailingEps) ?? undefined,
        yoy_quarter_revenue_growth:
          toFiniteNumber(financialData.revenueGrowth) ?? undefined,
        yoy_quarter_earnings_growth:
          toFiniteNumber(financialData.earningsGrowth) ?? undefined,
      };
      snapshot.financials = financials;
    }

    if (wanted.has("management")) {
      const executives = (profile.companyOfficers ?? [])
        .map((officer) => ({
          name: asText(officer?.name),
          title: asText(officer?.title),
        }))
        .filter(
          (officer): officer is { name: string; title: string } =>
            Boolean(officer.name) && Boolean(officer.title)
        );
      const management: ManagementData = { key_executives: executives };
      snapshot.management = management;
    }

    if (wanted.has("ownership")) {
      // Phase 1 has no ownership source; empty arrays are honest, seed data is not.
      const ownership: OwnershipData = {
        major_shareholders: [],
        whale_investors: [],
      };
      snapshot.ownership = ownership;
    }

    if (wanted.has("peers")) {
      const companies = await this.fetchPeers(yahooSymbol, overview);
      if (companies.length > 0) {
        snapshot.peers = [
          {
            peers_data: {
              companies,
              group_name: {
                sector: overview.sector,
                industry: overview.industry,
              },
            },
          },
        ];
      }
    }

    return snapshot;
  }

  /**
   * Honest partial snapshot when Yahoo's quoteSummary is rate-limited: chart
   * meta gives the name/price, and the normalized quarterly financials give
   * shares/equity/earnings/revenue for computed multiples. No sector, peers,
   * management, or ownership are invented.
   */
  private async buildFallbackSnapshot(
    idSymbol: string,
    yahooSymbol: string,
    wanted: Set<CompanyReportSection>
  ): Promise<Partial<CompanyReport> | null> {
    let meta: Record<string, any> | null = null;
    try {
      const url = `${CHART_BASE}/${encodeURIComponent(yahooSymbol)}?range=5d&interval=1d`;
      const res = await this.fetchImpl(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as any;
      meta = body?.chart?.result?.[0]?.meta ?? null;
    } catch {
      return null;
    }
    if (!meta) return null;

    const price =
      toFiniteNumber(meta.regularMarketPrice) ??
      toFiniteNumber(meta.previousClose);
    const rows = await this.getQuarterlyFinancials(idSymbol, DEFAULT_FINANCIALS_QUARTERS).catch(
      () => null
    );
    const shares = toFiniteNumber(
      rows?.at(-1)?.financials_sector_metrics?.ordinary_shares
    );
    const equity = latestFinancialValue(rows, "total_equity");
    const earnings = latestFinancialValue(rows, "earnings");
    const revenueTtm = trailingRevenue(rows);
    const marketCap = price !== null && shares !== null ? price * shares : null;
    const dailyChangePct = toFiniteNumber(meta.regularMarketChangePercent);
    const financialCurrency =
      rows?.at(-1)?.sourceCurrency?.toUpperCase() ?? null;

    const snapshot: Partial<CompanyReport> = {
      symbol: idSymbol,
      company_name: asText(meta.longName) ?? asText(meta.shortName) ?? idSymbol,
    };

    if (wanted.has("overview")) {
      snapshot.overview = {
        company_name: snapshot.company_name,
        market_cap: marketCap ?? undefined,
      };
    }

    if (wanted.has("valuation")) {
      const valuation: ValuationData = {
        last_close_price: price ?? undefined,
        daily_close_change:
          dailyChangePct === null ? undefined : dailyChangePct / 100,
        current_pe:
          marketCap !== null && earnings !== null && earnings > 0
            ? marketCap / (earnings * 4)
            : null,
        current_pb:
          marketCap !== null && equity !== null && equity > 0
            ? marketCap / equity
            : null,
        current_ps:
          marketCap !== null && revenueTtm !== null && revenueTtm > 0
            ? marketCap / revenueTtm
            : null,
        financialCurrency: financialCurrency ?? undefined,
        multipleBasis: "computed",
      };
      snapshot.valuation = valuation;
    }

    if (wanted.has("ownership")) {
      const ownership: OwnershipData = {
        major_shareholders: [],
        whale_investors: [],
      };
      snapshot.ownership = ownership;
    }

    return snapshot;
  }

  /**
   * Cash dividends and stock splits from the Yahoo chart events, newest first.
   */
  public async getCorporateActions(
    symbol: string
  ): Promise<CorporateActionItem[]> {
    const yahooSymbol = toYahooSymbol(symbol);
    if (!yahooSymbol) {
      throw new MarketDataError("Simbol emiten kosong.", "yahoo", "config");
    }

    const nowSeconds = Math.floor(this.now() / 1000);
    const period1 =
      nowSeconds - CORPORATE_ACTIONS_LOOKBACK_DAYS * 24 * 60 * 60;
    const params = {
      period1: String(period1),
      period2: String(nowSeconds),
      interval: "1d",
      events: "div,split",
    };
    const endpoint = `/v8/finance/chart/${yahooSymbol}`;
    const url = `${CHART_BASE}/${encodeURIComponent(yahooSymbol)}?${new URLSearchParams(params).toString()}`;

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new MarketDataError(
        `Yahoo chart request gagal untuk ${yahooSymbol}: ${(error as Error)?.message ?? "unknown"}`,
        "yahoo",
        "network"
      );
    }

    if (!res.ok) {
      const kind = res.status === 404 ? "not_found" : "provider";
      throw new MarketDataError(
        `Yahoo chart error [${res.status}] untuk ${yahooSymbol}.`,
        "yahoo",
        kind
      );
    }

    this.callLog.push({
      endpoint,
      params: { symbol: yahooSymbol, ...params },
      credits: 0,
      provider: "yahoo",
      timestamp: new Date(this.now()).toISOString(),
    });

    let body: {
      chart?: {
        result?: ChartResult[] | null;
        error?: { code?: string; description?: string };
      };
    };
    try {
      body = await res.json();
    } catch {
      throw new MarketDataError(
        `Yahoo chart mengembalikan JSON tidak valid untuk ${yahooSymbol}.`,
        "yahoo",
        "provider"
      );
    }

    const result = body?.chart?.result?.[0];
    if (!result) {
      const code = body?.chart?.error?.code;
      throw new MarketDataError(
        `Yahoo chart tidak menemukan data untuk ${yahooSymbol}${code ? ` (${code})` : ""}.`,
        "yahoo",
        "not_found"
      );
    }

    const actions: CorporateActionItem[] = [];

    for (const [key, dividend] of Object.entries(result.events?.dividends ?? {})) {
      const amount = toFiniteNumber(dividend?.amount);
      const timestamp = toFiniteNumber(dividend?.date) ?? Number(key);
      if (amount === null || !Number.isFinite(timestamp)) continue;
      const date = jakartaDate(timestamp);
      actions.push({
        date,
        action_type: "Dividen Tunai",
        description: `Dividen tunai Rp${amount} per saham`,
        amount,
        ex_date: date,
      });
    }

    for (const split of parseSplits(result)) {
      const date = jakartaDate(split.timestamp);
      actions.push({
        date,
        action_type: "Stock Split",
        description: `Pemecahan saham ${split.numerator}:${split.denominator}`,
        ratio: `1:${split.numerator / split.denominator}`,
        ex_date: date,
      });
    }

    return actions.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }

  /** Cookie + crumb session for quoteSummary; Yahoo rejects crumb-less calls. */
  private async ensureSession(): Promise<YahooSession> {
    if (this.session && this.session.expiresAt > this.now()) {
      return this.session;
    }
    this.session = null;

    // fc.yahoo.com answers 404 but still sets the cookie the crumb expects.
    let cookie: string | null = null;
    try {
      const cookieRes = await this.fetchImpl(SESSION_COOKIE_URL, {
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      cookie = collectCookieHeader(cookieRes.headers);
    } catch {
      cookie = null;
    }

    const headers: Record<string, string> = {};
    if (cookie) headers.Cookie = cookie;

    let crumbRes: Response;
    try {
      crumbRes = await this.fetchImpl(CRUMB_URL, {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new MarketDataError(
        `Yahoo crumb request gagal: ${(error as Error)?.message ?? "unknown"}`,
        "yahoo",
        "network"
      );
    }

    if (!crumbRes.ok) {
      const kind =
        crumbRes.status === 401 || crumbRes.status === 429
          ? "blocked"
          : "provider";
      throw new MarketDataError(
        `Yahoo crumb error [${crumbRes.status}].`,
        "yahoo",
        kind
      );
    }

    let crumb: string;
    try {
      crumb = (await crumbRes.text()).trim();
    } catch {
      crumb = "";
    }
    if (!crumb) {
      throw new MarketDataError("Yahoo mengembalikan crumb kosong.", "yahoo", "blocked");
    }

    this.session = {
      cookie,
      crumb,
      expiresAt: this.now() + SESSION_TTL_MS,
    };
    return this.session;
  }

  private async fetchQuoteSummaryModules(
    yahooSymbol: string,
    allowRetry = true
  ): Promise<QuoteSummaryModules> {
    const { cookie, crumb } = await this.ensureSession();
    const endpoint = `/v10/finance/quoteSummary/${yahooSymbol}`;
    const params = new URLSearchParams({
      modules: QUOTE_SUMMARY_MODULES,
      crumb,
    });
    const url = `${QUOTE_SUMMARY_BASE}/${encodeURIComponent(yahooSymbol)}?${params.toString()}`;
    const headers: Record<string, string> = {};
    if (cookie) headers.Cookie = cookie;

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new MarketDataError(
        `Yahoo quoteSummary request gagal untuk ${yahooSymbol}: ${(error as Error)?.message ?? "unknown"}`,
        "yahoo",
        "network"
      );
    }

    // A stale cookie/crumb shows up as 401 or 429; rebuild the session once.
    if ((res.status === 401 || res.status === 429) && allowRetry) {
      this.session = null;
      return this.fetchQuoteSummaryModules(yahooSymbol, false);
    }

    if (!res.ok) {
      throw new MarketDataError(
        `Yahoo quoteSummary error [${res.status}] untuk ${yahooSymbol}.`,
        "yahoo",
        res.status === 404 ? "not_found" : "provider"
      );
    }

    this.callLog.push({
      endpoint,
      params: { symbol: yahooSymbol, modules: QUOTE_SUMMARY_MODULES },
      credits: 0,
      provider: "yahoo",
      timestamp: new Date(this.now()).toISOString(),
    });

    let body: QuoteSummaryBody;
    try {
      body = await res.json();
    } catch {
      throw new MarketDataError(
        `Yahoo quoteSummary mengembalikan JSON tidak valid untuk ${yahooSymbol}.`,
        "yahoo",
        "provider"
      );
    }

    const result = body?.quoteSummary?.result?.[0];
    if (!result) {
      const code = body?.quoteSummary?.error?.code;
      throw new MarketDataError(
        `Yahoo quoteSummary tidak menemukan data untuk ${yahooSymbol}${code ? ` (${code})` : ""}.`,
        "yahoo",
        "not_found"
      );
    }
    return result;
  }

  private async fetchPeers(
    yahooSymbol: string,
    overview: CompanyOverview
  ): Promise<PeerCompany[]> {
    const recommended = await this.fetchRecommendedSymbols(yahooSymbol);
    const companies: PeerCompany[] = [];

    for (const recommendedSymbol of recommended) {
      const peerYahoo = toYahooSymbol(recommendedSymbol);
      const modules = await this.getPeerModules(peerYahoo);
      if (!modules) continue;

      const price = modules.price ?? {};
      const summary = modules.summaryDetail ?? {};
      const stats = modules.defaultKeyStatistics ?? {};
      const financialData = modules.financialData ?? {};
      const currency =
        asText(financialData.financialCurrency)?.toUpperCase() ?? null;
      const marketCap =
        toFiniteNumber(summary.marketCap) ?? toFiniteNumber(price.marketCap);
      // PeerCompany.market_cap is required; skip rather than invent a zero.
      if (marketCap === null) continue;

      const pe = toFiniteNumber(summary.trailingPE);
      const close = toFiniteNumber(price.regularMarketPrice);
      const dailyChangePct = toFiniteNumber(price.regularMarketChangePercent);
      const peerSymbol = stripJakartaSuffix(peerYahoo);

      companies.push({
        symbol: peerSymbol,
        company_name:
          asText(price.longName) ?? asText(price.shortName) ?? peerSymbol,
        market_cap: marketCap,
        pe: pe ?? undefined,
        pe_ttm: pe ?? undefined,
        // Mixed-currency multiples are worse than missing ones.
        pb: currency === "IDR" ? toFiniteNumber(stats.priceToBook) : null,
        ps:
          currency === "IDR"
            ? toFiniteNumber(summary.priceToSalesTrailing12Months)
            : null,
        dividend_yield: toFiniteNumber(summary.dividendYield) ?? undefined,
        close: close ?? undefined,
        daily_change:
          dailyChangePct === null ? undefined : dailyChangePct / 100,
      });
    }

    return companies.slice(0, MAX_PEERS);
  }

  private async fetchRecommendedSymbols(
    yahooSymbol: string
  ): Promise<string[]> {
    const endpoint = `/v6/finance/recommendationsbysymbol/${yahooSymbol}`;
    const url = `${RECOMMENDATIONS_BASE}/${encodeURIComponent(yahooSymbol)}`;

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      return [];
    }
    if (!res?.ok) return [];

    this.callLog.push({
      endpoint,
      params: { symbol: yahooSymbol },
      credits: 0,
      provider: "yahoo",
      timestamp: new Date(this.now()).toISOString(),
    });

    let body: RecommendationsBody;
    try {
      body = await res.json();
    } catch {
      return [];
    }

    const recommended = body?.finance?.result?.[0]?.recommendedSymbols;
    if (!Array.isArray(recommended)) return [];

    const symbols = recommended
      .map((item) => asText(item?.symbol)?.toUpperCase())
      .filter((value): value is string => Boolean(value));
    return [...new Set(symbols)].slice(0, MAX_PEERS);
  }

  private async getPeerModules(
    yahooSymbol: string
  ): Promise<QuoteSummaryModules | null> {
    const cached = this.peerCache.get(yahooSymbol);
    if (cached && cached.expiresAt > this.now()) {
      return cached.modules;
    }

    try {
      const modules = await this.fetchQuoteSummaryModules(yahooSymbol);
      this.peerCache.set(yahooSymbol, {
        modules,
        expiresAt: this.now() + PEER_CACHE_TTL_MS,
      });
      return modules;
    } catch {
      // A transient peer failure must not sink the whole snapshot.
      return null;
    }
  }
}
