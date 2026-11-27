import type { StockbitQuote } from "@/lib/market/scraper-client";
import type { DailyTransaction } from "@/lib/sectors/types";

export interface BsjpRules {
  minPrice: number;
  minValue: number;
  minCloseStrength: number;
  minVolumeRatio: number;
  minReturnPct: number;
  maxReturnPct: number;
  minRsi: number;
  maxRsi: number;
  maxCandidates: number;
}

export const DEFAULT_BSJP_RULES: BsjpRules = {
  minPrice: 100,
  minValue: 5_000_000_000,
  minCloseStrength: 0.7,
  minVolumeRatio: 1.5,
  minReturnPct: 1,
  maxReturnPct: 7,
  minRsi: 50,
  maxRsi: 72,
  maxCandidates: 2,
};

export interface BsjpCandidate {
  symbol: string;
  date: string;
  last: number;
  changePct: number;
  closeStrength: number;
  volumeRatio: number;
  rsi: number;
  ema20: number;
  ema50: number;
  value: number;
  foreignNet: number | null;
  score: number;
  reasons: string[];
}

export interface BsjpEvaluationInput {
  symbol: string;
  candles: DailyTransaction[];
  quote: StockbitQuote;
  rules: BsjpRules;
  today: string;
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const multiplier = 2 / (period + 1);
  let current = average(values.slice(0, period));
  for (let index = period; index < values.length; index += 1) {
    current = values[index] * multiplier + current * (1 - multiplier);
  }
  return current;
}

export function rsi(values: number[], period = 14): number | null {
  if (values.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, change)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -change)) / period;
  }
  if (avgLoss === 0) return 100;
  const strength = avgGain / avgLoss;
  return 100 - 100 / (1 + strength);
}

export function evaluateBsjp(
  input: BsjpEvaluationInput
): BsjpCandidate | null {
  const history = input.candles
    .filter((candle) => candle.date < input.today && candle.close > 0)
    .sort((left, right) => left.date.localeCompare(right.date));
  if (history.length < 55) return null;

  const quote = input.quote;
  const last = quote.last;
  if (!Number.isFinite(last) || last < input.rules.minPrice) return null;
  if (quote.value < input.rules.minValue) return null;

  const previousClose =
    quote.previousClose > 0
      ? quote.previousClose
      : last - (quote.change ?? 0);
  const changePct =
    Number.isFinite(quote.changePct) && quote.changePct !== 0
      ? quote.changePct
      : previousClose > 0
        ? ((last - previousClose) / previousClose) * 100
        : 0;

  const high = quote.high ?? last;
  const low = quote.low ?? last;
  const range = high - low;
  const closeStrength = range > 0 ? (last - low) / range : 0;
  if (closeStrength < input.rules.minCloseStrength) return null;

  const previous = history.slice(-20);
  const avgVolume = average(previous.map((candle) => candle.volume));
  const volumeRatio = avgVolume > 0 ? quote.volume / avgVolume : 0;
  if (volumeRatio < input.rules.minVolumeRatio) return null;

  if (changePct < input.rules.minReturnPct || changePct > input.rules.maxReturnPct) {
    return null;
  }

  const closes = [...history.map((candle) => candle.close), last];
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const rsi14 = rsi(closes, 14);
  if (ema20 === null || ema50 === null || rsi14 === null) return null;
  if (rsi14 < input.rules.minRsi || rsi14 > input.rules.maxRsi) return null;
  if (!(last > ema20 && ema20 > ema50)) return null;

  const foreignPositive =
    quote.foreignCurrent &&
    typeof quote.foreignNet === "number" &&
    quote.foreignNet > 0;

  const score =
    closeStrength * 30 +
    (Math.min(volumeRatio, 3) / 3) * 25 +
    15 +
    (foreignPositive ? 10 : 0) +
    Math.max(0, 10 - Math.abs(rsi14 - 60) / 2) +
    Math.max(0, 10 - Math.abs(changePct - 3.5));

  const reasons = [
    `close strength ${(closeStrength * 100).toFixed(0)}%`,
    `volume ${volumeRatio.toFixed(1)}x`,
    `RSI ${rsi14.toFixed(0)}`,
    `EMA20 > EMA50`,
  ];
  if (foreignPositive) reasons.push("foreign net buy");

  return {
    symbol: input.symbol,
    date: input.today,
    last,
    changePct,
    closeStrength,
    volumeRatio,
    rsi: rsi14,
    ema20,
    ema50,
    value: quote.value,
    foreignNet: quote.foreignCurrent ? quote.foreignNet : null,
    score: Math.round(Math.min(100, Math.max(0, score)) * 10) / 10,
    reasons,
  };
}
