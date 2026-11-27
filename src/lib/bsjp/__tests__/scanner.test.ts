import { describe, expect, it, vi } from "vitest";
import {
  formatBsjpMessage,
  scanBsjp,
  type BsjpDataSource,
} from "../scanner";
import { DEFAULT_BSJP_RULES } from "../evaluate";
import type { DailyTransaction } from "@/lib/sectors/types";
import type { StockbitQuote } from "@/lib/market/scraper-client";

function history(symbol: string): DailyTransaction[] {
  return Array.from({ length: 60 }, (_, index) => {
    const close = 1000 + index * 0.8 + (index % 2 === 0 ? 5 : -5);
    const date = new Date(Date.UTC(2026, 7, 1 + index))
      .toISOString()
      .slice(0, 10);
    return {
      symbol,
      date,
      open: close - 2,
      high: close + 5,
      low: close - 8,
      close,
      volume: 6_000_000,
    };
  });
}

function quote(symbol: string, last: number, low: number): StockbitQuote {
  return {
    symbol,
    last,
    open: 1040,
    high: 1080,
    low,
    previousClose: 1040,
    change: 30,
    changePct: 2.88,
    volume: 18_000_000,
    value: 10_000_000_000,
    frequency: 5000,
    foreignBuy: 2_000_000_000,
    foreignSell: 1_000_000_000,
    foreignNet: 1_000_000_000,
    foreignCurrent: true,
    bid: 1065,
    offer: 1070,
    ara: 1400,
    arb: 900,
    source: "stockbit",
  };
}

function source(overrides: Partial<BsjpDataSource> = {}): BsjpDataSource {
  return {
    getDailyTransactions: vi.fn(async (symbol: string) => history(symbol)),
    getQuote: vi.fn(async (symbol: string) =>
      symbol === "BBCA" ? quote(symbol, 1070, 1040) : quote(symbol, 1061, 1060)
    ),
    getIndexDaily: vi.fn(async () => history("^JKSE")),
    ...overrides,
  };
}

describe("BSJP scanner", () => {
  it("returns ranked candidates that pass the rules", async () => {
    const result = await scanBsjp({
      universe: ["BBCA", "BBRI"],
      now: new Date("2026-09-30T08:45:00Z"),
      source: source(),
      rules: { ...DEFAULT_BSJP_RULES, maxRsi: 100 },
      sleep: async () => {},
    });
    expect(result.universeSize).toBe(2);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].symbol).toBe("BBCA");
    expect(result.marketRegime).toBe("bullish");
  });

  it("does not scan when IHSG is below EMA20", async () => {
    const bearish = history("^JKSE").map((candle, index) => ({
      ...candle,
      close: 1200 - index * 2,
    }));
    const result = await scanBsjp({
      universe: ["BBCA"],
      now: new Date("2026-09-30T08:45:00Z"),
      source: source({ getIndexDaily: async () => bearish }),
      rules: { ...DEFAULT_BSJP_RULES, maxRsi: 100 },
      sleep: async () => {},
    });
    expect(result.marketRegime).toBe("bearish");
    expect(result.candidates).toEqual([]);
    expect(result.limitations.join(" ")).toContain("IHSG");
  });

  it("can bypass the regime filter only for a dry research scan", async () => {
    const bearish = history("^JKSE").map((candle, index) => ({
      ...candle,
      close: 1200 - index * 2,
    }));
    const result = await scanBsjp({
      universe: ["BBCA"],
      now: new Date("2026-09-30T08:45:00Z"),
      source: source({ getIndexDaily: async () => bearish }),
      rules: { ...DEFAULT_BSJP_RULES, maxRsi: 100 },
      sleep: async () => {},
      ignoreRegime: true,
    });
    expect(result.limitations.join(" ")).toContain("dry-run");
    expect(result.scanned).toBe(1);
  });

  it("formats a paper-trading message", () => {
    const text = formatBsjpMessage({
      generatedAt: "2026-09-30T08:45:00.000Z",
      universeSize: 2,
      scanned: 1,
      marketRegime: "bullish",
      errors: 0,
      limitations: [],
      candidates: [
        {
          symbol: "BBCA",
          date: "2026-09-30",
          last: 5900,
          changePct: 1.29,
          closeStrength: 0.8,
          volumeRatio: 2.3,
          rsi: 61,
          ema20: 5800,
          ema50: 5700,
          value: 10_000_000_000,
          foreignNet: 1_000_000_000,
          score: 82,
          reasons: ["close strength 80%", "volume 2.3x"],
        },
      ],
    });
    expect(text).toContain("BBCA");
    expect(text).toContain("Entry 15:50");
    expect(text).toContain("exit 09:00");
    expect(text).toContain("Paper only");
  });
});
