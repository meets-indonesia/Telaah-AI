import fs from "node:fs";
import path from "node:path";
import {
  TIMEFRAME_CONFIG,
  detectHarmonicPatterns,
  type HarmonicMatch,
  type HarmonicTimeframe,
} from "@/lib/quant/harmonic";
import { computeTechnicalIndicators } from "@/lib/quant/indicators";
import {
  aggregateHourlyToDaily,
  buildTimeframeCandles,
  mergeHourlyIntoDaily,
} from "@/lib/market/timeframes";
import { YahooClient } from "@/lib/market/yahoo";
import type { DailyTransaction } from "@/lib/sectors/types";
import { LIQUID_IDX_UNIVERSE } from "./universe";

const CACHE_FILE_PATH = path.join(process.cwd(), "data", "harmonic_cache.json");
const CACHE_MAX_AGE_HOURS = 12;
const CACHE_MAX_RESULTS = 100;
const LOOKBACK_YEARS = 5;
const DEFAULT_CONCURRENCY = 4;

export interface HarmonicDataSource {
  getHourlyTransactions(symbol: string): Promise<DailyTransaction[] | null>;
  getDailyTransactions(
    symbol: string,
    startDate?: string,
    endDate?: string
  ): Promise<DailyTransaction[] | null>;
}

export interface HarmonicCandidate {
  symbol: string;
  price: number;
  best: HarmonicMatch;
  matches: HarmonicMatch[];
  timeframes: HarmonicTimeframe[];
  confluenceCount: number;
  score: number;
}

export interface HarmonicScanResult {
  version: number;
  generatedAt: string;
  date: string;
  direction?: "bullish" | "bearish" | "all";
  universeSize: number;
  scanned: number;
  failed: number;
  results: HarmonicCandidate[];
  limitations: string[];
}

export interface HarmonicScanOptions {
  refresh?: boolean;
  symbols?: string[];
  direction?: "bullish" | "bearish" | "all";
  source?: HarmonicDataSource;
  detect?: typeof detectHarmonicPatterns;
  cachePath?: string;
  now?: () => Date;
  concurrency?: number;
}

