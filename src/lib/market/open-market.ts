import fs from "fs";
import path from "path";
import type {
  BrokerRegistryItem,
  BrokerSummaryResponse,
  CompanyOverview,
  CompanyReport,
  CompanyReportSection,
  CorporateActionsResponse,
  DailyTransaction,
  FilingItem,
  ForeignFlowResponse,
  NewsItem,
  QuarterlyFinancialMetrics,
} from "@/lib/sectors/types";
import { fetchGoogleNews } from "./news";
import {
  InsiderFeedParams,
  InsiderFeedResult,
  MarketDataCapability,
  MarketDataProvider,
  CallLogEntry,
} from "./provider";
import { ScraperClient } from "./scraper-client";
import { YahooClient } from "./yahoo";

const BASE_CAPABILITIES: MarketDataCapability[] = [
  "companyProfile",
  "valuation",
  "quarterlyFinancials",
  "dailyOHLCV",
  "peers",
  "news",
  "corporateActions",
];

export interface OpenMarketProviderOptions {
  yahoo?: YahooClient;
  news?: typeof fetchGoogleNews;
  scraper?: ScraperClient;
}

export class OpenMarketProvider implements MarketDataProvider {
  readonly id = "open-market" as const;
  readonly capabilities: ReadonlySet<MarketDataCapability>;

  private readonly yahoo: YahooClient;
  private readonly news: typeof fetchGoogleNews;
  private readonly scraper: ScraperClient;

  constructor(options: OpenMarketProviderOptions = {}) {
    this.yahoo = options.yahoo ?? new YahooClient();
    this.news = options.news ?? fetchGoogleNews;
    this.scraper = options.scraper ?? new ScraperClient();

    const capabilities = [...BASE_CAPABILITIES];
    if (this.scraper.isConfigured) {
      capabilities.push("foreignFlow", "insiderFilings", "suspensions");
      if (process.env.SCRAPER_BROKER_SUMMARY_ENABLED === "true") {
        capabilities.push("brokerSummary");
      }
    }
    this.capabilities = new Set(capabilities);
  }

  async getBrokersRegistry(): Promise<BrokerRegistryItem[]> {
    try {
      const localPath = path.join(process.cwd(), "data", "brokers_registry.json");
      if (!fs.existsSync(localPath)) return [];
      const content = fs.readFileSync(localPath, "utf-8");
      return JSON.parse(content) as BrokerRegistryItem[];
    } catch {
      return [];
    }
  }

  async getCompanyReport(
    symbol: string,
    sections?: CompanyReportSection[]
  ): Promise<CompanyReport | null> {
    const clean = symbol.trim().toUpperCase().replace(".JK", "");
    const [snapshot, idxProfile] = await Promise.all([
      this.yahoo.getCompanySnapshot(clean, sections),
      this.scraper.getProfile(clean).catch(() => null),
    ]);

    if (!snapshot && !idxProfile) return null;

    const overview: CompanyOverview = { ...(snapshot?.overview ?? {}) };
    if (idxProfile) {
      for (const [key, value] of Object.entries(idxProfile.overview)) {
        if (value !== null && value !== undefined && value !== "") {
          (overview as Record<string, unknown>)[key] = value;
        }
      }
    }

    return {
      ...(snapshot ?? {}),
      symbol: snapshot?.symbol || clean,
      company_name:
        snapshot?.company_name ||
        snapshot?.overview?.company_name ||
        idxProfile?.company_name ||
        idxProfile?.overview?.company_name ||
        clean,
      overview,
      management:
        idxProfile?.management?.key_executives?.length
          ? idxProfile.management
          : snapshot?.management,
      ownership:
        idxProfile?.ownership?.major_shareholders?.length
          ? idxProfile.ownership
          : snapshot?.ownership,
    };
  }

  async getQuarterlyFinancials(
    symbol: string,
    nQuarters?: number
  ): Promise<QuarterlyFinancialMetrics[] | null> {
    return this.yahoo.getQuarterlyFinancials(symbol, nQuarters);
  }

  async getDailyTransactions(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<DailyTransaction[] | null> {
    return this.yahoo.getDailyTransactions(symbol, startDate, endDate);
  }

  async getBrokerSummary(
    symbol: string,
    _startDate?: string,
    _endDate?: string
  ): Promise<BrokerSummaryResponse | null> {
    if (!this.scraper.isConfigured) return null;
    return this.scraper.getBrokerSummary(symbol);
  }

  async getForeignFlow(
    symbol: string,
    _startDate?: string,
    _endDate?: string
  ): Promise<ForeignFlowResponse | null> {
    if (!this.scraper.isConfigured) return null;
    return this.scraper.getForeignFlow(symbol);
  }

  async getCorporateActions(
    symbol: string
  ): Promise<CorporateActionsResponse | null> {
    const actions = await this.yahoo.getCorporateActions(symbol);
    return {
      symbol: symbol.trim().toUpperCase().replace(".JK", ""),
      corporate_actions: actions,
    };
  }

  async getFilings(
    symbol?: string,
    _params?: Record<string, unknown>
  ): Promise<{ results: FilingItem[] } | null> {
    if (!symbol || !this.scraper.isConfigured) return null;
    const results = await this.scraper.getFilings(symbol);
    return results ? { results } : null;
  }

  async getInsiderFeed(params?: InsiderFeedParams): Promise<InsiderFeedResult> {
    if (!this.scraper.isConfigured) {
      return {
        results: [],
        unavailable: true,
        limitations: ["Scraper IDX belum aktif (SCRAPER_URL belum diatur)."],
      };
    }

    const feed = await this.scraper.getInsiderFeed({
      days: params?.days ?? 30,
      limit: params?.limit ?? 5,
    });
    if (!feed) {
      return {
        results: [],
        unavailable: true,
        limitations: ["Feed insider IDX sedang tidak dapat diakses."],
      };
    }

    const type = params?.type ?? "all";
    const results =
      type === "all"
        ? feed.results
        : feed.results.filter((filing) => filing.transaction_type === type);

    return {
      results,
      source: feed.source ?? "idx",
      stale: feed.stale,
      limitations: feed.limitations,
    };
  }

  async getNews(symbol: string, limit = 5): Promise<{ results: NewsItem[] }> {
    return { results: await this.news(symbol, limit) };
  }

  async getSuspensions(symbol: string): Promise<{ results: any[] } | null> {
    if (!this.scraper.isConfigured) return null;
    const rows = await this.scraper.getSuspensions();
    if (!rows) return null;
    const clean = symbol.trim().toUpperCase().replace(".JK", "");
    return {
      results: rows.filter(
        (row) => String(row.symbol ?? "").toUpperCase() === clean
      ),
    };
  }

  async getCompanySegments(_symbol: string): Promise<any | null> {
    return null;
  }

  getCreditsUsed(): number {
    return 0;
  }

  getCallLog(): CallLogEntry[] {
    return [...this.yahoo.getCallLog(), ...this.scraper.getCallLog()];
  }
}
