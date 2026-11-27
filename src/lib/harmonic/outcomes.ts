import type {
  HarmonicCandle,
  HarmonicDirection,
  HarmonicPattern,
  HarmonicPivot,
  HarmonicTimeframe,
} from "@/lib/quant/harmonic";
import { evaluateHarmonicPoints, findPivots } from "@/lib/quant/harmonic";
import { buildTimeframeCandles } from "@/lib/market/timeframes";
import { YahooClient } from "@/lib/market/yahoo";
import type { DailyTransaction } from "@/lib/sectors/types";
import { LIQUID_IDX_UNIVERSE } from "@/lib/screener/universe";

export interface HistoricalPattern {
  symbol: string;
  timeframe: HarmonicTimeframe;
  pattern: HarmonicPattern;
  direction: HarmonicDirection;
  dIndex: number;
  dDate: string;
  entry: number;
  prz: { low: number; high: number };
  invalidation: number;
  targets: { t1: number; t2: number };
}

export type OutcomeStatus = "t2" | "t1" | "invalidated" | "timeout";

export interface PatternOutcome {
  status: OutcomeStatus;
  daysToT1: number | null;
  daysToT2: number | null;
}

export interface SegmentStat {
  total: number;
  t1Hits: number;
  t1RatePct: number;
}

export type WalkForwardVerdict =
  | "stable"
  | "improved"
  | "decayed"
  | "insufficient";

export interface PatternStat {
  pattern: HarmonicPattern;
  direction: HarmonicDirection;
  timeframe: HarmonicTimeframe;
  total: number;
  t1Hits: number;
  t2Hits: number;
  invalidated: number;
  timeout: number;
  t1RatePct: number;
  t2RatePct: number;
  avgDaysToT1: number | null;
  avgT1MovePct: number | null;
  netAvgT1Pct: number | null;
  firstHalf: SegmentStat;
  secondHalf: SegmentStat;
  walkForwardDeltaPct: number | null;
  walkForwardVerdict: WalkForwardVerdict;
}

export interface HarmonicStatsResult {
  generatedAt: string;
  timeframes: HarmonicTimeframe[];
  symbols: number;
  patterns: number;
  feePct: number;
  walkForwardSplitPct: number;
  stats: PatternStat[];
  limitations: string[];
}

