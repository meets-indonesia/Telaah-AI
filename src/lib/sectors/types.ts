export interface BrokerRegistryItem {
  code: string;
  name: string;
  is_foreign: boolean;
  cohort: string;
  license_type: string;
}

export interface CompanyOverview {
  company_name?: string;
  listing_board?: string;
  industry?: string;
  sub_industry?: string;
  sector?: string;
  sub_sector?: string;
  market_cap?: number;
  market_cap_rank?: number;
  address?: string;
  website?: string;
  description?: string;
  ipo_date?: string;
  listing_shares?: number;
}

export interface ValuationData {
  last_close_price?: number;
  latest_close_date?: string;
  daily_close_change?: number;
  forward_pe?: number | null;
  intrinsic_value?: number | null;
  historical_valuation?: {
    pe?: {
      current?: number;
      mean_3yr?: number;
      std_dev_3yr?: number;
      max_3yr?: number;
      min_3yr?: number;
    };
    pb?: {
      current?: number;
      mean_3yr?: number;
      std_dev_3yr?: number;
      max_3yr?: number;
      min_3yr?: number;
    };
    ps?: {
      current?: number;
      mean_3yr?: number;
    };
    dividend_yield?: number;
  };
}

export interface PeerCompany {
  symbol: string;
  company_name: string;
  market_cap: number;
  pe?: number;
  pb?: number;
  ps?: number;
  dividend_yield?: number;
  close?: number;
  daily_change?: number;
}

export interface PeerData {
  peers_data?: {
    companies?: PeerCompany[];
    group_name?: {
      sector?: string;
      industry?: string;
      sub_sector?: string;
      sub_industry?: string;
    };
  };
}

export interface FinancialsReportData {
  eps?: number;
  historical_eps?: Array<{ date: string; eps: number }>;
  historical_financials?: Array<{
    date: string;
    revenue?: number;
    gross_profit?: number;
    operating_profit?: number;
    net_income?: number;
  }>;
  historical_financial_ratio?: Array<{
    date: string;
    gross_profit_margin?: number;
    operating_profit_margin?: number;
    net_profit_margin?: number;
    roe?: number;
    roa?: number;
    debt_to_equity?: number;
  }>;
  yoy_quarter_earnings_growth?: number;
  yoy_quarter_revenue_growth?: number;
}

export interface OwnershipData {
  major_shareholders?: Array<{
    name: string;
    percentage: number;
    total_shares?: number;
  }>;
  whale_investors?: Array<{
    name: string;
    percentage?: number;
  }>;
  conglomerates_group?: string | null;
}

export interface ManagementData {
  key_executives?: Array<{
    name: string;
    title: string;
  }>;
  executives_shareholdings?: Array<{
    name: string;
    title: string;
    percentage?: number;
    shares?: number;
  }>;
}

export interface CompanyReport {
  symbol: string;
  company_name: string;
  overview?: CompanyOverview;
  valuation?: ValuationData;
  financials?: FinancialsReportData;
  peers?: PeerData[];
  ownership?: OwnershipData;
  management?: ManagementData;
}

export interface DailyTransaction {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  market_cap?: number;
}

export interface BrokerTransactionSummary {
  broker_code: string;
  bfreq: number;
  blot: number;
  bval: number;
  bavg_per_share: number;
  sfreq: number;
  slot: number;
  sval: number;
  savg_per_share: number;
  nlot: number;
  nval: number;
  navg_per_share: number;
}

export interface DailyBrokerSummary {
  date: string;
  summary: BrokerTransactionSummary[];
}

export interface BrokerSummaryResponse {
  symbol: string;
  start?: string;
  end?: string;
  data: DailyBrokerSummary[];
}

export interface ForeignFlowItem {
  date: string;
  net_foreign_inflow: number;
}

export interface ForeignFlowResponse {
  symbol: string;
  start?: string;
  end?: string;
  data: ForeignFlowItem[];
}

export interface CorporateActionItem {
  id?: string | number;
  date?: string;
  action_type?: string;
  description?: string;
  cum_date?: string;
  ex_date?: string;
  ratio?: string;
  amount?: number;
  price?: number;
  nominal?: number;
}

