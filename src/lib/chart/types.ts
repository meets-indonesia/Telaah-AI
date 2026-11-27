import type { ChartCandle } from "@/lib/market/scraper-client";

export type ChartTimeframe = "1D" | "1W" | "1Y" | "5Y";

export interface ChartPayload {
  success: true;
  symbol: string;
  timeframe: ChartTimeframe;
  source: "stockbit" | "yahoo";
  delayed: boolean;
  candles: ChartCandle[];
  last: ChartCandle;
  previousClose: number | null;
  fetchedAt: string;
}

export interface ChartFrame extends ChartPayload {
  marketOpen: boolean;
  marketLabel: string;
}
