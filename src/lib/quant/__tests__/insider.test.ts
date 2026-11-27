import { describe, expect, it } from "vitest";
import { analyzeInsiderCluster } from "../insider";

describe("analyzeInsiderCluster", () => {
  it("returns unavailable and no seed transactions when filings are unavailable", () => {
    const result = analyzeInsiderCluster([], undefined, undefined, "BBCA", 5000, false);
    expect(result.status).toBe("unavailable");
    expect(result.transactions).toEqual([]);
    expect(result.totalBuyShares).toBe(0);
    expect(result.summary).not.toContain("Cluster");
  });

  it("maps structured filings into buy transactions", () => {
    const result = analyzeInsiderCluster(
      [
        {
          date: "2026-03-25",
          title: "Pembelian",
          holder_name: "Haryanto",
          holder_type: "insider",
          transaction_type: "buy",
          amount_transaction: 379_428,
          price: 6982,
          share_percentage_before: 0.001,
          share_percentage_after: 0.001,
        },
      ],
      { key_executives: [{ name: "Haryanto", title: "Direksi" }] },
      undefined,
      "BBCA",
      5675,
      true
    );

    expect(result.status).toBe("available");
    expect(result.totalBuyShares).toBe(379_428);
    expect(result.transactions[0].action).toBe("BUY");
  });

  it("does not turn an unparsed PDF into a neutral insider transaction", () => {
    const result = analyzeInsiderCluster(
      [
        {
          date: "2026-11-20",
          title: "Laporan Kepemilikan",
          symbol: "BBCA",
          unparsed: true,
          source: "idx-announcement-pdf",
        },
      ],
      undefined,
      undefined,
      "BBCA",
      5675,
      true
    );
    expect(result.status).toBe("partial");
    expect(result.transactions).toEqual([]);
    expect(result.summary).not.toContain("Cluster");
  });
});
