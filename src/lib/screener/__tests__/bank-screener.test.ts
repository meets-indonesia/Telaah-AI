import { describe, expect, it } from "vitest";
import { scoreBank } from "../bank-screener";
import type { MarketMetricItem } from "../market-metrics";

function item(overrides: Partial<MarketMetricItem> = {}): MarketMetricItem {
  return {
    symbol: "BMRI",
    name: "Bank Mandiri",
    sector: "Keuangan",
    subSector: "Bank",
    marketCap: 300e12,
    lastPrice: 3880,
    dailyChangePct: 0,
    pe: 6,
    pb: 1.23,
    rsi: 53,
    trend: "Neutral",
    flow5d: -395e9,
    ...overrides,
  };
}

describe("scoreBank", () => {
  it("scores a cheap, liquid bank with neutral momentum highest", () => {
    expect(scoreBank(item())).toBe(91);
  });

  it("penalizes expensive valuation and weak momentum", () => {
    const expensive = scoreBank(
      item({ pe: 40, pb: 6, rsi: 80, trend: "Bearish", flow5d: -1e12 })
    );
    expect(expensive).toBeLessThan(scoreBank(item()));
  });
});
