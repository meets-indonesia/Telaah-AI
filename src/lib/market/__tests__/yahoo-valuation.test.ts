import { describe, expect, it, vi } from "vitest";
import { YahooClient } from "../yahoo";

const quoteSummary = {
  quoteSummary: { result: [{
    price: { longName: "PT Alamtri Resources Indonesia Tbk", regularMarketPrice: 2330, regularMarketChangePercent: 0.43, currency: "IDR" },
    summaryDetail: { marketCap: 67_105_152_040_960, trailingPE: 5.8781977, forwardPE: 4.512356, priceToSalesTrailing12Months: 27651.088 },
    defaultKeyStatistics: { sharesOutstanding: 28_800_494_200, trailingEps: 396.38, priceToBook: 13314.286 },
    financialData: { currentPrice: 2330, financialCurrency: "USD", revenueGrowth: 0.84, earningsGrowth: 0.643 },
    assetProfile: { sector: "Energy", industry: "Thermal Coal", longBusinessSummary: "Coal miner", website: "https://example.com" },
  }] },
};

describe("YahooClient.getCompanySnapshot", () => {
  it("computes PB/PS from IDR financials for a USD reporter", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 200, headers: { "set-cookie": "A=1; Path=/" } }))
      .mockResolvedValueOnce(new Response("crumb-1", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(quoteSummary), { status: 200 }));
    const client = new YahooClient({
      fetchImpl: fetchMock,
      getUsdIdrRate: async () => 16000,
      getQuarterlyFinancials: async () => [{
        symbol: "ADRO", date: "2026-09-30", revenue: 15_000_000_000_000,
        total_equity: 80_500_000_000_000, earnings: 3_300_000_000_000,
      }] as any,
    });
    const snap = await client.getCompanySnapshot("ADRO");
    expect(snap?.valuation?.current_pe).toBeCloseTo(5.8781977);
    expect(snap?.valuation?.current_pb).toBeCloseTo(0.833);
    expect(snap?.valuation?.current_pb).not.toBe(13314.286);
    expect(snap?.valuation?.multipleBasis).toBe("computed");
    expect(snap?.overview?.sector).toBe("Energy");
  });

  it("computes PS from the last four non-null revenue quarters", async () => {
    const summaryBody = { quoteSummary: { result: [{
      price: { longName: "PT Alamtri Resources Indonesia Tbk", regularMarketPrice: 2330 },
      summaryDetail: { marketCap: 4_000_000_000_000, trailingPE: 5.9 },
      financialData: { financialCurrency: "USD" },
    }] } };
    const quarters = [
      "2025-09-30", "2025-12-31", "2026-03-31", "2026-06-30", "2026-09-30",
    ].map((date, index) => ({
      symbol: "ADRO",
      date,
      revenue: index === 4 ? undefined : 1_000_000_000_000,
      total_equity: 80_500_000_000_000,
      earnings: 3_300_000_000_000,
    }));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 200, headers: { "set-cookie": "A=1; Path=/" } }))
      .mockResolvedValueOnce(new Response("crumb-1", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(summaryBody), { status: 200 }));
    const client = new YahooClient({
      fetchImpl: fetchMock,
      getUsdIdrRate: async () => 16000,
      getQuarterlyFinancials: async () => quarters as any,
    });
    const snap = await client.getCompanySnapshot("ADRO", ["valuation"]);
    expect(snap?.valuation?.current_ps).toBeCloseTo(1);
  });

  it("maps peers and nulls peer PB when the peer reports in USD", async () => {
    const recommendations = { finance: { result: [{ symbol: "ADRO.JK", recommendedSymbols: [{ symbol: "BBRI.JK", score: 0.4 }] }] } };
    const peerSummary = { quoteSummary: { result: [{
      price: { longName: "PT Bank Rakyat Indonesia", regularMarketPrice: 5200 },
      summaryDetail: { marketCap: 78_000_000_000_000, trailingPE: 11.8 },
      defaultKeyStatistics: { priceToBook: 2.1 },
      financialData: { financialCurrency: "USD" },
    }] } };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 200, headers: { "set-cookie": "A=1; Path=/" } }))
      .mockResolvedValueOnce(new Response("crumb-1", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(quoteSummary), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(recommendations), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(peerSummary), { status: 200 }));
    const client = new YahooClient({ fetchImpl: fetchMock, getUsdIdrRate: async () => 16000, getQuarterlyFinancials: async () => [] });
    const snap = await client.getCompanySnapshot("ADRO", ["overview", "valuation", "peers"]);
    expect(snap?.peers?.[0]?.peers_data?.companies?.[0]?.symbol).toBe("BBRI");
    expect(snap?.peers?.[0]?.peers_data?.companies?.[0]?.pb).toBeNull();
  });

  it("falls back to chart + financials when quoteSummary is rate-limited", async () => {
    const chartMeta = {
      chart: {
        result: [
          {
            meta: {
              longName: "PT Bank Central Asia Tbk",
              regularMarketPrice: 5675,
              regularMarketChangePercent: 1.2,
            },
          },
        ],
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("", { status: 404, headers: { "set-cookie": "A=1; Path=/" } })
      )
      .mockResolvedValueOnce(new Response("crumb-1", { status: 200 }))
      .mockResolvedValueOnce(new Response("Too Many Requests", { status: 429 }))
      .mockResolvedValueOnce(
        new Response("", { status: 404, headers: { "set-cookie": "A=1; Path=/" } })
      )
      .mockResolvedValueOnce(new Response("crumb-2", { status: 200 }))
      .mockResolvedValueOnce(new Response("Too Many Requests", { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(chartMeta), { status: 200 }));
    const rows = Array.from({ length: 4 }, (_, index) => ({
      symbol: "BBCA",
      date: `2026-${String(3 + index).padStart(2, "0")}-30`,
      revenue: 10_000_000_000,
      earnings: 4_000_000_000,
      total_equity: 100_000_000_000,
      sourceCurrency: "IDR",
      financials_sector_metrics: { ordinary_shares: 1_000_000 },
    }));
    const client = new YahooClient({
      fetchImpl: fetchMock,
      getUsdIdrRate: async () => 16000,
      getQuarterlyFinancials: async () => rows as any,
    });

    const snapshot = await client.getCompanySnapshot("BBCA");
    expect(snapshot?.company_name).toBe("PT Bank Central Asia Tbk");
    expect(snapshot?.valuation?.current_pe).toBeCloseTo(0.3547);
    expect(snapshot?.valuation?.multipleBasis).toBe("computed");
  });

  it("maps dividends and splits from chart events", async () => {
    const eventsBody = { chart: { result: [{ meta: { symbol: "BBCA.JK" }, timestamp: [1700000000], indicators: { quote: [{ open: [1], high: [1], low: [1], close: [1], volume: [1] }] }, events: { dividends: { "1700000000": { amount: 25 } }, splits: { "1700086400": { numerator: 2, denominator: 1, splitRatio: "2:1" } } } }] } };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(eventsBody), { status: 200 }));
    const client = new YahooClient({ fetchImpl: fetchMock });
    const actions = await client.getCorporateActions("BBCA");
    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ action_type: "Dividen Tunai", amount: 25 }),
      expect.objectContaining({ action_type: "Stock Split", ratio: "1:2" }),
    ]));
  });
});
