import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { YahooClient } from "@/lib/market/yahoo";
import type { DailyTransaction } from "@/lib/sectors/types";
import { BSJP_UNIVERSE } from "@/lib/bsjp/universe";
import { filterSyariah } from "@/lib/bsjp/syariah";
import {
  runBsjpBacktest,
  type BsjpBacktestReport,
} from "@/lib/bsjp/backtest";
import { DEFAULT_BSJP_RULES } from "@/lib/bsjp/evaluate";

interface CachedSeries {
  fetchedAt: string;
  startDate: string;
  candles: DailyTransaction[];
}

export interface BacktestRunOptions {
  years?: number;
  universe?: string[];
  cacheDir?: string;
  now?: Date;
  forceRefresh?: boolean;
  syariahOnly?: boolean;
}

export interface BacktestRunResult {
  report: BsjpBacktestReport;
  reportPath: string | null;
  fetched: number;
  cached: number;
  failed: string[];
}

export interface LoadedBacktestData {
  data: Record<string, DailyTransaction[]>;
  index: DailyTransaction[];
  startDate: string;
  endDate: string;
  universe: string[];
  syariahOnly: boolean;
  fetched: number;
  cached: number;
  failed: string[];
  limitations: string[];
}

export interface BsjpSweepCombo {
  minCloseStrength: number;
  minVolumeRatio: number;
  minReturnPct: number;
  maxReturnPct: number;
  maxPositions: number;
}

export interface BsjpSweepRow extends BsjpSweepCombo {
  totalReturnPct: number;
  cagrPct: number;
  maxDrawdownPct: number;
  sharpe: number;
  tradeCount: number;
  winRatePct: number;
  avgNetPct: number;
  profitFactor: number;
  exposurePct: number;
  worstGapPct: number;
  finalEquity: number;
}

export interface BsjpSweepResult {
  comboCount: number;
  universeSize: number;
  syariahOnly: boolean;
  rows: BsjpSweepRow[];
  topReturn: BsjpSweepRow[];
  topSharpe: BsjpSweepRow[];
  reportPath: string | null;
  fetched: number;
  cached: number;
  failed: string[];
  limitations: string[];
}

const CACHE_TTL_MS = 12 * 3600_000;