function createYahooSource(): HarmonicDataSource {
  const client = new YahooClient();
  return {
    getHourlyTransactions: (symbol) => client.getHourlyTransactions(symbol),
    getDailyTransactions: (symbol, startDate) =>
      client.getDailyTransactions(symbol, startDate),
  };
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
  return new Date(now.getTime() - LOOKBACK_YEARS * 365 * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const size = Math.max(1, Math.min(concurrency, items.length));

  await Promise.all(
    Array.from({ length: size }, async () => {
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

interface SymbolScan {
  candidate: HarmonicCandidate | null;
  failed: boolean;
}

async function scanSymbol(
  symbol: string,
  source: HarmonicDataSource,
  detect: typeof detectHarmonicPatterns,
  now: Date,
  direction: "bullish" | "bearish" | "all" = "bullish"
): Promise<SymbolScan> {
  let daily: DailyTransaction[] | null = null;
  let hourly: DailyTransaction[] | null = null;

  try {
    daily = await source.getDailyTransactions(symbol, startDateFor(now));
  } catch {
    daily = null;
  }
  try {
    hourly = await source.getHourlyTransactions(symbol);
  } catch {
    hourly = null;
  }

  if ((!daily || daily.length === 0) && (!hourly || hourly.length === 0)) {
    return { candidate: null, failed: true };
  }

  const mergedDaily = daily
    ? mergeHourlyIntoDaily(daily, hourly ?? [])
    : hourly
      ? aggregateHourlyToDaily(hourly)
      : null;

  const frames: Array<{ timeframe: HarmonicTimeframe; rows: DailyTransaction[] | null }> = [
    { timeframe: "4H", rows: hourly },
    { timeframe: "1D", rows: mergedDaily },
    { timeframe: "1W", rows: mergedDaily },
    { timeframe: "1M", rows: mergedDaily },
  ];

  const matches: HarmonicMatch[] = [];

  for (const frame of frames) {
    if (!frame.rows || frame.rows.length === 0) continue;
    const candles = buildTimeframeCandles(frame.rows, frame.timeframe);
    if (candles.length < TIMEFRAME_CONFIG[frame.timeframe].minCandles) continue;

    const rsi = computeTechnicalIndicators(
      candles.map((candle) => ({ ...candle, symbol }))
    ).rsi14;

    const found = detect(candles, {
      symbol,
      timeframe: frame.timeframe,
      rsi,
    });
    matches.push(
      ...found.filter(
        (match) => direction === "all" || match.direction === direction
      )
    );
  }

  if (matches.length === 0) return { candidate: null, failed: false };

  const best = [...matches].sort(
    (left, right) =>
      right.score - left.score ||
      Math.abs(left.distancePct) - Math.abs(right.distancePct) ||
      TIMEFRAME_CONFIG[right.timeframe].weight -
        TIMEFRAME_CONFIG[left.timeframe].weight
  )[0];
  const timeframes = [...new Set(matches.map((match) => match.timeframe))].sort(
    (left, right) =>
      TIMEFRAME_CONFIG[right].weight - TIMEFRAME_CONFIG[left].weight
  );

  return {
    candidate: {
      symbol,
      price: best.price,
      best,
      matches: [...matches].sort(
        (left, right) =>
          right.score - left.score ||
          Math.abs(left.distancePct) - Math.abs(right.distancePct) ||
          TIMEFRAME_CONFIG[right.timeframe].weight -
            TIMEFRAME_CONFIG[left.timeframe].weight
      ),
      timeframes,
      confluenceCount: timeframes.length,
      score: best.score,
    },
    failed: false,
  };
}

export function readHarmonicCache(
  maxAgeHours: number = CACHE_MAX_AGE_HOURS,
  cachePath: string = CACHE_FILE_PATH,
  now: Date = new Date()
): HarmonicScanResult | null {
  try {
    if (!fs.existsSync(cachePath)) return null;
    const parsed = JSON.parse(fs.readFileSync(cachePath, "utf-8")) as HarmonicScanResult;
    if (
      parsed?.version !== 2 ||
      !parsed.generatedAt ||
      !Array.isArray(parsed.results)
    ) {
      return null;
    }
    const ageHours = (now.getTime() - Date.parse(parsed.generatedAt)) / 3_600_000;
    if (!Number.isFinite(ageHours) || ageHours < 0 || ageHours > maxAgeHours) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeHarmonicCache(
  result: HarmonicScanResult,
  cachePath: string = CACHE_FILE_PATH
): void {
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    const temporary = `${cachePath}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(result, null, 2), "utf-8");
    fs.renameSync(temporary, cachePath);
  } catch (error) {
    console.warn("Gagal menyimpan harmonic_cache.json:", error);
  }
}

export async function scanHarmonicUniverse(
  options: HarmonicScanOptions = {}
): Promise<HarmonicScanResult> {
  const now = options.now?.() ?? new Date();
  const cachePath = options.cachePath ?? CACHE_FILE_PATH;

  const direction = options.direction ?? "bullish";
  if (!options.refresh && !options.symbols?.length) {
    const cached = readHarmonicCache(CACHE_MAX_AGE_HOURS, cachePath, now);
    if (cached && (cached.direction ?? "bullish") === direction) return cached;
  }

  const universe = (options.symbols?.length
    ? options.symbols
    : LIQUID_IDX_UNIVERSE
  ).map((symbol) => symbol.trim().toUpperCase());
  const source = options.source ?? createYahooSource();
  const detect = options.detect ?? detectHarmonicPatterns;

  const scans = await mapWithConcurrency(
    universe,
    options.concurrency ?? DEFAULT_CONCURRENCY,
    (symbol) => scanSymbol(symbol, source, detect, now, direction)
  );

  const candidates = scans
    .map((scan) => scan.candidate)
    .filter((candidate): candidate is HarmonicCandidate => candidate !== null);
  const failed = scans.filter((scan) => scan.failed).length;
  const scanned = universe.length - failed;

  candidates.sort(
    (left, right) =>
      right.score - left.score ||
      right.confluenceCount - left.confluenceCount ||
      Math.abs(left.best.distancePct) - Math.abs(right.best.distancePct)
  );

  const results = candidates.slice(0, CACHE_MAX_RESULTS);
  const limitations = [
    `Universe ${universe.length} emiten likuid, bukan seluruh bursa.`,
    "Data Yahoo dapat tertunda dan bukan real-time.",
  ];
  if (failed > 0) {
    limitations.push(
      `${failed} emiten gagal dipindai karena data Yahoo tidak tersedia.`
    );
  }
  if (results.length === 0) {
    limitations.push(
      "Tidak ada pola bullish yang dekat area buy pada pemindaian ini."
    );
  }

  const result: HarmonicScanResult = {
    version: 2,
    generatedAt: now.toISOString(),
    date: jakartaDate(now),
    direction,
    universeSize: universe.length,
    scanned,
    failed,
    results,
    limitations,
  };

  writeHarmonicCache(result, cachePath);
  return result;
}
