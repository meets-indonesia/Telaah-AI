import { describe, expect, it } from "vitest";
import {
  aggregateOutcomes,
  measurePatternOutcome,
  type HistoricalPattern,
  type PatternOutcome,
} from "../outcomes";
import type { HarmonicCandle } from "@/lib/quant/harmonic";

function candle(index: number, high: number, low: number, close = low): HarmonicCandle {
  return {
    date: new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10),
    open: close,
    high,
    low,
    close,
    volume: 1000,
  };
}

const pattern: HistoricalPattern = {
  symbol: "TEST",
  timeframe: "1D",
  pattern: "Gartley",
  direction: "bullish",
  dIndex: 4,
  dDate: "2026-01-05",
  entry: 100,
  prz: { low: 98, high: 102 },
  invalidation: 95,
  targets: { t1: 110, t2: 120 },
};

function baseCandles(): HarmonicCandle[] {
  return [
    candle(0, 120, 110),
    candle(1, 115, 100),
    candle(2, 118, 105),
    candle(3, 116, 100),
    candle(4, 101, 99),
    candle(5, 111, 99),
    candle(6, 121, 105),
  ];
}

describe("harmonic outcomes", () => {
  it("records T1 and T2 hits", () => {
    const outcome = measurePatternOutcome(pattern, baseCandles());
    expect(outcome.status).toBe("t2");
    expect(outcome.daysToT1).toBe(1);
    expect(outcome.daysToT2).toBe(2);
  });

  it("records invalidation before any target", () => {
    const candles = baseCandles();
    candles[5] = candle(5, 100, 94);
    const outcome = measurePatternOutcome(pattern, candles);
    expect(outcome.status).toBe("invalidated");
    expect(outcome.daysToT1).toBeNull();
  });

  it("keeps timeframes separate and computes walk-forward stats", () => {
    const t1: PatternOutcome = { status: "t1", daysToT1: 2, daysToT2: null };
    const invalid: PatternOutcome = {
      status: "invalidated",
      daysToT1: null,
      daysToT2: null,
    };
    const daily = { ...pattern, timeframe: "1D" as const };
    const weekly = { ...pattern, timeframe: "1W" as const };
    const samples = [
      ...Array.from({ length: 3 }, () => ({
        pattern: daily,
        outcome: t1,
        segment: "first" as const,
      })),
      ...Array.from({ length: 2 }, () => ({
        pattern: daily,
        outcome: invalid,
        segment: "first" as const,
      })),
      ...Array.from({ length: 5 }, () => ({
        pattern: daily,
        outcome: t1,
        segment: "second" as const,
      })),
      { pattern: weekly, outcome: t1, segment: "first" as const },
    ];
    const stats = aggregateOutcomes(samples, { feePct: 0.4 });
    const day = stats.find((row) => row.timeframe === "1D");
    const week = stats.find((row) => row.timeframe === "1W");
    expect(stats).toHaveLength(2);
    expect(day?.total).toBe(10);
    expect(day?.firstHalf.t1RatePct).toBe(60);
    expect(day?.secondHalf.t1RatePct).toBe(100);
    expect(day?.walkForwardVerdict).toBe("improved");
    expect(day?.avgT1MovePct).toBe(10);
    expect(day?.netAvgT1Pct).toBe(9.6);
    expect(week?.total).toBe(1);
  });

  it("aggregates hit rates and average days", () => {
    const t1 = measurePatternOutcome(pattern, [
      ...baseCandles().slice(0, 5),
      candle(5, 111, 99),
    ]);
    const invalid = measurePatternOutcome(pattern, [
      ...baseCandles().slice(0, 5),
      candle(5, 100, 94),
    ]);
    const stats = aggregateOutcomes([
      { pattern, outcome: t1 },
      { pattern, outcome: invalid },
    ]);
    expect(stats).toHaveLength(1);
    expect(stats[0].total).toBe(2);
    expect(stats[0].t1Hits).toBe(1);
    expect(stats[0].invalidated).toBe(1);
    expect(stats[0].t1RatePct).toBe(50);
  });
});
