import { describe, expect, it } from "vitest";
import {
  DEFAULT_BSJP_RULES,
  evaluateBsjp,
  type BsjpRules,
} from "../evaluate";
import type { StockbitQuote } from "@/lib/market/scraper-client";
import type { DailyTransaction } from "@/lib/sectors/types";

const rules: BsjpRules = { ...DEFAULT_BSJP_RULES, maxRsi: 100 };

function dailyHistory(symbol = "BBCA", rising = true): DailyTransaction[] {
  return Array.from({ length: 60 }, (_, index) => {
    const close = rising
      ? 1000 + index * 0.8 + (index % 2 === 0 ? 5 : -5)
      : 1200 - index * 2;
    const previous = index === 0 ? close : 1000 + (index - 1) * 0.8;
    const date = new Date(Date.UTC(2026, 7, 1 + index))
      .toISOString()
      .slice(0, 10);
    return {
      symbol,
      date,
      open: previous,
      high: Math.max(open(previous, close), close + 5),
      low: Math.min(previous, close) - 5,
      close,
      volume: 1000,
    };
  });
}

function open(previous: number, close: number): number {
  return previous;
}

function quote(overrides: Partial<StockbitQuote> = {}): StockbitQuote {
  return {
    symbol: "BBCA",
    last: 1070,
    open: 1040,
    high: 1080,
    low: 1040,
    previousClose: 1040,
    change: 30,
    changePct: 2.88,
    volume: 3000,
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
    ...overrides,
  };
}

describe("BSJP evaluation", () => {
  it("accepts a liquid, strong-close, high-volume uptrend", () => {
    const candidate = evaluateBsjp({
      symbol: "BBCA",
      candles: dailyHistory(),
      quote: quote(),
      rules,
      today: "2026-09-30",
    });
    expect(candidate).not.toBeNull();
    expect(candidate?.score).toBeGreaterThan(50);
    expect(candidate?.reasons.join(" ")).toContain("volume");
  });

  it("rejects a stock outside the trend filter", () => {
    const candidate = evaluateBsjp({
      symbol: "BBCA",
      candles: dailyHistory("BBCA", false),
      quote: quote(),
      rules,
      today: "2026-09-30",
    });
    expect(candidate).toBeNull();
  });

  it("rejects weak close, low volume, and extreme return", () => {
    expect(
      evaluateBsjp({
        symbol: "BBCA",
        candles: dailyHistory(),
        quote: quote({ last: 1061, high: 1080, low: 1060 }),
        rules,
        today: "2026-09-30",
      })
    ).toBeNull();
    expect(
      evaluateBsjp({
        symbol: "BBCA",
        candles: dailyHistory(),
        quote: quote({ volume: 1000 }),
        rules,
        today: "2026-09-30",
      })
    ).toBeNull();
    expect(
      evaluateBsjp({
        symbol: "BBCA",
        candles: dailyHistory(),
        quote: quote({ last: 1120, changePct: 8.5 }),
        rules,
        today: "2026-09-30",
      })
    ).toBeNull();
  });

  it("does not require foreign flow, but rewards it", () => {
    const without = evaluateBsjp({
      symbol: "BBCA",
      candles: dailyHistory(),
      quote: quote({ foreignNet: null, foreignCurrent: false }),
      rules,
      today: "2026-09-30",
    });
    const withFlow = evaluateBsjp({
      symbol: "BBCA",
      candles: dailyHistory(),
      quote: quote(),
      rules,
      today: "2026-09-30",
    });
    expect(without).not.toBeNull();
    expect((withFlow?.score ?? 0) > (without?.score ?? 0)).toBe(true);
  });
});
