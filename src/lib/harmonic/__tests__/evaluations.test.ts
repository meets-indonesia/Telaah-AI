import { describe, expect, it } from "vitest";
import {
  aggregateCalibration,
  evaluateCandidateOutcome,
  type HarmonicCandidateLog,
  type HarmonicEvaluation,
} from "../evaluations";
import type { DailyTransaction } from "@/lib/sectors/types";

const candidate: HarmonicCandidateLog = {
  id: "c1",
  scanDate: "2026-01-01",
  scannedAt: "2026-01-01T00:00:00.000Z",
  symbol: "TEST",
  pattern: "Gartley",
  timeframe: "1D",
  direction: "bullish",
  status: "completed",
  score: 90,
  price: 100,
  prz: { low: 98, high: 102 },
  invalidation: 95,
  targets: { t1: 110, t2: 120 },
  dDate: "2026-01-01",
  distancePct: 0,
};

function candle(
  date: string,
  high: number,
  low: number,
  close = low
): DailyTransaction {
  return {
    symbol: "TEST",
    date,
    open: close,
    high,
    low,
    close,
    volume: 1000,
  };
}

describe("harmonic live evaluation", () => {
  it("records T1 and T2 for a bullish candidate", () => {
    const outcome = evaluateCandidateOutcome(candidate, [
      candle("2026-01-01", 101, 99, 100),
      candle("2026-01-02", 111, 99, 110),
      candle("2026-01-03", 121, 109, 120),
    ]);
    expect(outcome.status).toBe("t2");
    expect(outcome.daysToT1).toBe(1);
    expect(outcome.daysToT2).toBe(2);
  });

  it("records invalidation before T1", () => {
    const outcome = evaluateCandidateOutcome(candidate, [
      candle("2026-01-01", 101, 99, 100),
      candle("2026-01-02", 100, 94, 95),
    ]);
    expect(outcome.status).toBe("invalidated");
    expect(outcome.daysToT1).toBeNull();
  });

  it("mirrors the outcome for a bearish candidate", () => {
    const bearish: HarmonicCandidateLog = {
      ...candidate,
      id: "c2",
      direction: "bearish",
      invalidation: 105,
      targets: { t1: 90, t2: 80 },
    };
    const outcome = evaluateCandidateOutcome(bearish, [
      candle("2026-01-01", 101, 99, 100),
      candle("2026-01-02", 101, 89, 90),
      candle("2026-01-03", 91, 79, 80),
    ]);
    expect(outcome.status).toBe("t2");
    expect(outcome.daysToT1).toBe(1);
    expect(outcome.daysToT2).toBe(2);
  });

  it("aggregates live outcomes and suggests a reviewed weight delta", () => {
    const logs = Array.from({ length: 4 }, (_, index) => ({
      ...candidate,
      id: `c${index}`,
    }));
    const outcomes: HarmonicEvaluation[] = [
      { id: "c0", status: "t2", daysToT1: 1, daysToT2: 2, entryDate: "2026-01-01", entryPrice: 100, evaluatedAt: "2026-01-05T00:00:00.000Z" },
      { id: "c1", status: "t1", daysToT1: 1, daysToT2: null, entryDate: "2026-01-01", entryPrice: 100, evaluatedAt: "2026-01-05T00:00:00.000Z" },
      { id: "c2", status: "t1", daysToT1: 2, daysToT2: null, entryDate: "2026-01-01", entryPrice: 100, evaluatedAt: "2026-01-05T00:00:00.000Z" },
      { id: "c3", status: "invalidated", daysToT1: null, daysToT2: null, entryDate: "2026-01-01", entryPrice: 100, evaluatedAt: "2026-01-05T00:00:00.000Z" },
    ];
    const result = aggregateCalibration(logs, outcomes);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].t1RatePct).toBe(75);
    expect(result.groups[0].confidence).toBe("low");
    expect(result.groups[0].suggestedWeightDelta).toBe(0);
  });
});