function startDateFor(now: Date, years: number): string {
  return new Date(now.getTime() - years * 365 * 86_400_000)
    .toISOString()
    .slice(0, 10);
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

function cacheFile(cacheDir: string, symbol: string, startDate: string): string {
  return path.join(cacheDir, `${symbol.replace("^", "INDEX_")}-${startDate}.json`);
}

async function loadSeries(
  yahoo: YahooClient,
  symbol: string,
  startDate: string,
  cacheDir: string,
  forceRefresh: boolean
): Promise<{ candles: DailyTransaction[]; cached: boolean } | null> {
  const file = cacheFile(cacheDir, symbol, startDate);
  if (!forceRefresh) {
    try {
      const raw = JSON.parse(await readFile(file, "utf8")) as CachedSeries;
      const age = Date.now() - Date.parse(raw.fetchedAt);
      if (
        raw.startDate === startDate &&
        Array.isArray(raw.candles) &&
        raw.candles.length > 0 &&
        age < CACHE_TTL_MS
      ) {
        return { candles: raw.candles, cached: true };
      }
    } catch {
      // Fetch below.
    }
  }

  try {
    const candles = await yahoo.getDailyTransactions(symbol, startDate);
    if (!candles || candles.length === 0) return null;
    await mkdir(cacheDir, { recursive: true });
    const payload: CachedSeries = {
      fetchedAt: new Date().toISOString(),
      startDate,
      candles,
    };
    await writeFile(file, JSON.stringify(payload), "utf8");
    return { candles, cached: false };
  } catch {
    return null;
  }
}

export async function loadBsjpBacktestData(
  options: BacktestRunOptions = {}
): Promise<LoadedBacktestData> {
  const now = options.now ?? new Date();
  const years = Math.min(10, Math.max(1, options.years ?? 5));
  const startDate = startDateFor(now, years);
  const cacheDir =
    options.cacheDir ?? path.join(process.cwd(), "data", "backtests", "cache");
  const rawUniverse = options.universe ?? BSJP_UNIVERSE;
  const syariahOnly = options.syariahOnly ?? true;
  const universe = syariahOnly ? filterSyariah(rawUniverse) : rawUniverse;
  const yahoo = new YahooClient();
  const failed: string[] = [];
  let fetched = 0;
  let cached = 0;

  const series = await mapLimit(
    ["^JKSE", ...universe],
    3,
    async (symbol) => {
      const result = await loadSeries(
        yahoo,
        symbol,
        startDate,
        cacheDir,
        options.forceRefresh ?? false
      );
      if (!result) {
        failed.push(symbol);
        return { symbol, candles: [] as DailyTransaction[] };
      }
      if (result.cached) cached += 1;
      else fetched += 1;
      return { symbol, candles: result.candles };
    }
  );

  const index = series.find((item) => item.symbol === "^JKSE")?.candles ?? [];
  const data: Record<string, DailyTransaction[]> = {};
  for (const item of series) {
    if (item.symbol !== "^JKSE" && item.candles.length > 0) {
      data[item.symbol] = item.candles;
    }
  }

  const limitations: string[] = [];
  if (syariahOnly) {
    limitations.push("Hanya konstituen JII70 (snapshot 2026-11-26).");
  }
  if (failed.length > 0) {
    limitations.push(`Data gagal diambil: ${failed.join(", ")}.`);
  }
  if (years < 5) {
    limitations.push(`Sampel hanya ${years} tahun.`);
  }

  return {
    data,
    index,
    startDate,
    endDate: now.toISOString().slice(0, 10),
    universe,
    syariahOnly,
    fetched,
    cached,
    failed,
    limitations,
  };
}

export async function runBsjpBacktestFromYahoo(
  options: BacktestRunOptions = {}
): Promise<BacktestRunResult> {
  const now = options.now ?? new Date();
  const years = Math.min(10, Math.max(1, options.years ?? 5));
  const loaded = await loadBsjpBacktestData(options);

  const report = runBsjpBacktest({
    data: loaded.data,
    index: loaded.index,
    start: loaded.startDate,
    end: loaded.endDate,
    limitations: loaded.limitations,
  });

  let reportPath: string | null = null;
  try {
    const reportDir = path.join(process.cwd(), "data", "backtests");
    await mkdir(reportDir, { recursive: true });
    reportPath = path.join(
      reportDir,
      `bsjp-${now.toISOString().replace(/[:.]/g, "-")}.json`
    );
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          generatedAt: now.toISOString(),
          years,
          universeSize: loaded.universe.length,
          syariahOnly: loaded.syariahOnly,
          failed: loaded.failed,
          report,
        },
        null,
        2
      ),
      "utf8"
    );
  } catch {
    loaded.limitations.push("Laporan gagal disimpan ke disk.");
  }

  return {
    report,
    reportPath,
    fetched: loaded.fetched,
    cached: loaded.cached,
    failed: loaded.failed,
  };
}

function sweepCombos(): BsjpSweepCombo[] {
  const combos: BsjpSweepCombo[] = [];
  for (const maxPositions of [1, 2]) {
    for (const minCloseStrength of [0.7, 0.8, 0.85, 0.9]) {
      for (const minVolumeRatio of [1.5, 2, 2.5]) {
        for (const [minReturnPct, maxReturnPct] of [
          [1, 7],
          [2, 5],
          [2, 6],
          [3, 6],
        ]) {
          combos.push({
            maxPositions,
            minCloseStrength,
            minVolumeRatio,
            minReturnPct,
            maxReturnPct,
          });
        }
      }
    }
  }
  return combos;
}

