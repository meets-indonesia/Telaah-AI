import { describe, expect, it, vi } from "vitest";
import { getCommodityPrices } from "../commodities";

describe("getCommodityPrices", () => {
  it("returns the four Yahoo benchmarks and converts copper lb to ton", async () => {
    const chart = (price: number) => ({ chart: { result: [{ timestamp: [1700000000, 1700086400], indicators: { quote: [{ close: [price, price] }] } }] } });
    const prices: Record<string, number> = {
      "MTF=F": 104.75,
      "GC=F": 3669.5,
      "HG=F": 5.74,
      "TIO=F": 161.91,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
      const decoded = decodeURIComponent(String(input));
      const symbol = Object.keys(prices).find((key) => decoded.includes(key));
      if (!symbol) return new Response("not found", { status: 404 });
      return new Response(JSON.stringify(chart(prices[symbol])), { status: 200 });
    });
    const quotes = await getCommodityPrices(fetchMock);
    expect(quotes).toHaveLength(4);
    expect(quotes.find((q) => q.code === "COAL")?.latestPrice).toBe(104.75);
    expect(quotes.find((q) => q.code === "COPPER")?.latestPrice).toBeCloseTo(5.74 * 2204.62);
    expect(quotes.find((q) => q.code === "COAL")?.unit).toBe("USD / Ton");
    expect(quotes.find((q) => q.code === "NICKEL")).toBeUndefined();
  });
});
