import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { HarmonicMatch, HarmonicTimeframe } from "@/lib/quant/harmonic";
import type { DailyTransaction } from "@/lib/sectors/types";
import {
  readHarmonicCache,
  scanHarmonicUniverse,
  writeHarmonicCache,
  type HarmonicDataSource,
  type HarmonicScanResult,
} from "../harmonic-screener";

function makeRows(days: number, startPrice = 1000): DailyTransaction[] {
  const rows: DailyTransaction[] = [];
  const start = Date.UTC(2024, 0, 1);
  for (let index = 0; index < days; index += 1) {
    const price = startPrice + index * 3;
    rows.push({
      symbol: "TEST",
      date: new Date(start + index * 86_400_000).toISOString().slice(0, 10),
      open: price,
      high: price + 10,
      low: price - 10,
      close: price + 4,
      volume: 1_000 + index,
    });
  }
  return rows;
}

function makeHourlyRows(bars: number): DailyTransaction[] {
  return makeRows(bars).map((row, index) => ({
    ...row,
    date: new Date(Date.UTC(2026, 0, 1, 3 + index)).toISOString(),
  }));
}

function match(
  symbol: string,
  timeframe: HarmonicTimeframe,
  score: number,
  distancePct = 1
): HarmonicMatch {
  return {
    symbol,
    timeframe,
    pattern: "Gartley",
    direction: "bullish",
    status: "completed",
    pivotDates: { x: "2026-01-01", a: "2026-01-02", b: "2026-01-03", c: "2026-01-04", d: "2026-01-05" },
    ratios: { abXa: 0.618, bcAb: 0.5, cdBc: 1.27, adXa: 0.786 },
    prz: { low: 990, high: 1000 },
    price: 1010,
    distancePct,
    invalidation: 985,
    targets: { t1: 1100, t2: 1200 },
    riskReward: 2,
    rsi: 35,
    fitScore: 36,
    score,
    generatedAt: "2026-01-05T00:00:00.000Z",
  };
}

const source: HarmonicDataSource = {
  getHourlyTransactions: async () => makeHourlyRows(120),
  getDailyTransactions: async () => makeRows(800),
};

const failingSource: HarmonicDataSource = {
  getHourlyTransactions: async () => {
    throw new Error("hourly down");
  },
  getDailyTransactions: async () => {
    throw new Error("daily down");
  },
};

const fakeDetect = (
  _candles: unknown,
  options: { symbol: string; timeframe: HarmonicTimeframe }
): HarmonicMatch[] => {
  if (options.symbol === "AAAA" && options.timeframe === "1D") {
    return [match("AAAA", "1D", 80)];
  }
  if (options.symbol === "AAAA" && options.timeframe === "1W") {
    return [match("AAAA", "1W", 70, 2)];
  }
  if (options.symbol === "BBBB" && options.timeframe === "1D") {
    return [match("BBBB", "1D", 90, 0.5)];
  }
  if (options.symbol.startsWith("TOP")) {
    const score = Number(options.symbol.slice(3)) || 10;
    return [match(options.symbol, "1D", score)];
  }
  return [];
};

const cachePaths: string[] = [];

function tempCachePath(): string {
  const file = path.join(
    os.tmpdir(),
    `telaah-harmonic-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
  );
  cachePaths.push(file);
  return file;
}

afterEach(() => {
  for (const file of cachePaths.splice(0)) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
});

describe("scanHarmonicUniverse", () => {
  it("ranks candidates, counts failures, and tracks confluence", async () => {
    const result = await scanHarmonicUniverse({
      symbols: ["AAAA", "BBBB", "CCCC"],
      refresh: true,
      cachePath: tempCachePath(),
      source: {
        getHourlyTransactions: async (symbol) => {
          if (symbol === "CCCC") throw new Error("down");
          return makeHourlyRows(120);
        },
        getDailyTransactions: async (symbol) => {
          if (symbol === "CCCC") throw new Error("down");
          return makeRows(800);
        },
      },
      detect: fakeDetect,
      now: () => new Date("2026-01-05T01:00:00.000Z"),
    });

    expect(result.scanned).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.universeSize).toBe(3);
    expect(result.results).toHaveLength(2);
    expect(result.results[0].symbol).toBe("BBBB");
    expect(result.results[1].symbol).toBe("AAAA");
    expect(result.results[1].confluenceCount).toBe(2);
    expect(result.limitations.join(" ")).toContain("gagal");
  });

  it("keeps all candidates instead of a top-five cap", async () => {
    const result = await scanHarmonicUniverse({
      symbols: ["TOP10", "TOP20", "TOP30", "TOP40", "TOP50", "TOP60", "TOP70"],
      refresh: true,
      cachePath: tempCachePath(),
      source,
      detect: fakeDetect,
      now: () => new Date("2026-01-05T01:00:00.000Z"),
    });
    expect(result.results).toHaveLength(7);
    expect(result.results.map((candidate) => candidate.symbol)).toEqual([
      "TOP70",
      "TOP60",
      "TOP50",
      "TOP40",
      "TOP30",
      "TOP20",
      "TOP10",
    ]);
    expect(result.results[0].matches[0].timeframe).toBe("1D");
  });
});

describe("harmonic cache", () => {
  it("round-trips and respects the max age", () => {
    const file = tempCachePath();
    const result: HarmonicScanResult = {
      version: 2,
      generatedAt: "2026-01-05T00:00:00.000Z",
      date: "2026-01-05",
      universeSize: 1,
      scanned: 1,
      failed: 0,
      results: [],
      limitations: [],
    };
    writeHarmonicCache(result, file);
    expect(readHarmonicCache(12, file, new Date("2026-01-05T06:00:00.000Z"))).toEqual(result);
    expect(readHarmonicCache(1, file, new Date("2026-01-05T06:00:00.000Z"))).toBeNull();
  });
});
