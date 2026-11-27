import type { ForeignFlowItem } from "@/lib/sectors/types";
import type { DailyTransaction } from "@/lib/sectors/types";
import {
  DEFAULT_ALERT_RULES,
  type AlertRules,
} from "@/lib/alerts/store";

export { DEFAULT_ALERT_RULES, type AlertRules } from "@/lib/alerts/store";

export type AlertSignalKind =
  | "price_up"
  | "price_down"
  | "volume_spike"
  | "breakout_high"
  | "breakout_low"
  | "foreign_buy"
  | "foreign_sell";

export interface AlertSignal {
  kind: AlertSignalKind;
  symbol: string;
  title: string;
  detail: string;
  severity: "info" | "warning";
  value: number;
  date: string;
}

export interface AlertEvaluationInput {
  symbol: string;
  candles: DailyTransaction[];
  foreignFlow: ForeignFlowItem[];
  rules: AlertRules;
}

function formatIdr(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1e12) return `Rp ${(value / 1e12).toFixed(2)}T`;
  if (absolute >= 1e9) return `Rp ${(value / 1e9).toFixed(1)}B`;
  if (absolute >= 1e6) return `Rp ${(value / 1e6).toFixed(1)}M`;
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function evaluateAlerts(input: AlertEvaluationInput): AlertSignal[] {
  const candles = [...input.candles]
    .filter(
      (candle) =>
        Number.isFinite(candle.close) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.volume)
    )
    .sort((left, right) => left.date.localeCompare(right.date));

  const lookback = Math.min(
    input.rules.breakoutLookback,
    Math.max(0, candles.length - 1)
  );
  if (lookback < 5) return [];

  const last = candles[candles.length - 1];
  const previous = candles.slice(-lookback - 1, -1);
  if (previous.length === 0) return [];

  const signals: AlertSignal[] = [];
  const previousClose = previous[previous.length - 1].close;
  const changePct =
    previousClose > 0 ? ((last.close - previousClose) / previousClose) * 100 : 0;

  if (Math.abs(changePct) >= input.rules.priceMovePct) {
    signals.push({
      kind: changePct >= 0 ? "price_up" : "price_down",
      symbol: input.symbol,
      title: changePct >= 0 ? "Harga naik signifikan" : "Harga turun signifikan",
      detail: `${formatPercent(changePct)} ke Rp ${last.close.toLocaleString("id-ID")}`,
      severity: changePct >= 0 ? "info" : "warning",
      value: changePct,
      date: last.date,
    });
  }

  const averageVolume =
    previous.reduce((total, candle) => total + candle.volume, 0) /
    previous.length;
  if (
    averageVolume > 0 &&
    last.volume >= averageVolume * input.rules.volumeSpikeMultiplier
  ) {
    const ratio = last.volume / averageVolume;
    signals.push({
      kind: "volume_spike",
      symbol: input.symbol,
      title: "Volume melonjak",
      detail: `${ratio.toFixed(1)}x rata-rata ${lookback} hari`,
      severity: "info",
      value: ratio,
      date: last.date,
    });
  }

  const previousHigh = Math.max(...previous.map((candle) => candle.high));
  const previousLow = Math.min(...previous.map((candle) => candle.low));
  if (last.close > previousHigh) {
    signals.push({
      kind: "breakout_high",
      symbol: input.symbol,
      title: "Tembus high",
      detail: `Close Rp ${last.close.toLocaleString("id-ID")} di atas high ${lookback} hari (Rp ${previousHigh.toLocaleString("id-ID")})`,
      severity: "info",
      value: last.close,
      date: last.date,
    });
  } else if (last.close < previousLow) {
    signals.push({
      kind: "breakout_low",
      symbol: input.symbol,
      title: "Tembus low",
      detail: `Close Rp ${last.close.toLocaleString("id-ID")} di bawah low ${lookback} hari (Rp ${previousLow.toLocaleString("id-ID")})`,
      severity: "warning",
      value: last.close,
      date: last.date,
    });
  }

  const latestFlow = [...input.foreignFlow]
    .filter((row) => Number.isFinite(row.net_foreign_inflow))
    .sort((left, right) => left.date.localeCompare(right.date))
    .at(-1);

  if (latestFlow) {
    if (latestFlow.net_foreign_inflow >= input.rules.foreignFlowIdr) {
      signals.push({
        kind: "foreign_buy",
        symbol: input.symbol,
        title: "Asing net buy",
        detail: `${formatIdr(latestFlow.net_foreign_inflow)} pada ${latestFlow.date}`,
        severity: "info",
        value: latestFlow.net_foreign_inflow,
        date: latestFlow.date,
      });
    } else if (latestFlow.net_foreign_inflow <= -input.rules.foreignFlowIdr) {
      signals.push({
        kind: "foreign_sell",
        symbol: input.symbol,
        title: "Asing net sell",
        detail: `${formatIdr(latestFlow.net_foreign_inflow)} pada ${latestFlow.date}`,
        severity: "warning",
        value: latestFlow.net_foreign_inflow,
        date: latestFlow.date,
      });
    }
  }

  return signals;
}
