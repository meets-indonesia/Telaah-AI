import { describe, expect, it } from "vitest";
import {
  DEFAULT_BSJP_COSTS,
  runBsjpBacktest,
  roundToTick,
  type BsjpBacktestOptions,
} from "../backtest";
import { DEFAULT_BSJP_RULES } from "../evaluate";
import type { DailyTransaction } from "@/lib/sectors/types";

function series(symbol: string, length: number): DailyTransaction[] {
  return Array.from({ length }, (_, index) => {
    const date = new Date(Date.UTC(2025, 0, 1 + index))
      .toISOString()
      .slice(0, 10);
    const close = 1000 + index * 0.8;
    return {
      symbol,
      date,
      open: close - 2,
      high: close + 3,
      low: close - 5,
      close,
      volume: 6_000_000,
    };
  });
}

function scenario(): BsjpBacktestOptions {
  const stock = series("BBCA", 62);
  const signal = stock[60];
  stock[60] = {
    ...signal,
    open: 1040,
    high: 1080,
    low: 1040,
    close: 1070,
    volume: 18_000_000,
  };
  stock[61] = {
    ...stock[61],
    open: 1080,
    high: 1090,
    low: 1070,
    close: 1085,
    volume: 9_000_000,
  };
  return {
    data: { BBCA: stock },
    index: series("^JKSE", 62),
    rules: { ...DEFAULT_BSJP_RULES, maxRsi: 100 },
    costs: { buyFeePct: 0, sellFeePct: 0, slippagePct: 0 },
    initialEquity: 100_000_000,
    maxPositions: 2,
    allocationPct: 0.25,
    start: stock[0].date,
    end: stock[61].date,
  };
}

describe("BSJP backtest", () => {
  it("rounds prices to the IDX tick table", () => {
    expect(roundToTick(199)).toBe(199);
    expect(roundToTick(201)).toBe(202);
    expect(roundToTick(1003)).toBe(1005);
    expect(roundToTick(5004)).toBe(5000);
    expect(roundToTick(6007)).toBe(6000);
  });

  it("captures one overnight trade and compounds the P&L", () => {
    const report = runBsjpBacktest(scenario());
    expect(report.trades).toHaveLength(1);
    expect(report.trades[0].symbol).toBe("BBCA");
    expect(report.trades[0].entry).toBe(1070);
    expect(report.trades[0].exit).toBe(1080);
    expect(report.trades[0].pnl).toBeGreaterThan(0);
    expect(report.finalEquity).toBeGreaterThan(report.initialEquity);
    expect(report.winRatePct).toBe(100);
  });

  it("charges fees and slippage so the net result is lower", () => {
    const free = runBsjpBacktest(scenario());
    const paid = runBsjpBacktest({
      ...scenario(),
      costs: DEFAULT_BSJP_COSTS,
    });
    expect(paid.trades[0].pnl).toBeLessThan(free.trades[0].pnl);
    expect(paid.finalEquity).toBeLessThan(free.finalEquity);
  });

  it("does not trade when the market regime is bearish", () => {
    const options = scenario();
    options.index = options.index.map((candle, index) => ({
      ...candle,
      close: 1200 - index * 2,
    }));
    const report = runBsjpBacktest(options);
    expect(report.trades).toHaveLength(0);
    expect(report.finalEquity).toBe(report.initialEquity);
  });
});
