import { describe, expect, it, vi } from "vitest";
import { YahooClient } from "../yahoo";

function series(type: string, asOfDate: string, raw: number, currencyCode: string, periodType = "3M") {
  return {
    meta: { type: [type] },
    timestamp: [1],
    [type]: [{ asOfDate, periodType, currencyCode, reportedValue: { raw } }],
  };
}

const body = {
  timeseries: { result: [
    series("quarterlyTotalRevenue", "2026-09-30", 902_262_000, "USD"),
    series("quarterlyNetIncome", "2026-09-30", 207_186_000, "USD"),
    series("quarterlyStockholdersEquity", "2026-09-30", 5_031_405_000, "USD"),
    series("quarterlyOrdinarySharesNumber", "2026-09-30", 28_800_494_200, "USD"),
    series("quarterlyTotalRevenue", "2025-09-30", 1_000_000_000, "USD", "12M"),
  ] },
};

describe("YahooClient.getQuarterlyFinancials", () => {
  it("converts USD monetary values to IDR and leaves shares alone", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    const client = new YahooClient({ fetchImpl: fetchMock, getUsdIdrRate: async () => 16000 });
    const rows = await client.getQuarterlyFinancials("ADRO", 4);
    expect(rows).toHaveLength(1);
    expect(rows![0].revenue).toBe(902_262_000 * 16000);
    expect(rows![0].earnings).toBe(207_186_000 * 16000);
    expect(rows![0].total_equity).toBe(5_031_405_000 * 16000);
    expect(rows![0].currency).toBe("IDR");
    expect(rows![0].sourceCurrency).toBe("USD");
    expect(rows![0].fxRate).toBe(16000);
    expect(rows![0].financials_sector_metrics?.ordinary_shares).toBe(28_800_494_200);
  });

  it("returns null when FX is needed but unavailable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    const client = new YahooClient({ fetchImpl: fetchMock, getUsdIdrRate: async () => null });
    expect(await client.getQuarterlyFinancials("ADRO", 4)).toBeNull();
  });
});
