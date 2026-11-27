import { describe, expect, it } from "vitest";
import { calculateTradingPlan } from "../tradingPlan";

describe("calculateTradingPlan", () => {
  it("does not invent a 25% intrinsic value", () => {
    const technical = {
      lastPrice: 1000,
      dailyReturnPct: 0,
      rsi14: 50,
      sma20: 1000,
      sma50: 950,
      trendAssessment: "Neutral",
      chartSeries: [
        { date: "2026-11-20", open: 990, high: 1100, low: 900, close: 1000, volume: 1000 },
      ],
      volume: { relativeVolume: 1, todayVolume: 1000, avg20Volume: 1000 },
    } as any;

    const result = calculateTradingPlan({
      symbol: "BBCA",
      technical,
      valuation: {} as any,
    });

    expect(result.horizons.investing.target1).not.toBe(1250);
    expect(result.horizons.investing.catalystFocus.toLowerCase()).toContain("teknikal");
  });
});