export interface CorporateActionsResponse {
  symbol: string;
  corporate_actions?: CorporateActionItem[];
}

export interface FilingItem {
  id?: string | number;
  date?: string;
  title: string;
  body?: string;
  symbol?: string;
  category?: string;
}

export interface NewsItem {
  id?: string | number;
  title: string;
  body?: string;
  published_at?: string;
  source?: string;
  url?: string;
  tags?: string[];
  sentiment?: string;
}

export interface QuarterlyFinancialMetrics {
  symbol: string;
  date: string;
  revenue?: number;
  gross_profit?: number;
  earnings?: number;
  operating_pnl?: number;
  ebitda?: number;
  ebit?: number;
  total_assets?: number;
  total_liabilities?: number;
  total_equity?: number;
  total_debt?: number;
  cash_and_short_term_investments?: number;
  operating_cash_flow?: number;
  free_cash_flow?: number;
  financials_sector_metrics?: Record<string, any>;
}

export interface ShareholderCompositionResponse {
  symbol: string;
  year: number;
  data: Array<{
    date: string;
    shares_number: number;
    individual_l?: number;
    corporate_l?: number;
    financial_institutions_l?: number;
    insurance_l?: number;
    mutual_fund_l?: number;
    pension_fund_l?: number;
    securities_companies_l?: number;
    foundation_l?: number;
    others_l?: number;
    individual_f?: number;
    corporate_f?: number;
    financial_institutions_f?: number;
    insurance_f?: number;
    mutual_fund_f?: number;
    pension_fund_f?: number;
    securities_companies_f?: number;
    foundation_f?: number;
    others_f?: number;
  }>;
}

export interface InsiderTransaction {
  id: string;
  date: string;
  insiderName: string;
  position: string;
  action: "BUY" | "SELL" | "TRANSFER" | "NEUTRAL";
  shares: number;
  price?: number;
  value?: number;
  percentageBefore?: number;
  percentageAfter?: number;
  filingTitle: string;
  filingId?: string | number;
}

export interface InsiderClusterAnalysis {
  status: "available" | "partial" | "unavailable";
  signal: "Cluster Buy (Akumulasi Agresif)" | "Moderate Buy" | "Netral" | "Moderate Sell" | "Cluster Sell (Distribusi Agresif)";
  score: number; // -100 to +100
  summary: string;
  totalBuyShares: number;
  totalSellShares: number;
  netShares: number;
  totalBuyValue: number;
  totalSellValue: number;
  netValue: number;
  uniqueInsiders: number;
  clusterBuyDetected: boolean;
  clusterSellDetected: boolean;
  insiderActors: Array<{
    name: string;
    position: string;
    netShares: number;
    totalBuyShares: number;
    totalSellShares: number;
    actionCount: number;
    lastDate: string;
  }>;
  transactions: InsiderTransaction[];
}

export interface CommodityBenchmark {
  commodityName: string;
  symbol: string;
  currentPrice: number;
  currency: string;
  unit: string;
  dailyChangePct: number;
  change30dPct: number;
  trend: "Bullish" | "Bearish" | "Neutral";
  lastUpdated: string;
}

export interface MiningOperationalData {
  concessionsOrSites: Array<{
    name: string;
    location: string;
    type: string;
    reserves?: string;
  }>;
  provenReserves?: string;
  probableReserves?: string;
  annualProductionTarget?: string;
  cashCostPerUnit?: string;
  commodityExposure: Array<{
    commodity: string;
    revenueContributionPct: number;
  }>;
  sensitivityRule: string;
}

export interface CommodityLensData {
  isCommodityIssuer: boolean;
  sectorBadge: string;
  primaryCommodity: string;
  benchmarks: CommodityBenchmark[];
  operations?: MiningOperationalData;
  sensitivityEstimate: {
    baseCommodity: string;
    priceShockPercent: number;
    estimatedEbitdaImpactPercent: number;
    narrative: string;
  };
}

