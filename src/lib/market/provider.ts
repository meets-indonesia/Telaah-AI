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

export interface CallLogEntry {
  endpoint: string;
  params: Record<string, unknown>;
  credits: number;
  provider: string;
  timestamp: string;
}

export interface InsiderFeedParams {
  days?: number;
  limit?: number;
  type?: "buy" | "sell" | "all";
}

export interface InsiderFeedResult {
  results: FilingItem[];
  unavailable?: boolean;
  stale?: boolean;
  source?: string;
  limitations?: string[];
}

export interface MarketDataProvider {
  readonly id: "open-market" | "sectors";
  readonly capabilities: ReadonlySet<MarketDataCapability>;

  getBrokersRegistry(): Promise<BrokerRegistryItem[]>;
  getCompanyReport(
    symbol: string,
    sections?: CompanyReportSection[]
  ): Promise<CompanyReport | null>;
  getQuarterlyFinancials(
    symbol: string,
    nQuarters?: number
  ): Promise<QuarterlyFinancialMetrics[] | null>;
  getDailyTransactions(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<DailyTransaction[] | null>;
  getBrokerSummary(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<BrokerSummaryResponse | null>;
  getForeignFlow(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<ForeignFlowResponse | null>;
  getCorporateActions(symbol: string): Promise<CorporateActionsResponse | null>;
  getFilings(
    symbol?: string,
    params?: Record<string, unknown>
  ): Promise<{ results: FilingItem[] } | null>;
  getInsiderFeed(params?: InsiderFeedParams): Promise<InsiderFeedResult>;
  getNews(symbol: string, limit?: number): Promise<{ results: NewsItem[] }>;
  getSuspensions(symbol: string): Promise<{ results: any[] } | null>;
  getCompanySegments(symbol: string): Promise<any | null>;

  getCreditsUsed(): number;
  getCallLog(): CallLogEntry[];
}