function average(values: number[]): number {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

function dedupe(
  patterns: HistoricalPattern[]
): HistoricalPattern[] {
  const best = new Map<string, HistoricalPattern>();
  for (const pattern of patterns) {
    const key = [
      pattern.pattern,
      pattern.direction,
      pattern.timeframe,
      pattern.dDate,
    ].join("|");
    if (!best.has(key)) best.set(key, pattern);
  }
  return [...best.values()];
}

export function detectHistoricalPatterns(
  symbol: string,
  candles: HarmonicCandle[],
  timeframe: HarmonicTimeframe
): HistoricalPattern[] {
  const config = {
    "4H": 4,
    "1D": 7,
    "1W": 10,
    "1M": 15,
  }[timeframe];
  const patterns: HistoricalPattern[] = [];
  const scales = [...new Set([0.75, 1, 1.3, 1.6].map((factor) => Math.round(config * factor * 10) / 10))];

  for (const scale of scales) {
    const pivots = findPivots(candles, scale);
    for (let end = 4; end < pivots.length; end += 1) {
      const window = pivots.slice(end - 4, end + 1) as HarmonicPivot[];
      if (
        !window.every(
          (pivot, index) =>
            index === 0 || pivot.type !== window[index - 1].type
        )
      ) {
        continue;
      }
      const direction: HarmonicDirection =
        window[0].type === "low" ? "bullish" : "bearish";
      const evaluation = evaluateHarmonicPoints(
        {
          x: window[0].price,
          a: window[1].price,
          b: window[2].price,
          c: window[3].price,
          d: window[4].price,
        },
        direction,
        "completed"
      );
      if (!evaluation) continue;
      const dPrice = window[4].price;
      const invalidation =
        direction === "bullish" ? dPrice * 0.995 : dPrice * 1.005;
      patterns.push({
        symbol,
        timeframe,
        pattern: evaluation.pattern,
        direction,
        dIndex: window[4].index,
        dDate: window[4].date,
        entry: dPrice,
        prz: evaluation.prz,
        invalidation,
        targets: { t1: window[3].price, t2: window[1].price },
      });
    }
  }
  return dedupe(patterns);
}

export function measurePatternOutcome(
  pattern: HistoricalPattern,
  candles: HarmonicCandle[],
  maxBars = 60
): PatternOutcome {
  let t1 = false;
  let t2 = false;
  let invalidated = false;
  let daysToT1: number | null = null;
  let daysToT2: number | null = null;
  const bullish = pattern.direction === "bullish";

  for (
    let index = pattern.dIndex + 1;
    index < Math.min(candles.length, pattern.dIndex + 1 + maxBars);
    index += 1
  ) {
    const candle = candles[index];
    const days = index - pattern.dIndex;
    if (bullish) {
      if (!t1 && candle.low <= pattern.invalidation) {
        invalidated = true;
        break;
      }
      if (!t1 && candle.high >= pattern.targets.t1) {
        t1 = true;
        daysToT1 = days;
      }
      if (candle.high >= pattern.targets.t2) {
        t2 = true;
        daysToT2 = days;
        break;
      }
      if (t1 && candle.low <= pattern.invalidation) break;
    } else {
      if (!t1 && candle.high >= pattern.invalidation) {
        invalidated = true;
        break;
      }
      if (!t1 && candle.low <= pattern.targets.t1) {
        t1 = true;
        daysToT1 = days;
      }
      if (candle.low <= pattern.targets.t2) {
        t2 = true;
        daysToT2 = days;
        break;
      }
      if (t1 && candle.high >= pattern.invalidation) break;
    }
  }

  return {
    status: t2 ? "t2" : t1 ? "t1" : invalidated ? "invalidated" : "timeout",
    daysToT1,
    daysToT2,
  };
}

function emptySegment(): SegmentStat {
  return { total: 0, t1Hits: 0, t1RatePct: 0 };
}

function withRate(segment: SegmentStat): SegmentStat {
  return {
    ...segment,
    t1RatePct: segment.total ? (segment.t1Hits / segment.total) * 100 : 0,
  };
}

export function aggregateOutcomes(
  pairs: Array<{
    pattern: HistoricalPattern;
    outcome: PatternOutcome;
    segment?: "first" | "second";
  }>,
  options: { feePct?: number } = {}
): PatternStat[] {
  const feePct = options.feePct ?? 0;
  const groups = new Map<string, PatternStat>();
  const samplesByGroup = new Map<
    string,
    Array<{ pattern: HistoricalPattern; outcome: PatternOutcome }>
  >();
  const segmentsByGroup = new Map<
    string,
    { first: SegmentStat; second: SegmentStat }
  >();

  for (const { pattern, outcome, segment } of pairs) {
    const key = `${pattern.pattern}|${pattern.direction}|${pattern.timeframe}`;
    const stat =
      groups.get(key) ??
      {
        pattern: pattern.pattern,
        direction: pattern.direction,
        timeframe: pattern.timeframe,
        total: 0,
        t1Hits: 0,
        t2Hits: 0,
        invalidated: 0,
        timeout: 0,
        t1RatePct: 0,
        t2RatePct: 0,
        avgDaysToT1: null,
        avgT1MovePct: null,
        netAvgT1Pct: null,
        firstHalf: emptySegment(),
        secondHalf: emptySegment(),
        walkForwardDeltaPct: null,
        walkForwardVerdict: "insufficient" as const,
      };
    stat.total += 1;
    if (outcome.status === "t1" || outcome.status === "t2") stat.t1Hits += 1;
    if (outcome.status === "t2") stat.t2Hits += 1;
    if (outcome.status === "invalidated") stat.invalidated += 1;
    if (outcome.status === "timeout") stat.timeout += 1;
    groups.set(key, stat);

    const samples = samplesByGroup.get(key) ?? [];
    samples.push({ pattern, outcome });
    samplesByGroup.set(key, samples);

    const segments =
      segmentsByGroup.get(key) ?? { first: emptySegment(), second: emptySegment() };
    if (segment === "first" || segment === "second") {
      const target = segments[segment];
      target.total += 1;
      if (outcome.status === "t1" || outcome.status === "t2") {
        target.t1Hits += 1;
      }
    }
    segmentsByGroup.set(key, segments);
  }

  return [...groups.entries()].map(([key, stat]) => {
    const samples = samplesByGroup.get(key) ?? [];
    const t1Days = samples
      .map(({ outcome }) => outcome.daysToT1)
      .filter((days): days is number => days !== null);
    const moves = samples
      .map(({ pattern }) => {
        if (!pattern.entry || pattern.entry <= 0) return null;
        const move =
          pattern.direction === "bullish"
            ? ((pattern.targets.t1 - pattern.entry) / pattern.entry) * 100
            : ((pattern.entry - pattern.targets.t1) / pattern.entry) * 100;
        return Number.isFinite(move) ? move : null;
      })
      .filter((move): move is number => move !== null);
    const avgT1MovePct = moves.length ? average(moves) : null;
    const segments =
      segmentsByGroup.get(key) ?? { first: emptySegment(), second: emptySegment() };
    const firstHalf = withRate(segments.first);
    const secondHalf = withRate(segments.second);
    const hasWalkForward = firstHalf.total >= 5 && secondHalf.total >= 5;
    const walkForwardDeltaPct = hasWalkForward
      ? secondHalf.t1RatePct - firstHalf.t1RatePct
      : null;
    let walkForwardVerdict: PatternStat["walkForwardVerdict"] = "insufficient";
    if (walkForwardDeltaPct !== null) {
      if (walkForwardDeltaPct > 15) walkForwardVerdict = "improved";
      else if (walkForwardDeltaPct < -15) walkForwardVerdict = "decayed";
      else walkForwardVerdict = "stable";
    }

    return {
      ...stat,
      t1RatePct: stat.total ? (stat.t1Hits / stat.total) * 100 : 0,
      t2RatePct: stat.total ? (stat.t2Hits / stat.total) * 100 : 0,
      avgDaysToT1: t1Days.length ? average(t1Days) : null,
      avgT1MovePct,
      netAvgT1Pct:
        avgT1MovePct === null ? null : Number((avgT1MovePct - feePct).toFixed(2)),
      firstHalf,
      secondHalf,
      walkForwardDeltaPct:
        walkForwardDeltaPct === null
          ? null
          : Number(walkForwardDeltaPct.toFixed(1)),
      walkForwardVerdict,
    };
  });
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        results[index] = await worker(items[index]);
      }
    })
  );
  return results;
}

