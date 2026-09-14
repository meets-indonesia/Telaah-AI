import { TechnicalAnalysisResult } from "../quant/indicators";
import { FinancialHealthAnalysis } from "../quant/financials";
import { FlowLensAnalysis } from "../quant/flow";
import { HarmonicPatternResult } from "../quant/harmonic";
import {
  CompanyOverview,
  ValuationData,
  PeerCompany,
  CorporateActionItem,
  FilingItem,
  NewsItem,
  OwnershipData,
  InsiderClusterAnalysis,
  CommodityLensData,
} from "../sectors/types";

export type AnalysisMode = "quick" | "full";

export type IntentType =
  | "claim_check"
  | "news_event"
  | "company_overview"
  | "thesis_review"
  | "market_technical";

export type ClaimVerdict =
  | "Didukung"
  | "Bertentangan"
  | "Perlu konteks"
  | "Tidak dapat diverifikasi"
  | "Opini/prediksi";

export interface AtomicClaim {
  id: string;
  originalText: string;
  claimType: "financial" | "flow" | "price_technical" | "event" | "valuation" | "general";
  targetMetric?: string;
  statedPeriod?: string;
}

export interface ClaimEvaluation {
  claimId: string;
  originalText: string;
  verdict: ClaimVerdict;
  confidence: number; // 0 - 1
  reasoning: string;
  factualMetricValue?: string;
  evidenceIds: string[];
}

export interface EvidenceRecord {
  id: string;
  module: "overview" | "financials" | "valuation" | "flowlens" | "technical" | "events" | "ownership" | "insider" | "commodity" | "segments" | "harmonic";
  sourceEndpoint: string;
  asOfDate: string;
  retrievedAt: string;
  summary: string;
  rawData?: any;
}

export interface PeerComparisonItem {
  symbol: string;
  companyName: string;
  marketCap: number;
  pe?: number | null;
  pb?: number | null;
  dividendYield?: number | null;
  isTarget?: boolean;
}

export interface PeerLensData {
  status: "available" | "partial" | "unavailable";
  basis: string;
  peers: PeerComparisonItem[];
}

export interface EventsTimelineData {
  status: "available" | "partial" | "unavailable";
  actions: CorporateActionItem[];
  filings: FilingItem[];
  news: NewsItem[];
  suspensions: any[];
}

export interface CompanyIntelligenceReport {
  id: string;
  symbol: string;
  companyName: string;
  userPrompt: string;
  mode: AnalysisMode;
  intent: IntentType;
  generatedAt: string;
  dataAsOf: string;

  // Direct Answer & Executive Summary
  directAnswer: string;
  executiveSummary: string;
  
  // Claim Intelligence
  claims: ClaimEvaluation[];

  // Evidence Modules
  overview?: CompanyOverview;
  financials: FinancialHealthAnalysis;
  valuation?: ValuationData;
  peerLens?: PeerLensData;
  flowLens: FlowLensAnalysis;
  technical: TechnicalAnalysisResult;
  events: EventsTimelineData;
  ownership?: OwnershipData;
  insiderRadar?: InsiderClusterAnalysis;
  commodityLens?: CommodityLensData;
  harmonic?: HarmonicPatternResult;
  segments?: any;

  // Synthesis, Open Questions, Audit
  openQuestions: string[];
  limitations: string[];
  evidenceRecords: EvidenceRecord[];
  creditsConsumed: number;
  toolCallTrace: Array<{ endpoint: string; params: any; credits: number; timestamp: string }>;
}
