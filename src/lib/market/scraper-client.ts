import type {
  CompanyOverview,
  FilingItem,
  ForeignFlowResponse,
  BrokerSummaryResponse,
  ManagementData,
  OwnershipData,
} from "@/lib/sectors/types";
import type { CallLogEntry } from "./provider";

export interface IdxProfile {
  symbol: string;
  company_name: string;
  overview: Partial<CompanyOverview>;
  management: ManagementData;
  ownership: OwnershipData;
  source: "idx";
}

export interface ScraperClientOptions {
  baseUrl?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface ChartCandle {
  time: number;
  date?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DepthLevel {
  price: number;
  volume: number;
}

export interface StockbitQuote {
  symbol: string;
  last: number;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number;
  change: number | null;
  changePct: number;
  volume: number;
  value: number;
  frequency: number | null;
  foreignBuy: number | null;
  foreignSell: number | null;
  foreignNet: number | null;
  foreignCurrent: boolean;
  bid: number | null;
  offer: number | null;
  bids?: DepthLevel[];
  offers?: DepthLevel[];
  ara: number | null;
  arb: number | null;
  source: string;
}

export interface ScraperChart {
  candles: ChartCandle[];
  previousClose?: number | null;
  source: string;
}

export interface ScraperInsiderFeed {
  results: FilingItem[];
  source?: string;
  stale?: boolean;
  limitations?: string[];
}

export class ScraperClient {
  private readonly baseUrl: string | null;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly callLog: CallLogEntry[] = [];

  constructor(options: ScraperClientOptions = {}) {
    this.baseUrl = (
      options.baseUrl ??
      process.env.SCRAPER_URL ??
      ""
    )
      .trim()
      .replace(/\/+$/, "") || null;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 35_000;
  }

  public get isConfigured(): boolean {
    return Boolean(this.baseUrl);
  }

  public getCallLog(): CallLogEntry[] {
    return [...this.callLog];
  }

  private async get<T>(
    path: string,
    params: Record<string, unknown> = {},
    timeoutMs: number = this.timeoutMs
  ): Promise<T | null> {
    if (!this.baseUrl) return null;
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)])
    ).toString();
    const endpoint = `${this.baseUrl}${path}${query ? `?${query}` : ""}`;
    try {
      const response = await this.fetchImpl(endpoint, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return null;
      const body = (await response.json()) as T;
      this.callLog.push({
        endpoint: path,
        params,
        credits: 0,
        provider: "idx-scraper",
        timestamp: new Date().toISOString(),
      });
      return body;
    } catch {
      return null;
    }
  }

  async getForeignFlow(
    symbol: string,
    length = 90
  ): Promise<ForeignFlowResponse | null> {
    return this.get<ForeignFlowResponse>(
      `/v1/idx/foreign-flow/${encodeURIComponent(symbol)}`,
      { symbol, length }
    );
  }

  async getQuote(symbol: string): Promise<StockbitQuote | null> {
    const result = await this.get<{
      symbol?: string;
      last?: number;
      open?: number | null;
      high?: number | null;
      low?: number | null;
      previous_close?: number;
      change?: number | null;
      change_pct?: number;
      volume?: number;
      value?: number;
      frequency?: number | null;
      foreign_buy?: number | null;
      foreign_sell?: number | null;
      foreign_net?: number | null;
      foreign_current?: boolean;
      bid?: number | null;
      offer?: number | null;
      bids?: DepthLevel[];
      offers?: DepthLevel[];
      ara?: number | null;
      arb?: number | null;
      source?: string;
    }>(`/v1/stockbit/quote/${encodeURIComponent(symbol)}`);
    if (!result?.last) return null;
    return {
      symbol: result.symbol ?? symbol,
      last: result.last,
      open: result.open ?? null,
      high: result.high ?? null,
      low: result.low ?? null,
      previousClose: result.previous_close ?? 0,
      change: result.change ?? null,
      changePct: result.change_pct ?? 0,
      volume: result.volume ?? 0,
      value: result.value ?? 0,
      frequency: result.frequency ?? null,
      foreignBuy: result.foreign_buy ?? null,
      foreignSell: result.foreign_sell ?? null,
      foreignNet: result.foreign_net ?? null,
      foreignCurrent: Boolean(result.foreign_current),
      bid: result.bid ?? null,
      offer: result.offer ?? null,
      bids: Array.isArray(result.bids) ? result.bids : [],
      offers: Array.isArray(result.offers) ? result.offers : [],
      ara: result.ara ?? null,
      arb: result.arb ?? null,
      source: result.source ?? "stockbit",
    };
  }

  async getChart(
    symbol: string,
    timeframe: "1D" | "1W" | "1Y" | "5Y"
  ): Promise<ScraperChart | null> {
    const result = await this.get<{
      candles?: ChartCandle[];
      previous_close?: number | null;
      source?: string;
    }>(`/v1/stockbit/chart/${encodeURIComponent(symbol)}`, { timeframe });
    if (!result?.candles?.length) return null;
    return {
      candles: result.candles,
      previousClose: result.previous_close ?? null,
      source: result.source ?? "stockbit",
    };
  }

  async getProfile(symbol: string): Promise<IdxProfile | null> {
    return this.get<IdxProfile>(
      `/v1/idx/profile/${encodeURIComponent(symbol)}`,
      { symbol }
    );
  }

  async getFilings(
    symbol: string,
    days = 365,
    limit = 5
  ): Promise<FilingItem[] | null> {
    const result = await this.get<{ results: FilingItem[] }>(
      `/v1/idx/insider/${encodeURIComponent(symbol)}`,
      { symbol, days, limit },
      90_000
    );
    return result?.results ?? null;
  }

  async getInsiderFeed(
    params: { days?: number; limit?: number } = {}
  ): Promise<ScraperInsiderFeed | null> {
    return this.get<ScraperInsiderFeed>(
      "/v1/idx/insider-feed",
      {
        days: params.days ?? 30,
        limit: params.limit ?? 5,
      },
      120_000
    );
  }

  async getSuspensions(limit = 100): Promise<Array<Record<string, unknown>> | null> {
    const result = await this.get<{ results: Array<Record<string, unknown>> }>(
      "/v1/idx/suspensions",
      { limit }
    );
    return result?.results ?? null;
  }

  async getCalendar(month?: string): Promise<Array<Record<string, unknown>> | null> {
    const result = await this.get<{ results: Array<Record<string, unknown>> }>(
      "/v1/idx/calendar",
      { month }
    );
    return result?.results ?? null;
  }

  async getBrokerSummary(symbol: string): Promise<BrokerSummaryResponse | null> {
    const result = await this.get<{
      available?: boolean;
      start?: string;
      end?: string;
      data?: BrokerSummaryResponse["data"];
      source?: BrokerSummaryResponse["source"];
      coverage?: BrokerSummaryResponse["coverage"];
    }>(`/v1/broker-summary/${encodeURIComponent(symbol)}`, {
      symbol,
      days: 14,
    });
    if (!result || result.available === false) return null;
    if (!Array.isArray(result.data) || result.data.length === 0) return null;
    return {
      symbol,
      start: result.start,
      end: result.end,
      data: result.data,
      source: result.source ?? "stockbit",
      coverage: result.coverage ?? "full",
    };
  }

  async getStockbitStatus(): Promise<{
    configured: boolean;
    logged_in?: boolean;
    expired?: boolean;
    source?: string;
    access_expires_at?: string | null;
    refresh_expires_at?: string | null;
    limitations?: string[];
  } | null> {
    return this.get<{
      configured: boolean;
      logged_in?: boolean;
      expired?: boolean;
      source?: string;
      access_expires_at?: string | null;
      refresh_expires_at?: string | null;
      limitations?: string[];
    }>("/v1/stockbit/status");
  }
}