export async function runBsjpSweepFromYahoo(
  options: BacktestRunOptions = {}
): Promise<BsjpSweepResult> {
  const now = options.now ?? new Date();
  const loaded = await loadBsjpBacktestData(options);
  const rows: BsjpSweepRow[] = [];
  const combos = sweepCombos();

  for (const combo of combos) {
    const report = runBsjpBacktest({
      data: loaded.data,
      index: loaded.index,
      start: loaded.startDate,
      end: loaded.endDate,
      maxPositions: combo.maxPositions,
      rules: {
        ...DEFAULT_BSJP_RULES,
        minCloseStrength: combo.minCloseStrength,
        minVolumeRatio: combo.minVolumeRatio,
        minReturnPct: combo.minReturnPct,
        maxReturnPct: combo.maxReturnPct,
      },
      limitations: loaded.limitations,
    });
    rows.push({
      ...combo,
      totalReturnPct: report.totalReturnPct,
      cagrPct: report.cagrPct,
      maxDrawdownPct: report.maxDrawdownPct,
      sharpe: report.sharpe,
      tradeCount: report.tradeCount,
      winRatePct: report.winRatePct,
      avgNetPct: report.avgNetPct,
      profitFactor: report.profitFactor,
      exposurePct: report.exposurePct,
      worstGapPct: report.worstGapPct,
      finalEquity: report.finalEquity,
    });
  }

  const topReturn = [...rows]
    .filter((row) => row.tradeCount >= 20)
    .sort((left, right) => right.totalReturnPct - left.totalReturnPct)
    .slice(0, 10);
  const topSharpe = [...rows]
    .filter((row) => row.tradeCount >= 20)
    .sort((left, right) => right.sharpe - left.sharpe)
    .slice(0, 10);

  let reportPath: string | null = null;
  try {
    const reportDir = path.join(process.cwd(), "data", "backtests");
    await mkdir(reportDir, { recursive: true });
    reportPath = path.join(
      reportDir,
      `bsjp-sweep-${now.toISOString().replace(/[:.]/g, "-")}.json`
    );
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          generatedAt: now.toISOString(),
          years: options.years ?? 5,
          universeSize: loaded.universe.length,
          syariahOnly: loaded.syariahOnly,
          comboCount: combos.length,
          topReturn,
          topSharpe,
          rows,
          failed: loaded.failed,
        },
        null,
        2
      ),
      "utf8"
    );
  } catch {
    loaded.limitations.push("Laporan sweep gagal disimpan ke disk.");
  }

  return {
    comboCount: combos.length,
    universeSize: loaded.universe.length,
    syariahOnly: loaded.syariahOnly,
    rows,
    topReturn,
    topSharpe,
    reportPath,
    fetched: loaded.fetched,
    cached: loaded.cached,
    failed: loaded.failed,
    limitations: loaded.limitations,
  };
}

export function summarizeBacktest(report: BsjpBacktestReport) {
  const sorted = [...report.trades].sort((left, right) => right.pnl - left.pnl);
  return {
    start: report.start,
    end: report.end,
    initialEquity: report.initialEquity,
    finalEquity: report.finalEquity,
    totalReturnPct: report.totalReturnPct,
    cagrPct: report.cagrPct,
    maxDrawdownPct: report.maxDrawdownPct,
    sharpe: report.sharpe,
    tradeCount: report.tradeCount,
    winRatePct: report.winRatePct,
    avgGrossPct: report.avgGrossPct,
    avgNetPct: report.avgNetPct,
    profitFactor: report.profitFactor,
    exposurePct: report.exposurePct,
    worstGapPct: report.worstGapPct,
    byYear: report.byYear,
    limitations: report.limitations,
    bestTrades: sorted.slice(0, 5),
    worstTrades: sorted.slice(-5).reverse(),
  };
}
