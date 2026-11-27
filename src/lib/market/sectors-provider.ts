import type {
  BrokerRegistryItem,
  BrokerSummaryResponse,
  CompanyReport,
  CompanyReportSection,
  CorporateActionsResponse,
  DailyTransaction,
  FilingItem,
  ForeignFlowResponse,
  NewsItem,
  QuarterlyFinancialMetrics,
} from "@/lib/sectors/types";
import { SectorsClient } from "@/lib/sectors/client";
import {
  CallLogEntry,
  InsiderFeedParams,
  InsiderFeedResult,
  MarketDataCapability,
  MarketDataProvider,
} from "./provider";

const CAPABILITIES: MarketDataCapability[] = [
  "companyProfile",
  "valuation",
  "quarterlyFinancials",
  "dailyOHLCV",
  "peers",
  "news",
  "corporateActions",
  "brokerSummary",
  "foreignFlow",
  "insiderFilings",
  "suspensions",
  "segments",
];

function toSectorsParams(
  params?: Record<string, unknown>
): Record<string, string | number | undefined> {
  const out: Record<string, string | number | undefined> = {};
  for (const [key, value] of Object.entries(params ?? {})) {
    if (typeof value === "string" || typeof value === "number") {
      out[key] = value;
    }
  }
  return out;
}

export class SectorsProvider implements MarketDataProvider {
  readonly id = "sectors" as const;
  readonly capabilities = new Set<MarketDataCapability>(CAPABILITIES);

  private readonly client: SectorsClient;

  constructor(client?: SectorsClient) {
    this.client = client ?? new SectorsClient();
  }

  getBrokersRegistry(): Promise<BrokerRegistryItem[]> {
    return this.client.getBrokersRegistry();
  }

  getCompanyReport(
    symbol: string,
    sections?: CompanyReportSection[]
  ): Promise<CompanyReport | null> {
    return this.client.getCompanyReport(symbol, sections);
  }

  getQuarterlyFinancials(
    symbol: string,
    nQuarters?: number
  ): Promise<QuarterlyFinancialMetrics[] | null> {
    return this.client.getQuarterlyFinancials(symbol, nQuarters);
  }

  getDailyTransactions(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<DailyTransaction[] | null> {
    return this.client.getDailyTransactions(symbol, startDate, endDate);
  }

  getBrokerSummary(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<BrokerSummaryResponse | null> {
    return this.client.getBrokerSummary(symbol, startDate, endDate);
  }

  getForeignFlow(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<ForeignFlowResponse | null> {
    return this.client.getForeignFlow(symbol, startDate, endDate);
  }

  getCorporateActions(
    symbol: string
  ): Promise<CorporateActionsResponse | null> {
    return this.client.getCorporateActions(symbol);
  }

  async getFilings(
    symbol?: string,
    params?: Record<string, unknown>
  ): Promise<{ results: FilingItem[] } | null> {
    return this.client.getFilings(symbol, toSectorsParams(params));
  }

  async getInsiderFeed(params: InsiderFeedParams = {}): Promise<InsiderFeedResult> {
    const type = params.type && params.type !== "all" ? params.type : undefined;
    const result = await this.getFilings(undefined, {
      limit: params.limit,
      transaction_type: type,
    });
    if (!result) {
      return { results: [], unavailable: true, source: "sectors" };
    }
    return { results: result.results, source: "sectors" };
  }

  async getNews(symbol: string, limit?: number): Promise<{ results: NewsItem[] }> {
    return this.client.getNews(symbol, limit);
  }

  getSuspensions(symbol: string): Promise<{ results: any[] } | null> {
    return this.client.getSuspensions(symbol);
  }

  getCompanySegments(symbol: string): Promise<any | null> {
    return this.client.getCompanySegments(symbol);
  }

  getCreditsUsed(): number {
    return this.client.getCreditsUsed();
  }

  getCallLog(): CallLogEntry[] {
    return this.client.getCallLog().map((entry) => ({
      ...entry,
      provider: "sectors",
    }));
  }
}
