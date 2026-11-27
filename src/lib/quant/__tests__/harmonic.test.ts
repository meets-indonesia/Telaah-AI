import { describe, expect, it } from "vitest";
import {
  detectHarmonicPatterns,
  evaluateHarmonicPoints,
  findPivots,
  type HarmonicCandle,
} from "../harmonic";

function candle(date: string, price: number): HarmonicCandle {
  return {
    date,
    open: price,
    high: price * 1.01,
    low: price * 0.99,
    close: price,
    volume: 1_000_000,
  };
}

function series(prices: number[]): HarmonicCandle[] {
  return prices.map((price, index) =>
    candle(
      new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10),
      price
    )
  );
}

describe("evaluateHarmonicPoints", () => {
  it("recognises a bullish Gartley", () => {
    const result = evaluateHarmonicPoints(
      { x: 100, a: 200, b: 138.2, c: 183.2, d: 121.4 },
      "bullish"
    );
    expect(result?.pattern).toBe("Gartley");
    expect(result?.prz.low).toBeLessThanOrEqual(121.4);
    expect(result?.prz.high).toBeGreaterThanOrEqual(121.4);
    expect(result?.fitScore).toBeGreaterThan(30);
  });

  it("recognises a bullish Bat", () => {
    const result = evaluateHarmonicPoints(
      { x: 100, a: 200, b: 155, c: 194, d: 111.4 },
      "bullish"
    );
    expect(result?.pattern).toBe("Bat");
    expect(result?.ratios.adXa).toBeCloseTo(0.886, 2);
  });

  it("recognises a bullish Butterfly", () => {
    const result = evaluateHarmonicPoints(
      { x: 100, a: 200, b: 121.4, c: 160.7, d: 73 },
      "bullish"
    );
    expect(result?.pattern).toBe("Butterfly");
    expect(result?.ratios.adXa).toBeGreaterThan(1.2);
  });

  it("recognises a bullish Crab", () => {
    const result = evaluateHarmonicPoints(
      { x: 100, a: 200, b: 150, c: 194.3, d: 38.2 },
      "bullish"
    );
    expect(result?.pattern).toBe("Crab");
    expect(result?.ratios.adXa).toBeGreaterThan(1.5);
  });

  it("mirrors a bearish pattern", () => {
    const result = evaluateHarmonicPoints(
      { x: 200, a: 100, b: 161.8, c: 116.8, d: 178.6 },
      "bearish"
    );
    expect(result?.pattern).toBe("Gartley");
    expect(result?.prz.high).toBeGreaterThan(170);
  });

  it("rejects a window whose AB retracement is wrong", () => {
    const result = evaluateHarmonicPoints(
      { x: 100, a: 200, b: 170, c: 190, d: 121.4 },
      "bullish"
    );
    expect(result).toBeNull();
  });

  it("recognises Shark and Cypher geometry", () => {
    const shark = evaluateHarmonicPoints(
      { x: 100, a: 200, b: 150, c: 215, d: 95 },
      "bullish"
    );
    expect(shark?.pattern).toBe("Shark");

    const cypher = evaluateHarmonicPoints(
      { x: 100, a: 200, b: 150, c: 215, d: 121.4 },
      "bullish"
    );
    expect(cypher?.pattern).toBe("Cypher");
  });

  it("rejects a window whose D is outside the PRZ", () => {
    const result = evaluateHarmonicPoints(
      { x: 100, a: 200, b: 138.2, c: 183.2, d: 160 },
      "bullish"
    );
    expect(result).toBeNull();
  });
});

describe("findPivots", () => {
  it("returns alternating confirmed highs and lows", () => {
    const pivots = findPivots(series([100, 120, 105, 130, 110, 140]), 5);
    expect(pivots.map((pivot) => pivot.type)).toEqual(["high", "low", "high", "low"]);
    expect(pivots[0].price).toBeCloseTo(121.2, 1);
    expect(pivots[1].price).toBeCloseTo(103.95, 1);
  });
});

describe("detectHarmonicPatterns", () => {
  const gartleyPath = [150, 100, 200, 138.2, 183.2, 121.4, 126.5];

  it("finds a completed Gartley near the buy zone", () => {
    const matches = detectHarmonicPatterns(series(gartleyPath), {
      symbol: "TEST",
      timeframe: "4H",
      rsi: 32,
    });
    const gartley = matches.find(
      (match) => match.pattern === "Gartley" && match.status === "completed"
    );
    expect(gartley).toBeDefined();
    expect(gartley?.distancePct).toBe(0);
    expect(gartley?.invalidation).toBeLessThan(gartley?.prz.low ?? 0);
    expect(gartley?.score).toBeGreaterThan(60);
    expect(gartley?.pivotPrices?.x).toBeGreaterThan(0);
    expect(gartley?.pivotPrices?.d).toBeGreaterThan(0);
    expect(gartley?.pivotPrices?.d).toBeLessThan(gartley?.pivotPrices?.c ?? 0);
  });

  it("drops a setup that has already broken its invalidation", () => {
    const matches = detectHarmonicPatterns(series([...gartleyPath, 110]), {
      symbol: "TEST",
      timeframe: "4H",
      rsi: 28,
    });
    expect(matches.filter((match) => match.direction === "bullish")).toHaveLength(0);
  });
});
