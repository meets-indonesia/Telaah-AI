import type { DailyTransaction } from "@/lib/sectors/types";
import { ema, rsi } from "@/lib/bsjp/evaluate";
import {
  DEFAULT_BSJP_COSTS,
  roundToTick,
  type BsjpCosts,
} from "@/lib/bsjp/backtest";

export type ResearchSignal = "momentum" | "reversal" | "breakout" | "random";
export type ResearchExit =
  | "next_open"
  | "next_close"
  | "hold_2d"
  | "hold_3d";

export interface ResearchFeature {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
  changePct: number;
  closeStrength: number;
  volumeRatio: number;
  rsi: number;
  ema20: number;
  ema50: number;
  high20: number;
  low20: number;
  nextOpen: number;
  nextClose: number;
  nextDate: string;
  forwardCloses: number[];
  forwardDates: string[];
}

export interface ResearchRules {
  signal: ResearchSignal;
  exit: ResearchExit;
  maxPositions: number;
}

export interface ResearchTrade {
  date: string;
  exitDate: string;
  symbol: string;
  entry: number;
  exit: number;
  shares: number;
  buyCost: number;
  sellProceeds: number;
  pnl: number;
  grossPct: number;
  netReturnPct: number;
}

export interface ResearchRow {
  signal: ResearchSignal;
  exit: ResearchExit;
  maxPositions: number;
  tradeCount: number;
  totalReturnPct: number;
  cagrPct: number;
  maxDrawdownPct: number;
  sharpe: number;
  winRatePct: number;
  avgGrossPct: number;
  avgNetPct: number;
  profitFactor: number;
  exposurePct: number;
  worstTradePct: number;
}

export interface ResearchReport extends ResearchRow {
  trades: ResearchTrade[];
}

function average(values: number[]): number {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  return Math.sqrt(
    values.reduce((total, value) => total + (value - mean) ** 2, 0) /
      (values.length - 1)
  );
}

