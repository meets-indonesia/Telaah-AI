import { describe, expect, it } from "vitest";
import { extractDividendInfo } from "../dividends";

const base = {
  symbol: "BBCA",
  technical: { lastPrice: 1000 },
} as any;

describe("extractDividendInfo", () => {
  it("detects a dividend from corporate actions and computes the yield", () => {
    const result = extractDividendInfo({
      ...base,
      events: {
        actions: [
          {
            date: "2026-11-19",
            action_type: "Dividen Tunai",
            description: "Dividen interim Rp 50 per saham",
            amount: 50,
          },
        ],
      },
    });
    expect(result.hasDividend).toBe(true);
    expect(result.dividendPerShare).toBe(50);
    expect(result.yieldPct).toBeCloseTo(5);
  });

  it("uses the peer dividend yield when events are unavailable", () => {
    const result = extractDividendInfo({
      ...base,
      peerLens: {
        peers: [{ symbol: "BBCA", isTarget: true, dividendYield: 0.028 }],
      },
    });
    expect(result.hasDividend).toBe(true);
    expect(result.yieldPct).toBeCloseTo(2.8);
  });

  it("reports no dividend when both sources are empty", () => {
    const result = extractDividendInfo({
      ...base,
      events: { actions: [] },
      peerLens: { peers: [] },
    });
    expect(result.hasDividend).toBe(false);
    expect(result.yieldPct).toBeNull();
  });
});
