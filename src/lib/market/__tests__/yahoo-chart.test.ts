import { describe, expect, it, vi } from "vitest";
import { YahooClient, toYahooSymbol } from "../yahoo";

const chartBody = {
  chart: {
    result: [{
      meta: { symbol: "BBCA.JK", currency: "IDR" },
      timestamp: [1700000000, 1700086400, 1700172800],
      indicators: { quote: [{
        open: [100, 50, 51], high: [102, 52, 53], low: [99, 49, 50],
        close: [101, 51, 52], volume: [1000, 2000, 3000],
      }] },
      events: { splits: { "1700086400": { numerator: 2, denominator: 1, splitRatio: "2:1" } } },
    }],
  },
};

describe("YahooClient.getDailyTransactions", () => {
  it("maps and split-adjusts OHLCV", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(chartBody), { status: 200 }));
    const client = new YahooClient({ fetchImpl: fetchMock });
    const rows = await client.getDailyTransactions("BBCA", "2026-08-20");
    expect(rows).toHaveLength(3);
    expect(rows[0].close).toBeCloseTo(50.5);
    expect(rows[0].volume).toBe(2000);
    expect(rows[1].close).toBe(51);
    expect(rows[2].close).toBe(52);
    expect(fetchMock.mock.calls[0][0]).toContain("BBCA.JK");
    expect(fetchMock.mock.calls[0][0]).toContain("events=split");
  });

  it("maps hourly rows with full ISO timestamps", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(chartBody), { status: 200 })
    );
    const client = new YahooClient({ fetchImpl: fetchMock });
    const rows = await client.getHourlyTransactions("BBCA");
    expect(rows[0].date).toContain("T");
    expect(fetchMock.mock.calls[0][0]).toContain("interval=1h");
    expect(fetchMock.mock.calls[0][0]).toContain("range=6mo");
  });

  it("throws MarketDataError when Yahoo returns no result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ chart: { result: null, error: { code: "Not Found" } } }), { status: 200 }));
    const client = new YahooClient({ fetchImpl: fetchMock });
    await expect(client.getDailyTransactions("ZZZZ")).rejects.toMatchObject({ kind: "not_found" });
  });
});

describe("toYahooSymbol", () => {
  it("adds .JK exactly once", () => {
    expect(toYahooSymbol("BBCA")).toBe("BBCA.JK");
    expect(toYahooSymbol("BBCA.JK")).toBe("BBCA.JK");
    expect(toYahooSymbol("^JKSE")).toBe("^JKSE");
  });
});
