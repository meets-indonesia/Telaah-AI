import { CompanyIntelligenceReport, ClaimEvaluation } from "@/lib/agent/types";
import { StockCompareResult } from "@/app/api/compare/route";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  timestamp: string;
  text: string;
  // Optional rich stock card payload
  stockCard?: {
    symbol: string;
    companyName: string;
    sector?: string;
    price?: number;
    changePct?: number;
    verdict?: "bullish" | "bearish" | "neutral" | "caution";
    verdictText?: string;
    highlights: Array<{ title: string; desc: string; icon?: "check" | "alert" | "info" }>;
    retailTakeaway?: string;
    report?: CompanyIntelligenceReport;
  };
  // Optional comparison battle card payload
  compareCard?: StockCompareResult;
  // Optional rumor fact-checker payload
  factCheckCard?: {
    symbol: string;
    originalRumor: string;
    claims: ClaimEvaluation[];
    overallRisk: "low" | "medium" | "high";
  };
  isLoading?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  symbol?: string;
  date: string;
  messages: ChatMessage[];
  report?: CompanyIntelligenceReport | null;
}