export async function runHarmonicStats(
  options: {
    timeframes?: HarmonicTimeframe[];
    symbols?: string[];
    years?: number;
    feePct?: number;
  } = {}
): Promise<HarmonicStatsResult> {
  const timeframes = options.timeframes ?? ["4H", "1D", "1W", "1M"];
  const symbols = options.symbols ?? LIQUID_IDX_UNIVERSE;
  const years = options.years ?? 5;
  const feePct = options.feePct ?? 0.4;
  const walkForwardSplitPct = 60;
  const start = new Date(Date.now() - years * 365 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const yahoo = new YahooClient();
  const limitations: string[] = [];
  const pairs: Array<{
    pattern: HistoricalPattern;
    outcome: PatternOutcome;
    segment: "first" | "second";
  }> = [];

  const rows = await mapLimit(symbols, 4, async (symbol) => {
    try {
      const [daily, hourly] = await Promise.all([
        yahoo.getDailyTransactions(symbol, start),
        yahoo.getHourlyTransactions(symbol).catch(() => null),
      ]);
      return { symbol, daily, hourly };
    } catch {
      return {
        symbol,
        daily: null as DailyTransaction[] | null,
        hourly: null as DailyTransaction[] | null,
      };
    }
  });

  for (const row of rows) {
    if (!row.daily || row.daily.length < 60) {
      limitations.push(`${row.symbol}: data harian tidak cukup.`);
      continue;
    }
    for (const timeframe of timeframes) {
      const source = timeframe === "4H" ? row.hourly : row.daily;
      if (!source || source.length < 30) {
        if (timeframe === "4H") {
          limitations.push(`${row.symbol}: data 4H tidak cukup.`);
        }
        continue;
      }
      const candles = buildTimeframeCandles(source, timeframe);
      const patterns = detectHistoricalPatterns(row.symbol, candles, timeframe);
      const splitIndex = Math.floor((candles.length * walkForwardSplitPct) / 100);
      for (const pattern of patterns) {
        pairs.push({
          pattern,
          outcome: measurePatternOutcome(pattern, candles),
          segment: pattern.dIndex < splitIndex ? "first" : "second",
        });
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    timeframes,
    symbols: symbols.length,
    patterns: pairs.length,
    feePct,
    walkForwardSplitPct,
    stats: aggregateOutcomes(pairs, { feePct }).sort(
      (left, right) => right.total - left.total
    ),
    limitations: [
      `Sampel ${symbols.length} emiten likuid, ${years} tahun, timeframe ${timeframes.join("/")}.`,
      "4H memakai data hourly Yahoo yang lebih pendek dari 5 tahun.",
      `Walk-forward: ${walkForwardSplitPct}% data pertama vs sisa data; bukan out-of-sample murni.`,
      `Net T1 memakai fee round-trip ${feePct}% dan belum memasukkan slippage per emiten.`,
      "Pola dihitung ulang pada data historis; bukan rekomendasi.",
      ...limitations,
    ],
  };
}
