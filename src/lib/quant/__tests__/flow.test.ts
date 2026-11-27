import { describe, expect, it } from "vitest";
import { analyzeFlowLens } from "../flow";

const foreign = {
  symbol: "BBCA",
  data: [
    { date: "2026-11-19", net_foreign_inflow: 10_000_000_000 },
    { date: "2026-11-20", net_foreign_inflow: 20_000_000_000 },
  ],
};

describe("analyzeFlowLens", () => {
  it("is partial with foreign flow only", () => {
    const result = analyzeFlowLens(null, foreign, []);
    expect(result.status).toBe("partial");
    expect(result.foreignFlow.cumulative5d).toBe(30_000_000_000);
    expect(result.topBuyers).toEqual([]);
    expect(result.bandarmologySummary).toBeUndefined();
  });

  it("is partial and suppresses bandarmology for top10 coverage", () => {
    const broker = {
      symbol: "BBCA",
      coverage: "top10",
      source: "ipot",
      data: [
        {
          date: "2026-11-20",
          summary: [
            {
              broker_code: "AK",
              bval: 1e9,
              sval: 0,
              blot: 100,
              slot: 0,
              bavg_per_share: 1000,
              savg_per_share: 0,
            },
          ],
        },
      ],
    } as any;

    const result = analyzeFlowLens(broker, foreign, []);
    expect(result.status).toBe("partial");
    expect(result.coverage).toBe("top10");
    expect(result.bandarmologySummary).toBeUndefined();
  });
});
