import { describe, expect, it, vi } from "vitest";
import { executeEvidencePlan } from "../coordinator";

vi.mock("@/lib/quant/indicators", () => ({
  computeTechnicalIndicators: () => ({
    trendAssessment: "Neutral",
    lastPrice: 100,
    lastDate: "2026-11-20",
    dailyReturnPct: 0.5,
    rsi14: 50,
    sma20: 99,
    sma50: 98,
    macd: { macd: 1, signal: 1, histogram: 0 },
    volume: { todayVolume: 100, avg20Volume: 100, relativeVolume: 1 },
    chartSeries: [],
  }),
}));
vi.mock("@/lib/quant/financials", () => ({
  analyzeFinancialHealth: () => ({
    status: "unavailable",
    latest: null,
    latestPeriodDate: null,
    periods: [],
    qoqGrowth: { revenuePct: null, netIncomePct: null },
    yoyGrowth: { revenuePct: null, netIncomePct: null },
    solvencyHealth: { debtToEquityRatio: null, hasNetCash: null, description: "" },
    currency: "IDR",
    unit: "Rupiah",
  }),
}));
vi.mock("@/lib/quant/flow", () => ({
  analyzeFlowLens: () => ({
    status: "unavailable",
    foreignFlow: { cumulative5d: 0, cumulative14d: 0, recentTrend: "Netral", series: [] },
    topBuyers: [],
    topSellers: [],
    cohortSummary: {},
    startDate: "",
    endDate: "",
    totalTradingDays: 0,
    totalTurnover: 0,
    limitationDisclaimer: "",
  }),
}));
vi.mock("@/lib/quant/insider", () => ({
  analyzeInsiderCluster: (
    _filings: unknown,
    _management: unknown,
    _ownership: unknown,
    _symbol: string,
    _price: number,
    filingsAvailable: boolean
  ) => ({
    status: filingsAvailable ? "partial" : "unavailable",
    signal: "Netral",
    score: 0,
    summary: "",
    totalBuyShares: 0,
    totalSellShares: 0,
    netShares: 0,
    totalBuyValue: 0,
    totalSellValue: 0,
    netValue: 0,
    uniqueInsiders: 0,
    clusterBuyDetected: false,
    clusterSellDetected: false,
    insiderActors: [],
    transactions: [],
  }),
}));
vi.mock("@/lib/quant/commodity", () => ({
  analyzeCommodityLens: () => ({ isCommodityIssuer: false }),
}));
vi.mock("@/lib/quant/integrity", () => ({
  calculateIntegrityScore: () => ({
    score: 100,
    verdict: "Fakta Solid",
    headline: "",
    retailSummary: "",
    checks: [],
    riskCount: { danger: 0, warning: 0, pass: 0 },
  }),
}));
vi.mock("@/lib/quant/tradingPlan", () => ({
  calculateTradingPlan: () => ({
    horizons: {
      scalping: { label: "Scalping", rrr: 1 },
      swing: { label: "Swing", rrr: 2 },
      trend: { label: "Trend", rrr: 2.5 },
      investing: { label: "Investasi", rrr: 3 },
    },
    bestFitHorizon: "swing",
    supports: { s1: 90, s2: 80 },
    resistances: { r1: 110, r2: 120 },
  }),
}));

function makeProvider() {
  return {
    id: "open-market",
    capabilities: new Set([
      "companyProfile",
      "valuation",
      "quarterlyFinancials",
      "dailyOHLCV",
      "news",
      "corporateActions",
    ]),
    getCompanyReport: vi.fn().mockResolvedValue({
      symbol: "BBCA",
      company_name: "BBCA",
      overview: { company_name: "BBCA" },
    }),
    getDailyTransactions: vi.fn().mockResolvedValue([
      { date: "2026-11-20", open: 1, high: 2, low: 1, close: 2, volume: 100, symbol: "BBCA" },
    ]),
    getQuarterlyFinancials: vi.fn().mockResolvedValue([]),
    getCorporateActions: vi.fn().mockResolvedValue({
      symbol: "BBCA",
      corporate_actions: [],
    }),
    getNews: vi.fn().mockResolvedValue({ results: [] }),
    getBrokerSummary: vi.fn(),
    getForeignFlow: vi.fn(),
    getFilings: vi.fn(),
    getSuspensions: vi.fn(),
    getCompanySegments: vi.fn(),
    getBrokersRegistry: vi.fn().mockResolvedValue([]),
    getCreditsUsed: vi.fn().mockReturnValue(0),
    getCallLog: vi.fn().mockReturnValue([]),
  } as any;
}

describe("executeEvidencePlan", () => {
  it("skips unsupported modules and records limitations", async () => {
    const provider = makeProvider();
    const result = await executeEvidencePlan(
      provider,
      "BBCA",
      "quick",
      "company_overview",
      []
    );

    expect(provider.getBrokerSummary).not.toHaveBeenCalled();
    expect(provider.getForeignFlow).not.toHaveBeenCalled();
    expect(provider.getFilings).not.toHaveBeenCalled();
    expect(result.flowLens.status).toBe("unavailable");
    expect(result.insiderRadar.status).toBe("unavailable");
    expect(result.dataLimitations.join(" ")).toContain("Broker");
    expect(result.providerError ?? "").not.toContain("segmen");
    expect(result.creditsConsumed).toBe(0);
  });

  it("throws when core Yahoo data is missing", async () => {
    const provider = makeProvider();
    provider.getCompanyReport.mockResolvedValue(null);
    provider.getDailyTransactions.mockResolvedValue(null);

    await expect(
      executeEvidencePlan(provider, "BBCA", "quick", "company_overview", [])
    ).rejects.toThrow();
  });
});
