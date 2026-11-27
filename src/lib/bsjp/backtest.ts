import type { StockbitQuote } from "@/lib/market/scraper-client";
import type { DailyTransaction } from "@/lib/sectors/types";
import {
  DEFAULT_BSJP_RULES,
  evaluateBsjp,
  type BsjpCandidate,
  type BsjpRules,
} from "@/lib/bsjp/evaluate";

export interface BsjpCosts {
  buyFeePct: number;
  sellFeePct: number;
  slippagePct: number;
}

export const DEFAULT_BSJP_COSTS: BsjpCosts = {
  buyFeePct: 0.15,
  sellFeePct: 0.25,
  slippagePct: 0.15,
};

export interface BsjpTrade {
  date: string;
  exitDate: string;
  symbol: string;
  score: number;
  entry: number;
  exit: number;
  shares: number;
  buyCost: number;
  sellProceeds: number;
  pnl: number;
  gapPct: number;
  netReturnPct: number;
}

export interface BsjpBacktestOptions {
  data: Record<string, DailyTransaction[]>;
  index: DailyTransaction[];
  rules?: BsjpRules;
  costs?: BsjpCosts;
  initialEquity?: number;
  maxPositions?: number;
  allocationPct?: number;
  start?: string;
  end?: string;
  limitations?: string[];
}

export interface BsjpBacktestReport {
  start: string;
  end: string;
  initialEquity: number;
  finalEquity: number;
  totalReturnPct: number;
  cagrPct: number;
  maxDrawdownPct: number;
  sharpe: number;
  trades: BsjpTrade[];
  tradeCount: number;
  winRatePct: number;
  avgGrossPct: number;
  avgNetPct: number;
  profitFactor: number;
  exposurePct: number;
  worstGapPct: number;
  byYear: Record<string, number>;
  limitations: string[];
}

interface CandidateEntry {
  candidate: BsjpCandidate;
  close: number;
  nextOpen: number;
  exitDate: string;
}

interface PendingTrade {
  trade: BsjpTrade;
  exitDate: string;
}

export function roundToTick(price: number): number {
  const tick = price < 200 ? 1 : price < 500 ? 2 : price < 2000 ? 5 : price < 5000 ? 10 : 25;
  return Math.round(price / tick) * tick;
}

function emaSeries(values: number[], period: number): Array<number | null> {
  const result: Array<number | null> = new Array(values.length).fill(null);
  if (values.length < period) return result;
  const multiplier = 2 / (period + 1);
  let current = values.slice(0, period).reduce((total, value) => total + value, 0) / period;
  result[period - 1] = current;
  for (let index = period; index < values.length; index += 1) {
    current = values[index] * multiplier + current * (1 - multiplier);
    result[index] = current;
  }
  return result;
}

function quoteFromCandle(
  candles: DailyTransaction[],
  index: number,
  symbol: string
): StockbitQuote {
  const candle = candles[index];
  const previous = candles[index - 1];
  const change = candle.close - previous.close;
  return {
    symbol,
    last: candle.close,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    previousClose: previous.close,
    change,
    changePct: previous.close > 0 ? (change / previous.close) * 100 : 0,
    volume: candle.volume,
    value: candle.close * candle.volume,
    frequency: null,
    foreignBuy: null,
    foreignSell: null,
    foreignNet: null,
    foreignCurrent: false,
    bid: null,
    offer: null,
    ara: null,
    arb: null,
    source: "backtest",
  };
}

