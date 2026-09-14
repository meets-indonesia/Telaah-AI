import fs from "fs";
import path from "path";
import {
  BrokerRegistryItem,
  BrokerSummaryResponse,
  CompanyReport,
  CorporateActionsResponse,
  DailyTransaction,
  FilingItem,
  ForeignFlowResponse,
  NewsItem,
  QuarterlyFinancialMetrics,
  ShareholderCompositionResponse,
} from "./types";

const BASE_URL = "https://api.sectors.app";

// In-memory cache with expiration
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export class SectorsClient {
  private apiKey: string;
  private creditUsed: number = 0;
  private callLog: Array<{ endpoint: string; params: any; credits: number; timestamp: string }> = [];

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SECTORS_API_KEY || "";
    if (!this.apiKey) {
      console.warn("SectorsClient warning: SECTORS_API_KEY is not configured.");
    }
  }

  public getCreditsUsed(): number {
    return this.creditUsed;
  }

  public getCallLog() {
    return [...this.callLog];
  }

  public resetCreditTracking() {
    this.creditUsed = 0;
    this.callLog = [];
  }

  private normalizeSymbol(symbol: string): string {
    const clean = symbol.trim().toUpperCase().replace(".JK", "");
    if (!/^[A-Z]{4}$/.test(clean)) {
      throw new Error(`Simbol emiten tidak valid: "${symbol}". Simbol IDX harus 4 huruf alfabet (misal: BBCA, TLKM).`);
    }
    return clean;
  }

  private async fetchEndpoint<T>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
    estimatedCredit: number = 1,
    cacheTtlSeconds: number = 300 // default 5 mins
  ): Promise<T> {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    }

    const qs = searchParams.toString();
    const fullUrl = `${BASE_URL}${endpoint}${qs ? `?${qs}` : ""}`;
    const cacheKey = fullUrl;

    // Check memory cache
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    const key = this.apiKey || process.env.SECTORS_API_KEY || "";
    const res = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Authorization: key,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      throw new Error(`Sectors API error [${res.status}] at ${endpoint}: ${errorText}`);
    }

    const data = (await res.json()) as T;

    // Record credit usage and trace
    this.creditUsed += estimatedCredit;
    this.callLog.push({
      endpoint,
      params,
      credits: estimatedCredit,
      timestamp: new Date().toISOString(),
    });

    // Store in cache
    memoryCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + cacheTtlSeconds * 1000,
    });

    return data;
  }

  /**
   * Mendapatkan broker registry dari cache lokal (0 kredit) atau fallback ke API
   */
  public async getBrokersRegistry(): Promise<BrokerRegistryItem[]> {
    try {
      const localPath = path.join(process.cwd(), "data", "brokers_registry.json");
      if (fs.existsSync(localPath)) {
        const fileContent = fs.readFileSync(localPath, "utf-8");
        return JSON.parse(fileContent);
      }
    } catch {
      // ignore and fallback
    }

    return this.fetchEndpoint<BrokerRegistryItem[]>("/v2/brokers/", {}, 1, 86400); // 24 jam cache
  }

  /**
   * Company Report dengan sections terpilih (Credit-aware section planner)
   * Hanya meminta section yang relevan agar hemat kredit (1 kredit per section)
   */
  public async getCompanyReport(
    symbol: string,
    sections: Array<"overview" | "valuation" | "financials" | "peers" | "ownership" | "management" | "dividend" | "future"> = [
      "overview",
      "valuation",
    ]
  ): Promise<CompanyReport> {
    const clean = this.normalizeSymbol(symbol);
    const sectionsParam = sections.join(",");
    const creditCost = sections.length;
    return this.fetchEndpoint<CompanyReport>(
      `/v2/company/report/${clean}/`,
      { sections: sectionsParam },
      creditCost,
      600
    );
  }

  /**
   * Validasi tanggal laporan keuangan kuartalan sebelum memanggil data keuangan
   */
  public async getQuarterlyFinancialDates(symbol: string): Promise<Record<string, Array<[string, string]>>> {
    const clean = this.normalizeSymbol(symbol);
    return this.fetchEndpoint<Record<string, Array<[string, string]>>>(
      `/v2/company/get_quarterly_financial_dates/${clean}/`,
      {},
      1,
      3600
    );
  }

  /**
   * Mengambil laporan keuangan kuartalan
   */
  public async getQuarterlyFinancials(
    symbol: string,
    nQuarters: number = 4
  ): Promise<QuarterlyFinancialMetrics[]> {
    const clean = this.normalizeSymbol(symbol);
    return this.fetchEndpoint<QuarterlyFinancialMetrics[]>(
      `/v2/financials/quarterly/${clean}/`,
      { n_quarters: nQuarters },
      nQuarters, // 1 kredit per quarter
      1800
    );
  }

  /**
   * Data harga dan volume harian (hingga 90 hari)
   */
  public async getDailyTransactions(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<DailyTransaction[]> {
    const clean = this.normalizeSymbol(symbol);
    const params: Record<string, string | undefined> = {};
    if (startDate) params.start = startDate;
    if (endDate) params.end = endDate;

    return this.fetchEndpoint<DailyTransaction[]>(
      `/v2/daily/${clean}/`,
      params,
      1,
      600
    );
  }

  /**
   * Ringkasan transaksi broker (FlowLens core)
   */
  public async getBrokerSummary(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<BrokerSummaryResponse> {
    const clean = this.normalizeSymbol(symbol);
    const params: Record<string, string | undefined> = {};
    if (startDate) params.start = startDate;
    if (endDate) params.end = endDate;

    return this.fetchEndpoint<BrokerSummaryResponse>(
      `/v2/broker-summary/${clean}/`,
      params,
      1,
      600
    );
  }

  /**
   * Arus modal asing harian (Foreign Flow)
   */
  public async getForeignFlow(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<ForeignFlowResponse> {
    const clean = this.normalizeSymbol(symbol);
    const params: Record<string, string | undefined> = {};
    if (startDate) params.start = startDate;
    if (endDate) params.end = endDate;

    return this.fetchEndpoint<ForeignFlowResponse>(
      `/v2/foreign-flow/${clean}/`,
      params,
      1,
      600
    );
  }

  /**
   * Aksi korporasi (Dividen, Rights Issue, Stock Split, RUPS, dll.)
   */
  public async getCorporateActions(symbol: string): Promise<CorporateActionsResponse> {
    const clean = this.normalizeSymbol(symbol);
    return this.fetchEndpoint<CorporateActionsResponse>(
      `/v2/company/corporate-actions/${clean}/`,
      {},
      1,
      1800
    );
  }

  /**
   * Keterbukaan informasi kepemilikan saham & insider filings
   */
  public async getFilings(symbol: string): Promise<{ results: FilingItem[] }> {
    const clean = this.normalizeSymbol(symbol);
    return this.fetchEndpoint<{ results: FilingItem[] }>(
      "/v2/filings/",
      { symbol: clean },
      1,
      900
    );
  }

  /**
   * Berita emiten terkini
   */
  public async getNews(symbol: string, limit: number = 5): Promise<{ results: NewsItem[] }> {
    const clean = this.normalizeSymbol(symbol);
    return this.fetchEndpoint<{ results: NewsItem[] }>(
      "/v2/news/",
      { symbols: clean, limit },
      1,
      900
    );
  }

  /**
   * Suspensi emiten
   */
  public async getSuspensions(symbol: string): Promise<{ results: any[] }> {
    const clean = this.normalizeSymbol(symbol);
    return this.fetchEndpoint<{ results: any[] }>(
      "/v2/suspensions/",
      { symbol: clean },
      1,
      1800
    );
  }

  /**
   * Komposisi pemegang saham
   */
  public async getShareholdersComposition(symbol: string): Promise<ShareholderCompositionResponse> {
    const clean = this.normalizeSymbol(symbol);
    return this.fetchEndpoint<ShareholderCompositionResponse>(
      `/v2/company/shareholders-composition/${clean}/`,
      {},
      1,
      3600
    );
  }

  /**
   * Rincian segmen bisnis / pendapatan (Revenue Breakdown Segments)
   */
  public async getCompanySegments(symbol: string): Promise<any | null> {
    const clean = this.normalizeSymbol(symbol);
    return this.fetchEndpoint<any>(
      `/v2/company/get-segments/${clean}/`,
      {},
      1,
      3600
    );
  }
}

export const sectorsClient = new SectorsClient();
