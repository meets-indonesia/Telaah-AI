import { describe, expect, it } from "vitest";
import { chartQuery } from "../url";

describe("chartQuery", () => {
  it("keeps the harmonic timeframe in the URL", () => {
    expect(chartQuery("ADMR", "1Y", "1M")).toBe("symbol=ADMR&tf=1Y&htf=1M");
  });

  it("omits htf when there is no harmonic timeframe", () => {
    expect(chartQuery("ADMR", "1Y", null)).toBe("symbol=ADMR&tf=1Y");
  });

  it("keeps the compare symbol in the URL", () => {
    expect(chartQuery("ADMR", "1Y", "1M", "BBRI")).toBe(
      "symbol=ADMR&tf=1Y&htf=1M&compare=BBRI"
    );
  });
});
