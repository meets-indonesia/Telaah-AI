import { describe, expect, it } from "vitest";
import { calculateIntegrityScore } from "../integrity";

describe("calculateIntegrityScore", () => {
  it("marks confidence low when broker flow and insider are absent", () => {
    const result = calculateIntegrityScore({
      financials: {
        status: "available",
        latest: { netIncome: 1, cashFlowOperating: 1, debtToEquity: 0.5 },
        latestPeriodDate: "2026-09-30",
        periods: [],
        qoqGrowth: { revenuePct: null, netIncomePct: null },
        yoyGrowth: { revenuePct: null, netIncomePct: null },
        solvencyHealth: { debtToEquityRatio: 0.5, hasNetCash: true, description: "" },
        currency: "IDR",
        unit: "Rupiah",
      } as any,
      flow: { status: "unavailable" } as any,
      insiderRadar: { status: "unavailable" } as any,
      valuation: {} as any,
      currentPrice: 100,
    });

    expect(result.confidence).toBe("low");
    expect(result.dataQuality.brokerFlow).toBe("none");
    expect(result.limitations.length).toBeGreaterThan(0);
  });
});