function average(values: number[]): number {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

export function runBsjpBacktest(
  options: BsjpBacktestOptions
): BsjpBacktestReport {
  const rules = options.rules ?? DEFAULT_BSJP_RULES;
  const costs = options.costs ?? DEFAULT_BSJP_COSTS;
  const initialEquity = options.initialEquity ?? 100_000_000;
  const maxPositions = Math.max(1, options.maxPositions ?? 2);
  const allocationPct = Math.min(1, Math.max(0.01, options.allocationPct ?? 0.25));
  const start = options.start ?? "";
  const end = options.end ?? "";
  const limitations = [...(options.limitations ?? [])];

  const sortedIndex = [...options.index]
    .filter((candle) => Number.isFinite(candle.close) && candle.close > 0)
    .sort((left, right) => left.date.localeCompare(right.date));
  const indexEma = emaSeries(
    sortedIndex.map((candle) => candle.close),
    20
  );
  const regime = new Map<string, boolean>();
  sortedIndex.forEach((candle, index) => {
    const ema = indexEma[index];
    if (ema !== null) regime.set(candle.date, candle.close > ema);
  });
  if (regime.size === 0) {
    limitations.push("IHSG/EMA20 tidak tersedia; filter regime dilewati.");
  }

  const candidatesByDate = new Map<string, CandidateEntry[]>();
  let candidateCount = 0;
  for (const [symbol, raw] of Object.entries(options.data)) {
    const candles = [...raw]
      .filter(
        (candle) =>
          candle.close > 0 &&
          candle.open > 0 &&
          candle.high > 0 &&
          candle.low > 0 &&
          candle.volume > 0
      )
      .sort((left, right) => left.date.localeCompare(right.date));
    if (candles.length < 56) {
      limitations.push(`${symbol}: histori kurang dari 56 hari.`);
      continue;
    }
    for (let index = 55; index < candles.length - 1; index += 1) {
      const date = candles[index].date;
      if (start && date < start) continue;
      if (end && date > end) continue;
      if (regime.size > 0 && regime.get(date) !== true) continue;
      const candidate = evaluateBsjp({
        symbol,
        candles: candles.slice(0, index),
        quote: quoteFromCandle(candles, index, symbol),
        rules,
        today: date,
      });
      if (!candidate) continue;
      candidateCount += 1;
      const next = candles[index + 1];
      if (next.open <= 0) continue;
      const list = candidatesByDate.get(date) ?? [];
      list.push({
        candidate,
        close: candles[index].close,
        nextOpen: next.open,
        exitDate: next.date,
      });
      candidatesByDate.set(date, list);
    }
  }

  const dates = (regime.size > 0
    ? sortedIndex.map((candle) => candle.date)
    : [...new Set(Object.values(options.data).flat().map((candle) => candle.date))]
  )
    .filter((date) => (!start || date >= start) && (!end || date <= end))
    .sort((left, right) => left.localeCompare(right));

  let equity = initialEquity;
  let peak = initialEquity;
  let maxDrawdown = 0;
  let exposureSum = 0;
  let exposureDays = 0;
  const dailyReturns: number[] = [];
  const equityCurve: Array<{ date: string; equity: number }> = [];
  const trades: BsjpTrade[] = [];
  let pending: PendingTrade[] = [];

  const applyExits = (date: string): number => {
    const exiting = pending.filter((item) => item.exitDate <= date);
    pending = pending.filter((item) => item.exitDate > date);
    return exiting.reduce((total, item) => total + item.trade.pnl, 0);
  };

  for (const date of dates) {
    const equityBefore = equity;
    const realized = applyExits(date);
    equity += realized;
    dailyReturns.push(equityBefore > 0 ? realized / equityBefore : 0);
    peak = Math.max(peak, equity);
    if (peak > 0) {
      maxDrawdown = Math.max(maxDrawdown, ((peak - equity) / peak) * 100);
    }
    equityCurve.push({ date, equity });

    const entries = (candidatesByDate.get(date) ?? [])
      .sort((left, right) => right.candidate.score - left.candidate.score)
      .slice(0, maxPositions);

    for (const entry of entries) {
      if (equity <= 0) break;
      const budget = equity * allocationPct;
      const entryPrice = roundToTick(entry.close * (1 + costs.slippagePct / 100));
      const buyUnit = entryPrice * (1 + costs.buyFeePct / 100);
      const shares = Math.floor(budget / buyUnit / 100) * 100;
      if (shares <= 0) continue;
      const buyCost = shares * buyUnit;
      const exitPrice = roundToTick(entry.nextOpen * (1 - costs.slippagePct / 100));
      const sellProceeds = shares * exitPrice * (1 - costs.sellFeePct / 100);
      const pnl = sellProceeds - buyCost;
      const gapPct = ((entry.nextOpen - entry.close) / entry.close) * 100;
      const trade: BsjpTrade = {
        date,
        exitDate: entry.exitDate,
        symbol: entry.candidate.symbol,
        score: entry.candidate.score,
        entry: entryPrice,
        exit: exitPrice,
        shares,
        buyCost,
        sellProceeds,
        pnl,
        gapPct,
        netReturnPct: buyCost > 0 ? (pnl / buyCost) * 100 : 0,
      };
      trades.push(trade);
      pending.push({ trade, exitDate: entry.exitDate });
      exposureSum += buyCost / equity;
      exposureDays += 1;
    }
  }

  const remaining = pending.reduce((total, item) => total + item.trade.pnl, 0);
  equity += remaining;
  peak = Math.max(peak, equity);
  if (peak > 0) {
    maxDrawdown = Math.max(maxDrawdown, ((peak - equity) / peak) * 100);
  }
  if (equityCurve.length > 0) {
    equityCurve[equityCurve.length - 1].equity = equity;
  }

  const first = dates[0] ?? start;
  const last = dates[dates.length - 1] ?? end;
  const days = first && last
    ? Math.max(1, (Date.parse(last) - Date.parse(first)) / 86_400_000)
    : 1;
  const finalEquity = equity;
  const totalReturnPct = (finalEquity / initialEquity - 1) * 100;
  const cagrPct = (Math.pow(finalEquity / initialEquity, 365 / days) - 1) * 100;
  const wins = trades.filter((trade) => trade.pnl > 0);
  const losses = trades.filter((trade) => trade.pnl < 0);
  const profitFactor =
    losses.length > 0
      ? wins.reduce((total, trade) => total + trade.pnl, 0) /
        Math.abs(losses.reduce((total, trade) => total + trade.pnl, 0))
      : wins.length > 0
        ? 999
        : 0;
  const meanDaily = average(dailyReturns);
  const stdDaily = standardDeviation(dailyReturns);
  const sharpe = stdDaily > 0 ? (meanDaily / stdDaily) * Math.sqrt(252) : 0;
  const byYear: Record<string, number> = {};
  for (const trade of trades) {
    const year = trade.exitDate.slice(0, 4);
    byYear[year] = (byYear[year] ?? 0) + trade.pnl;
  }

  return {
    start: first,
    end: last,
    initialEquity,
    finalEquity,
    totalReturnPct,
    cagrPct,
    maxDrawdownPct: maxDrawdown,
    sharpe,
    trades,
    tradeCount: trades.length,
    winRatePct: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    avgGrossPct: average(trades.map((trade) => trade.gapPct)),
    avgNetPct: average(trades.map((trade) => trade.netReturnPct)),
    profitFactor,
    exposurePct: exposureDays > 0 ? (exposureSum / dates.length) * 100 : 0,
    worstGapPct: trades.length > 0 ? Math.min(...trades.map((trade) => trade.gapPct)) : 0,
    byYear,
    limitations: [
      ...limitations,
      "Foreign flow history is not used in the backtest; it is a live confirmation only.",
      "Entry uses the daily close as a proxy for the 15:50 price.",
      `${candidateCount} raw BSJP signals passed the rules before ranking.`,
    ],
  };
}
