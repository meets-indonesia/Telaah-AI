import { describe, expect, it, vi } from "vitest";
import { OpenMarketProvider } from "../open-market";
import { getMarketProvider } from "../index";

const yahoo = {
  getCompanySnapshot: vi.fn().mockResolvedValue({
    overview: { company_name: "PT Bank Central Asia Tbk" },
    valuation: { current_pe: 12 },
  }),
  getQuarterlyFinancials: vi.fn().mockResolvedValue([]),
  getDailyTransactions: vi.fn().mockResolvedValue([]),
  getCorporateActions: vi.fn().mockResolvedValue([]),
  getCallLog: vi.fn().mockReturnValue([]),
};

describe("OpenMarketProvider", () => {
  it("exposes Yahoo capabilities and returns null for scraper-only modules", async () => {
    const provider = new OpenMarketProvider({ yahoo: yahoo as any });

    expect(provider.capabilities.has("dailyOHLCV")).toBe(true);
    expect(provider.capabilities.has("brokerSummary")).toBe(false);
    expect(await provider.getBrokerSummary("BBCA")).toBeNull();
    expect(await provider.getForeignFlow("BBCA")).toBeNull();
    expect(await provider.getFilings("BBCA")).toBeNull();
    expect((await provider.getInsiderFeed({})).unavailable).toBe(true);
  });

  it("fills the company name from the Yahoo snapshot", async () => {
    const provider = new OpenMarketProvider({ yahoo: yahoo as any });
    const report = await provider.getCompanyReport("BBCA");
    expect(report?.company_name).toBe("PT Bank Central Asia Tbk");
    expect(report?.symbol).toBe("BBCA");
  });

  it("enables IDX scraper capabilities and maps foreign flow and insider filings", async () => {
    const scraper = {
      isConfigured: true,
      getProfile: vi.fn().mockResolvedValue(null),
      getForeignFlow: vi.fn().mockResolvedValue({
        symbol: "BBCA",
        data: [{ date: "2026-11-23", net_foreign_inflow: 1000 }],
      }),
      getFilings: vi.fn().mockResolvedValue([
        {
          title: "Laporan Kepemilikan",
          date: "2026-11-20",
          transaction_type: "buy",
          amount_transaction: 1000,
          source: "idx-announcement-pdf",
        },
      ]),
      getInsiderFeed: vi.fn().mockResolvedValue({
        results: [
          { title: "A", transaction_type: "buy" },
          { title: "B", transaction_type: "sell" },
        ],
        source: "idx",
        limitations: [],
      }),
      getSuspensions: vi.fn().mockResolvedValue([]),
      getBrokerSummary: vi.fn().mockResolvedValue(null),
      getCallLog: vi.fn().mockReturnValue([]),
    };
    const provider = new OpenMarketProvider({ yahoo: yahoo as any, scraper: scraper as any });

    expect(provider.capabilities.has("foreignFlow")).toBe(true);
    expect(provider.capabilities.has("insiderFilings")).toBe(true);
    expect((await provider.getForeignFlow("BBCA"))?.data).toHaveLength(1);
    expect((await provider.getFilings("BBCA"))?.results).toHaveLength(1);
    const feed = await provider.getInsiderFeed({ type: "buy" });
    expect(feed.results).toHaveLength(1);
    expect(feed.source).toBe("idx");
  });
});

describe("getMarketProvider", () => {
  it("defaults to open", () => {
    delete process.env.MARKET_DATA_PROVIDER;
    expect(getMarketProvider().id).toBe("open-market");
  });
});
