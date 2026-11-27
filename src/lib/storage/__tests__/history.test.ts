import { beforeEach, describe, expect, it, vi } from "vitest";
import { REPORT_DATA_VERSION } from "@/lib/agent/types";
import {
  getReportFromCache,
  getWatchlistSymbols,
  isReportCacheCompatible,
} from "../history";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
});

describe("watchlist defaults", () => {
  it("removes the legacy BBCA/ADRO/BBRI default once", () => {
    localStorage.setItem(
      "telaah360_watchlist_v2",
      JSON.stringify(["BBCA", "ADRO", "BBRI"])
    );
    expect(getWatchlistSymbols()).toEqual([]);
    expect(localStorage.getItem("telaah360_watchlist_v2")).toBeNull();
  });

  it("keeps a user's custom watchlist", () => {
    localStorage.setItem("telaah360_watchlist_v2", JSON.stringify(["TLKM"]));
    expect(getWatchlistSymbols()).toEqual(["TLKM"]);
  });
});

describe("report cache versioning", () => {
  it("ignores a report from an older data source/version", () => {
    localStorage.setItem(
      "telaah360_cache_rep_BBCA",
      JSON.stringify({ symbol: "BBCA", dataSource: "sectors", dataVersion: 0 })
    );
    expect(getReportFromCache("BBCA")).toBeNull();
    expect(isReportCacheCompatible({ dataSource: "sectors", dataVersion: 0 })).toBe(false);
  });

  it("accepts a current open-market report", () => {
    expect(
      isReportCacheCompatible({
        dataSource: "open-market",
        dataVersion: REPORT_DATA_VERSION,
      })
    ).toBe(true);
  });

  it("rejects a fallback report even at the current version", () => {
    expect(
      isReportCacheCompatible({
        dataSource: "open-market",
        dataVersion: REPORT_DATA_VERSION,
        synthesisFailed: true,
      })
    ).toBe(false);
  });
});