function hash(value: string): number {
  let h = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function buildFeatures(
  symbol: string,
  candles: DailyTransaction[]
): ResearchFeature[] {
  const sorted = [...candles]
    .filter(
      (candle) =>
        candle.close > 0 &&
        candle.open > 0 &&
        candle.high > 0 &&
        candle.low > 0 &&
        candle.volume > 0
    )
    .sort((left, right) => left.date.localeCompare(right.date));
  const features: ResearchFeature[] = [];

  for (let index = 55; index < sorted.length - 1; index += 1) {
    const candle = sorted[index];
    const previous = sorted[index - 1];
    const next = sorted[index + 1];
    const history = sorted.slice(0, index);
    const closes = [...history.map((row) => row.close), candle.close];
    const ema20 = ema(closes, 20);
    const ema50 = ema(closes, 50);
    const rsi14 = rsi(closes, 14);
    if (ema20 === null || ema50 === null || rsi14 === null) continue;

    const prior20 = sorted.slice(index - 20, index);
    const avgVolume = average(prior20.map((row) => row.volume));
    const range = candle.high - candle.low;
    features.push({
      symbol,
      date: candle.date,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      value: candle.close * candle.volume,
      changePct:
        previous.close > 0
          ? ((candle.close - previous.close) / previous.close) * 100
          : 0,
      closeStrength: range > 0 ? (candle.close - candle.low) / range : 0,
      volumeRatio: avgVolume > 0 ? candle.volume / avgVolume : 0,
      rsi: rsi14,
      ema20,
      ema50,
      high20: Math.max(...prior20.map((row) => row.high)),
      low20: Math.min(...prior20.map((row) => row.low)),
      nextOpen: next.open,
      nextClose: next.close,
      nextDate: next.date,
      forwardCloses: sorted
        .slice(index + 1, index + 4)
        .map((row) => row.close),
      forwardDates: sorted
        .slice(index + 1, index + 4)
        .map((row) => row.date),
    });
  }

  return features;
}

function qualifies(feature: ResearchFeature, signal: ResearchSignal): boolean {
  if (feature.value < 5_000_000_000 || feature.close < 100) return false;
  if (signal === "random") return true;
  if (signal === "momentum") {
    return (
      feature.closeStrength >= 0.7 &&
      feature.volumeRatio >= 1.5 &&
      feature.changePct >= 1 &&
      feature.changePct <= 7 &&
      feature.rsi >= 50 &&
      feature.rsi <= 72 &&
      feature.close > feature.ema20 &&
      feature.ema20 > feature.ema50
    );
  }
  if (signal === "reversal") {
    return (
      feature.closeStrength <= 0.3 &&
      feature.volumeRatio >= 1.5 &&
      feature.changePct <= -1 &&
      feature.changePct >= -7 &&
      feature.rsi >= 30 &&
      feature.rsi <= 55 &&
      feature.close > feature.ema50
    );
  }
  return (
    feature.close > feature.high20 &&
    feature.volumeRatio >= 1.5 &&
    feature.changePct >= 1 &&
    feature.changePct <= 7 &&
    feature.rsi >= 50 &&
    feature.rsi <= 75 &&
    feature.close > feature.ema20 &&
    feature.ema20 > feature.ema50
  );
}

function score(feature: ResearchFeature, signal: ResearchSignal): number {
  if (signal === "random") {
    return hash(`${feature.symbol}:${feature.date}`) * 100;
  }
  if (signal === "reversal") {
    return (
      (1 - feature.closeStrength) * 40 +
      Math.min(feature.volumeRatio, 3) * 15 +
      Math.max(0, 55 - feature.rsi) +
      Math.max(0, 7 - Math.abs(feature.changePct))
    );
  }
  if (signal === "breakout") {
    return (
      Math.min(feature.volumeRatio, 3) * 20 +
      Math.max(0, 7 - Math.abs(feature.changePct)) * 5 +
      Math.min(20, ((feature.close - feature.high20) / feature.high20) * 100)
    );
  }
  return (
    feature.closeStrength * 30 +
    Math.min(feature.volumeRatio, 3) * 8 +
    Math.max(0, 10 - Math.abs(feature.rsi - 60) / 2) +
    Math.max(0, 10 - Math.abs(feature.changePct - 3.5))
  );
}

export function runResearch(
  features: ResearchFeature[],
  dates: string[],
  regime: Map<string, boolean>,
  rules: ResearchRules,
  options: {
    costs?: BsjpCosts;
    initialEquity?: number;
    allocationPct?: number;
  } = {}
): ResearchReport {
  const costs = options.costs ?? DEFAULT_BSJP_COSTS;
  const initialEquity = options.initialEquity ?? 100_000_000;
  const allocationPct = options.allocationPct ?? 0.25;
  const byDate = new Map<string, ResearchFeature[]>();
  for (const feature of features) {
    if (!qualifies(feature, rules.signal)) continue;
    if (regime.size > 0 && regime.get(feature.date) !== true) continue;
    const list = byDate.get(feature.date) ?? [];
    list.push(feature);
    byDate.set(feature.date, list);
  }

  let equity = initialEquity;
  let peak = initialEquity;
  let maxDrawdown = 0;
  let exposureSum = 0;
  const dailyReturns: number[] = [];
  const trades: ResearchTrade[] = [];
  let pending: Array<ResearchTrade & { exitDate: string }> = [];

  for (const date of dates) {
    const equityBefore = equity;
    const exiting = pending.filter((trade) => trade.exitDate <= date);
    pending = pending.filter((trade) => trade.exitDate > date);
    const realized = exiting.reduce((total, trade) => total + trade.pnl, 0);
    equity += realized;
    dailyReturns.push(equityBefore > 0 ? realized / equityBefore : 0);
    peak = Math.max(peak, equity);
    if (peak > 0) {
      maxDrawdown = Math.max(maxDrawdown, ((peak - equity) / peak) * 100);
    }

    const candidates = (byDate.get(date) ?? [])
      .sort((left, right) => score(right, rules.signal) - score(left, rules.signal))
      .slice(0, rules.maxPositions);

    for (const feature of candidates) {
      if (equity <= 0) break;
      const entry = roundToTick(feature.close * (1 + costs.slippagePct / 100));
      const budget = equity * allocationPct;
      const shares = Math.floor(
        budget / (entry * (1 + costs.buyFeePct / 100)) / 100
      ) * 100;
      if (shares <= 0) continue;
      const buyCost = shares * entry * (1 + costs.buyFeePct / 100);
      const holdIndex =
        rules.exit === "hold_2d" ? 1 : rules.exit === "hold_3d" ? 2 : -1;
      if (holdIndex >= 0 && feature.forwardCloses[holdIndex] === undefined) {
        continue;
      }
      const rawExit =
        rules.exit === "next_open"
          ? feature.nextOpen
          : rules.exit === "next_close"
            ? feature.nextClose
            : feature.forwardCloses[holdIndex];
      const exitDate =
        rules.exit === "next_open" || rules.exit === "next_close"
          ? feature.nextDate
          : feature.forwardDates[holdIndex];
      const exit = roundToTick(rawExit * (1 - costs.slippagePct / 100));
      const sellProceeds = shares * exit * (1 - costs.sellFeePct / 100);
      const pnl = sellProceeds - buyCost;
      const trade: ResearchTrade & { exitDate: string } = {
        date,
        exitDate,
        symbol: feature.symbol,
        entry,
        exit,
        shares,
        buyCost,
        sellProceeds,
        pnl,
        grossPct: ((rawExit - feature.close) / feature.close) * 100,
        netReturnPct: buyCost > 0 ? (pnl / buyCost) * 100 : 0,
      };
      trades.push(trade);
      pending.push(trade);
      exposureSum += buyCost / equity;
    }
  }

  const remaining = pending.reduce((total, trade) => total + trade.pnl, 0);
  equity += remaining;
  peak = Math.max(peak, equity);
  if (peak > 0) {
    maxDrawdown = Math.max(maxDrawdown, ((peak - equity) / peak) * 100);
  }

  const first = dates[0] ?? "";
  const last = dates[dates.length - 1] ?? "";
  const days =
    first && last
      ? Math.max(1, (Date.parse(last) - Date.parse(first)) / 86_400_000)
      : 1;
  const wins = trades.filter((trade) => trade.pnl > 0);
  const losses = trades.filter((trade) => trade.pnl < 0);
  const profitFactor =
    losses.length > 0
      ? wins.reduce((total, trade) => total + trade.pnl, 0) /
        Math.abs(losses.reduce((total, trade) => total + trade.pnl, 0))
      : wins.length > 0
        ? 999
        : 0;
  const mean = average(dailyReturns);
  const deviation = std(dailyReturns);

  return {
    signal: rules.signal,
    exit: rules.exit,
    maxPositions: rules.maxPositions,
    tradeCount: trades.length,
    totalReturnPct: (equity / initialEquity - 1) * 100,
    cagrPct: (Math.pow(equity / initialEquity, 365 / days) - 1) * 100,
    maxDrawdownPct: maxDrawdown,
    sharpe: deviation > 0 ? (mean / deviation) * Math.sqrt(252) : 0,
    winRatePct: trades.length ? (wins.length / trades.length) * 100 : 0,
    avgGrossPct: average(trades.map((trade) => trade.grossPct)),
    avgNetPct: average(trades.map((trade) => trade.netReturnPct)),
    profitFactor,
    exposurePct: dates.length ? (exposureSum / dates.length) * 100 : 0,
    worstTradePct:
      trades.length > 0
        ? Math.min(...trades.map((trade) => trade.netReturnPct))
        : 0,
    trades,
  };
}

export function researchMatrix(
  features: ResearchFeature[],
  dates: string[],
  regime: Map<string, boolean>,
  options: {
    costs?: BsjpCosts;
    initialEquity?: number;
    allocationPct?: number;
    signals?: ResearchSignal[];
    exits?: ResearchExit[];
  } = {}
): ResearchReport[] {
  const reports: ResearchReport[] = [];
  const signals = options.signals ?? [
    "momentum",
    "reversal",
    "breakout",
    "random",
  ];
  const exits = options.exits ?? ["next_open", "next_close"];
  for (const signal of signals) {
    for (const exit of exits) {
      for (const maxPositions of [1, 2]) {
        reports.push(
          runResearch(features, dates, regime, { signal, exit, maxPositions }, options)
        );
      }
    }
  }
  return reports;
}
