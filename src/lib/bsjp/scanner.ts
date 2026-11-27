import type { StockbitQuote } from "@/lib/market/scraper-client";
import { ScraperClient } from "@/lib/market/scraper-client";
import { YahooClient } from "@/lib/market/yahoo";
import type { DailyTransaction } from "@/lib/sectors/types";
import {
  DEFAULT_BSJP_RULES,
  ema,
  evaluateBsjp,
  type BsjpCandidate,
  type BsjpRules,
} from "@/lib/bsjp/evaluate";
import { BSJP_UNIVERSE } from "@/lib/bsjp/universe";
import { filterSyariah } from "@/lib/bsjp/syariah";

export interface BsjpDataSource {
  getDailyTransactions(
    symbol: string,
    startDate?: string
  ): Promise<DailyTransaction[] | null>;
  getQuote(symbol: string): Promise<StockbitQuote | null>;
  getIndexDaily?(): Promise<DailyTransaction[] | null>;
}

export interface BsjpScanResult {
  generatedAt: string;
  universeSize: number;
  scanned: number;
  marketRegime: "bullish" | "bearish" | "unknown";
  candidates: BsjpCandidate[];
  errors: number;
  limitations: string[];
}

export interface BsjpScanOptions {
  universe?: string[];
  now?: Date;
  source?: BsjpDataSource;
  rules?: BsjpRules;
  sleep?: (ms: number) => Promise<void>;
  ignoreRegime?: boolean;
  syariahOnly?: boolean;
}

function jakartaDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function startDateFor(now: Date): string {
  return new Date(now.getTime() - 365 * 86_400_000).toISOString().slice(0, 10);
}

function defaultSource(): BsjpDataSource {
  const scraper = new ScraperClient();
  const yahoo = new YahooClient();
  return {
    getDailyTransactions: (symbol, startDate) =>
      yahoo.getDailyTransactions(symbol, startDate),
    getQuote: (symbol) => scraper.getQuote(symbol),
    getIndexDaily: () => yahoo.getDailyTransactions("^JKSE", startDateFor(new Date())),
  };
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        results[index] = await worker(items[index]);
      }
    })
  );
  return results;
}

function prefilter(candles: DailyTransaction[] | null, rules: BsjpRules): boolean {
  if (!candles || candles.length < 55) return false;
  const sorted = [...candles].sort((left, right) =>
    left.date.localeCompare(right.date)
  );
  const closes = sorted.map((candle) => candle.close);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  if (ema20 === null || ema50 === null) return false;
  const last = sorted[sorted.length - 1];
  if (!(last.close > ema20 && ema20 > ema50)) return false;
  const recent = sorted.slice(-20);
  const averageValue =
    recent.reduce((total, candle) => total + candle.close * candle.volume, 0) /
    recent.length;
  return averageValue >= rules.minValue;
}

function marketRegime(
  candles: DailyTransaction[] | null
): "bullish" | "bearish" | "unknown" {
  if (!candles || candles.length < 21) return "unknown";
  const sorted = [...candles].sort((left, right) =>
    left.date.localeCompare(right.date)
  );
  const ema20 = ema(sorted.map((candle) => candle.close), 20);
  if (ema20 === null) return "unknown";
  return sorted[sorted.length - 1].close > ema20 ? "bullish" : "bearish";
}

export async function scanBsjp(
  options: BsjpScanOptions = {}
): Promise<BsjpScanResult> {
  const now = options.now ?? new Date();
  const rules = options.rules ?? DEFAULT_BSJP_RULES;
  const rawUniverse = options.universe ?? BSJP_UNIVERSE;
  const universe = options.syariahOnly
    ? filterSyariah(rawUniverse)
    : rawUniverse;
  const source = options.source ?? defaultSource();
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const today = jakartaDate(now);
  const startDate = startDateFor(now);
  const result: BsjpScanResult = {
    generatedAt: now.toISOString(),
    universeSize: universe.length,
    scanned: 0,
    marketRegime: "unknown",
    candidates: [],
    errors: 0,
    limitations: [],
  };

  let indexCandles: DailyTransaction[] | null = null;
  try {
    indexCandles = (await source.getIndexDaily?.()) ?? null;
  } catch {
    indexCandles = null;
  }
  if (options.syariahOnly) {
    result.limitations.push("Filter syariah JII70 aktif.");
  }
  result.marketRegime = marketRegime(indexCandles);
  if (result.marketRegime === "unknown") {
    result.limitations.push("IHSG/EMA20 tidak tersedia; filter regime dilewati.");
  }
  if (result.marketRegime === "bearish" && !options.ignoreRegime) {
    result.limitations.push("IHSG di bawah EMA20; scan dihentikan.");
    return result;
  }
  if (result.marketRegime === "bearish" && options.ignoreRegime) {
    result.limitations.push("Filter IHSG dilewati untuk dry-run.");
  }

  const daily = await mapLimit(universe, 4, async (symbol) => {
    try {
      return {
        symbol,
        candles: await source.getDailyTransactions(symbol, startDate),
      };
    } catch {
      return { symbol, candles: null };
    }
  });

  const candidates: BsjpCandidate[] = [];
  for (const item of daily) {
    if (!prefilter(item.candles, rules)) continue;
    result.scanned += 1;
    try {
      const quote = await source.getQuote(item.symbol);
      if (!quote) {
        result.errors += 1;
        continue;
      }
      const candidate = evaluateBsjp({
        symbol: item.symbol,
        candles: item.candles ?? [],
        quote,
        rules,
        today,
      });
      if (candidate) candidates.push(candidate);
    } catch {
      result.errors += 1;
    }
    await sleep(1100);
  }

  result.candidates = candidates
    .sort((left, right) => right.score - left.score)
    .slice(0, rules.maxCandidates);
  return result;
}

function formatNumber(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString("id-ID");
}

export function formatBsjpMessage(result: BsjpScanResult): string {
  const time = new Date(result.generatedAt).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const header = `🎯 <b>BSJP scan</b> · ${time} WIB`;
  const bypassed = result.limitations.some((line) =>
    line.includes("dry-run")
  );

  if (result.marketRegime === "bearish" && !bypassed) {
    return [
      header,
      "IHSG di bawah EMA20. Tidak ada scan malam ini.",
      "Paper only, bukan rekomendasi.",
    ].join("\n");
  }
  if (result.candidates.length === 0) {
    return [
      header,
      `Tidak ada kandidat dari ${result.universeSize} emiten.`,
      ...result.limitations,
      "Paper only, bukan rekomendasi.",
    ].join("\n");
  }

  const rows = result.candidates.map((candidate, index) => {
    const foreign =
      candidate.foreignNet && candidate.foreignNet > 0
        ? ` · asing +${formatNumber(candidate.foreignNet)}`
        : "";
    return [
      `${index + 1}. <b>${candidate.symbol}</b> · score ${candidate.score}`,
      `Rp ${candidate.last.toLocaleString("id-ID")} (${candidate.changePct >= 0 ? "+" : ""}${candidate.changePct.toFixed(2)}%) · close ${(candidate.closeStrength * 100).toFixed(0)}% · vol ${candidate.volumeRatio.toFixed(1)}x${foreign}`,
    ].join("\n");
  });

  return [
    header,
    ...rows,
    "",
    "Entry 15:50, exit 09:00 besok. Paper only, bukan rekomendasi.",
  ].join("\n");
}
