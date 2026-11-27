import { describe, expect, it } from "vitest";
import {
  DEFAULT_ALERT_RULES,
  evaluateAlerts,
  type AlertRules,
} from "../evaluate";

function day(index: number): string {
  const date = new Date(Date.UTC(2026, 10, 1 + index));
  return date.toISOString().slice(0, 10);
}

function history(overrides: Partial<{
  close: number;
  high: number;
  low: number;
  volume: number;
}> = {}) {
  const candles = Array.from({ length: 20 }, (_, index) => ({
    symbol: "BBCA",
    date: day(index),
    open: 1000,
    high: 1010,
    low: 990,
    close: 1000,
    volume: 1000,
  }));
  candles.push({
    symbol: "BBCA",
    date: day(20),
    open: 1000,
    high: overrides.high ?? 1080,
    low: overrides.low ?? 990,
    close: overrides.close ?? 1000,
    volume: overrides.volume ?? 1000,
  });
  return candles;
}

const rules: AlertRules = {
  ...DEFAULT_ALERT_RULES,
  priceMovePct: 5,
  volumeSpikeMultiplier: 2,
  foreignFlowIdr: 50_000_000_000,
  breakoutLookback: 20,
};

describe("alert evaluation", () => {
  it("emits a price move signal above the threshold", () => {
    const signals = evaluateAlerts({
      symbol: "BBCA",
      candles: history({ close: 1070 }),
      foreignFlow: [],
      rules,
    });
    const price = signals.find((signal) => signal.kind === "price_up");
    expect(price?.detail).toContain("7.00%");
  });

  it("does not emit a price signal inside the threshold", () => {
    const signals = evaluateAlerts({
      symbol: "BBCA",
      candles: history({ close: 1030 }),
      foreignFlow: [],
      rules,
    });
    expect(signals.some((signal) => signal.kind.startsWith("price_"))).toBe(false);
  });

  it("emits volume, breakout, and foreign flow signals together", () => {
    const signals = evaluateAlerts({
      symbol: "BBCA",
      candles: history({ close: 1070, volume: 3000 }),
      foreignFlow: [
        {
          date: day(20),
          net_foreign_inflow: 75_000_000_000,
          net_foreign_shares: 1_000_000,
        },
      ],
      rules,
    });
    expect(signals.map((signal) => signal.kind).sort()).toEqual([
      "breakout_high",
      "foreign_buy",
      "price_up",
      "volume_spike",
    ]);
  });

  it("emits a breakdown and foreign sell when the data is negative", () => {
    const signals = evaluateAlerts({
      symbol: "BBCA",
      candles: history({ close: 900, low: 880 }),
      foreignFlow: [
        {
          date: day(20),
          net_foreign_inflow: -80_000_000_000,
          net_foreign_shares: -1_000_000,
        },
      ],
      rules,
    });
    expect(signals.some((signal) => signal.kind === "breakout_low")).toBe(true);
    expect(signals.some((signal) => signal.kind === "foreign_sell")).toBe(true);
  });

  it("stays quiet when history is too short", () => {
    const signals = evaluateAlerts({
      symbol: "BBCA",
      candles: history({ close: 1200 }).slice(-2),
      foreignFlow: [],
      rules,
    });
    expect(signals).toEqual([]);
  });
});
