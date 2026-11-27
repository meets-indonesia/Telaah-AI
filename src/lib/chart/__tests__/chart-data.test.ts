import { describe, expect, it } from "vitest";
import {
  chartCacheKey,
  idxMarketState,
  isValidSymbol,
  normalizeSymbol,
  normalizeTimeframe,
} from "../data";

describe("chart data helpers", () => {
  it("normalizes symbols and timeframes", () => {
    expect(normalizeSymbol("bbri.jk")).toBe("BBRI");
    expect(normalizeSymbol(null)).toBe("BBCA");
    expect(normalizeTimeframe("1D")).toBe("1D");
    expect(normalizeTimeframe("1Y")).toBe("1Y");
    expect(normalizeTimeframe("bad")).toBe("1W");
    expect(isValidSymbol("BBRI")).toBe(true);
    expect(isValidSymbol("BBR")).toBe(false);
  });

  it("uses one cache key per symbol and timeframe", () => {
    expect(chartCacheKey("BBCA", "1W")).toBe("telaah:chart:BBCA:1W");
  });

  it("knows the IDX session in WIB", () => {
    expect(idxMarketState(new Date("2026-11-23T03:00:00Z"))).toEqual({
      open: true,
      label: "Buka",
    });
    expect(idxMarketState(new Date("2026-11-23T05:30:00Z"))).toEqual({
      open: true,
      label: "Istirahat",
    });
    expect(idxMarketState(new Date("2026-11-23T10:00:00Z"))).toEqual({
      open: false,
      label: "Tutup",
    });
    expect(idxMarketState(new Date("2026-11-28T03:00:00Z"))).toEqual({
      open: false,
      label: "Akhir pekan",
    });
  });
});
