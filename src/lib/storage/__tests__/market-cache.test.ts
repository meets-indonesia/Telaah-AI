import { describe, expect, it, vi } from "vitest";

vi.mock("fs", () => ({
  default: {
    existsSync: () => false,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
}));

vi.mock("@/lib/market/indices", () => ({
  getMarketIndices: async () => [
    { name: "IHSG", code: "COMPOSITE", price: "7,000.00", change: "+0.50%", isPositive: true },
    { name: "LQ45", code: "LQ45", price: "900.00", change: "-0.20%", isPositive: false },
  ],
}));

vi.mock("@/lib/market/commodities", () => ({
  getCommodityPrices: async () => [
    {
      name: "Coal API2",
      code: "COAL",
      unit: "USD / Ton",
      latestPrice: 104.75,
      changePct: 1.2,
      history: [{ date: "2026-11-20", price: 104.75 }],
    },
  ],
}));

vi.mock("@/lib/market/fx", () => ({
  getUsdIdrRate: async () => 16000,
}));

import { getOrFetchDailyMarketData } from "../market-cache";

describe("getOrFetchDailyMarketData", () => {
  it("builds indices and commodities without Sectors", async () => {
    const data = await getOrFetchDailyMarketData(true);
    expect(data.indices.some((item) => item.code === "COMPOSITE")).toBe(true);
    expect(data.indices.some((item) => item.code === "COAL")).toBe(true);
    expect(data.indices.some((item) => item.code === "NICKEL")).toBe(false);
    expect(data.indices.some((item) => item.code === "USDIDR")).toBe(true);
  });
});
