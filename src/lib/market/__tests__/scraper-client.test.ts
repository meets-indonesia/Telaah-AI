import { describe, expect, it, vi } from "vitest";
import { ScraperClient } from "../scraper-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("ScraperClient", () => {
  it("is inert when SCRAPER_URL is missing", async () => {
    const client = new ScraperClient({ baseUrl: "" });
    expect(client.isConfigured).toBe(false);
    expect(await client.getForeignFlow("BBCA")).toBeNull();
  });

  it("maps foreign flow and sends query parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        symbol: "BBCA",
        data: [
          {
            date: "2026-11-23",
            net_foreign_inflow: 1_000_000,
            net_foreign_shares: 200,
            close: 5000,
          },
        ],
      })
    );
    const client = new ScraperClient({
      baseUrl: "http://scraper:8001",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await client.getForeignFlow("BBCA", 5);
    expect(result?.data[0].net_foreign_inflow).toBe(1_000_000);
    expect(fetchMock.mock.calls[0][0]).toContain("/v1/idx/foreign-flow/BBCA");
    expect(fetchMock.mock.calls[0][0]).toContain("length=5");
    expect(client.getCallLog()).toHaveLength(1);
  });

  it("maps insider filings and the market feed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              title: "Laporan Kepemilikan",
              date: "2026-11-20",
              transaction_type: "buy",
              amount_transaction: 1000,
              source: "idx-announcement-pdf",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          results: [],
          source: "idx",
          limitations: [],
        })
      );
    const client = new ScraperClient({
      baseUrl: "http://scraper:8001",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const filings = await client.getFilings("BBCA", 90, 10);
    expect(filings?.[0].transaction_type).toBe("buy");
    const feed = await client.getInsiderFeed({ days: 30, limit: 25 });
    expect(feed?.source).toBe("idx");
  });

  it("maps a full Stockbit broker summary", async () => {
    const client = new ScraperClient({
      baseUrl: "http://scraper:8001",
      fetchImpl: vi.fn().mockResolvedValue(
        jsonResponse({
          symbol: "BBRI",
          start: "2026-11-11",
          end: "2026-11-24",
          source: "stockbit",
          coverage: "full",
          data: [
            {
              date: "2026-11-21",
              summary: [
                {
                  broker_code: "KZ",
                  bfreq: 10,
                  blot: 100,
                  bval: 500_000_000,
                  bavg_per_share: 5000,
                  sfreq: 2,
                  slot: 20,
                  sval: 100_000_000,
                  savg_per_share: 5000,
                  nlot: 80,
                  nval: 400_000_000,
                  navg_per_share: 5000,
                },
              ],
            },
          ],
        })
      ) as any,
    });
    const result = await client.getBrokerSummary("BBRI");
    expect(result?.source).toBe("stockbit");
    expect(result?.coverage).toBe("full");
    expect(result?.start).toBe("2026-11-11");
    expect(result?.end).toBe("2026-11-24");
    expect(result?.data[0].summary[0].broker_code).toBe("KZ");
    expect(result?.data[0].summary[0].nval).toBe(400_000_000);
  });

  it("maps Stockbit chart candles", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        source: "stockbit",
        previous_close: 5750,
        candles: [
          {
            time: 1795485600,
            date: "2026-11-24",
            open: 5750,
            high: 5850,
            low: 5700,
            close: 5800,
            volume: 240000,
          },
        ],
      })
    );
    const client = new ScraperClient({
      baseUrl: "http://scraper:8001",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await client.getChart("BBRI", "1D");
    expect(result?.source).toBe("stockbit");
    expect(result?.candles[0].close).toBe(5800);
    expect(result?.previousClose).toBe(5750);
    expect(fetchMock.mock.calls[0][0]).toContain("/v1/stockbit/chart/BBRI");
    expect(fetchMock.mock.calls[0][0]).toContain("timeframe=1D");
  });

  it("returns null when a chart has no candles", async () => {
    const client = new ScraperClient({
      baseUrl: "http://scraper:8001",
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ candles: [] })) as any,
    });
    expect(await client.getChart("BBCA", "1Y")).toBeNull();
  });

  it("returns null instead of throwing when the scraper is down", async () => {
    const client = new ScraperClient({
      baseUrl: "http://scraper:8001",
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ error: "down" }, 502)) as any,
    });
    expect(await client.getProfile("BBCA")).toBeNull();
    expect(await client.getBrokerSummary("BBCA")).toBeNull();
  });
});
