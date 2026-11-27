import { computeTechnicalIndicators } from "@/lib/quant/indicators";
import {
  detectHarmonicPatterns,
  type HarmonicMatch,
  type HarmonicTimeframe,
} from "@/lib/quant/harmonic";
import { buildTimeframeCandles } from "@/lib/market/timeframes";
import { YahooClient } from "@/lib/market/yahoo";
import type { DailyTransaction } from "@/lib/sectors/types";

export type ChartHarmonicTimeframe = "1D" | "1W" | "1Y" | "5Y";

export interface HarmonicOverlayResult {
  symbol: string;
  timeframe: HarmonicTimeframe;
  matches: HarmonicMatch[];
}

export function harmonicTimeframeFor(
  timeframe: ChartHarmonicTimeframe
): HarmonicTimeframe {
  return timeframe === "5Y" ? "1M" : "1D";
}

export async function analyzeSymbolHarmonics(
  symbol: string,
  timeframe: ChartHarmonicTimeframe,
  requestedTimeframe?: HarmonicTimeframe
): Promise<HarmonicOverlayResult> {
  const allowed: HarmonicTimeframe[] = ["4H", "1D", "1W", "1M"];
  const harmonicTimeframe =
    requestedTimeframe && allowed.includes(requestedTimeframe)
      ? requestedTimeframe
      : harmonicTimeframeFor(timeframe);
  const startDate = new Date(Date.now() - 5 * 365 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const yahoo = new YahooClient();
  const daily = await yahoo.getDailyTransactions(symbol, startDate);
  const candles = buildTimeframeCandles(daily, harmonicTimeframe);
  const rsi = computeTechnicalIndicators(
    candles.map((candle) => ({ ...candle, symbol }))
  ).rsi14;
  const matches = detectHarmonicPatterns(candles, {
    symbol,
    timeframe: harmonicTimeframe,
    rsi,
    includeForming: true,
  })
    .filter((match) => match.pivotPrices)
    .sort((left, right) => {
      if (left.status !== right.status) return left.status === "completed" ? -1 : 1;
      return right.score - left.score;
    })
    .slice(0, 3);

  return { symbol, timeframe: harmonicTimeframe, matches };
}
