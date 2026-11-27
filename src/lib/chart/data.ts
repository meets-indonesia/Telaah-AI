import {
  ScraperClient,
  type ChartCandle,
} from "@/lib/market/scraper-client";
import { YahooClient } from "@/lib/market/yahoo";
import { getRedisReady } from "@/lib/storage/redis";
import type { ChartPayload, ChartTimeframe } from "@/lib/chart/types";

export type { ChartPayload, ChartTimeframe } from "@/lib/chart/types";

export const CHART_CACHE_TTL_MS = 15_000;

export function normalizeTimeframe(value: string | null): ChartTimeframe {
  if (value === "1D" || value === "1W" || value === "1Y" || value === "5Y") {
    return value;
  }
  return "1W";
}

export function normalizeSymbol(value: string | null): string {
  return (value || "BBCA").trim().toUpperCase().replace(".JK", "");
}

export function isValidSymbol(value: string): boolean {
  return /^[A-Z]{4}$/.test(value);
}

export function chartCacheKey(symbol: string, timeframe: ChartTimeframe): string {
  return `telaah:chart:${symbol}:${timeframe}`;
}

export function idxMarketState(now = new Date()): {
  open: boolean;
  label: "Buka" | "Istirahat" | "Tutup" | "Akhir pekan";
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = value("weekday");
  const minutes = Number(value("hour")) * 60 + Number(value("minute"));

  if (weekday === "Sat" || weekday === "Sun") {
    return { open: false, label: "Akhir pekan" };
  }
  if (minutes >= 9 * 60 && minutes <= 16 * 60) {
    // IDX pauses matching at midday; the tape is idle but the session is open.
    if (minutes >= 12 * 60 && minutes < 13 * 60 + 30) {
      return { open: true, label: "Istirahat" };
    }
    return { open: true, label: "Buka" };
  }
  return { open: false, label: "Tutup" };
}

function toTimestamp(date: string): number {
  const value = date.includes("T") ? date : `${date}T00:00:00+07:00`;
  return Math.floor(new Date(value).getTime() / 1000);
}

async function yahooFallback(
  symbol: string,
  timeframe: ChartTimeframe
): Promise<{ candles: ChartCandle[]; previousClose: number | null }> {
  const yahoo = new YahooClient();
  const rows =
    timeframe === "1D" || timeframe === "1W"
      ? await yahoo.getHourlyTransactions(symbol)
      : await yahoo.getDailyTransactions(
          symbol,
          new Date(Date.now() - 5 * 365 * 86_400_000)
            .toISOString()
            .slice(0, 10)
        );

  const candles = rows
    .map((row) => ({
      time: toTimestamp(row.date),
      date: new Date(toTimestamp(row.date) * 1000).toLocaleDateString("en-CA", {
        timeZone: "Asia/Jakarta",
      }),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
    }))
    .filter((candle) => Number.isFinite(candle.time));

  candles.sort((left, right) => left.time - right.time);
  const unique = [...new Map(candles.map((candle) => [candle.time, candle])).values()];
  const previousClose =
    unique.length > 1 ? unique[unique.length - 2].close : null;

  if (timeframe === "1D" && unique.length > 0) {
    const latestDate = new Date(unique[unique.length - 1].time * 1000)
      .toISOString()
      .slice(0, 10);
    const latest = unique.filter(
      (candle) =>
        new Date(candle.time * 1000).toISOString().slice(0, 10) === latestDate
    );
    return {
      candles: latest.length > 0 ? latest : unique.slice(-24),
      previousClose,
    };
  }
  if (timeframe === "1W") {
    return { candles: unique.slice(-7 * 8), previousClose };
  }
  if (timeframe === "1Y") {
    return { candles: unique.slice(-260), previousClose };
  }
  return { candles: unique, previousClose };
}

export async function fetchChartData(
  symbol: string,
  timeframe: ChartTimeframe
): Promise<ChartPayload | null> {
  const scraper = new ScraperClient();
  const stockbit = await scraper.getChart(symbol, timeframe).catch(() => null);
  if (stockbit?.candles.length) {
    return {
      success: true,
      symbol,
      timeframe,
      source: "stockbit",
      delayed: false,
      candles: stockbit.candles,
      last: stockbit.candles[stockbit.candles.length - 1],
      previousClose: stockbit.previousClose ?? null,
      fetchedAt: new Date().toISOString(),
    };
  }

  const fallback = await yahooFallback(symbol, timeframe);
  if (fallback.candles.length === 0) return null;
  return {
    success: true,
    symbol,
    timeframe,
    source: "yahoo",
    delayed: true,
    candles: fallback.candles,
    last: fallback.candles[fallback.candles.length - 1],
    previousClose: fallback.previousClose,
    fetchedAt: new Date().toISOString(),
  };
}

export async function readChartCache(
  symbol: string,
  timeframe: ChartTimeframe
): Promise<ChartPayload | null> {
  const client = await getRedisReady();
  if (!client) return null;
  try {
    const raw = await client.get(chartCacheKey(symbol, timeframe));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChartPayload;
    if (!parsed?.candles?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeChartCache(payload: ChartPayload): Promise<void> {
  const client = await getRedisReady();
  if (!client) return;
  try {
    const ttl = idxMarketState().open
      ? payload.timeframe === "1D"
        ? 60_000
        : payload.timeframe === "1W"
          ? 5 * 60_000
          : 30 * 60_000
      : 24 * 60 * 60_000;
    await client.set(
      chartCacheKey(payload.symbol, payload.timeframe),
      JSON.stringify(payload),
      "PX",
      ttl
    );
  } catch {
    // The stream still works without Redis.
  }
}
