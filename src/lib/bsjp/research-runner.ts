import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DailyTransaction } from "@/lib/sectors/types";
import { ema } from "@/lib/bsjp/evaluate";
import {
  buildFeatures,
  researchMatrix,
  type ResearchExit,
  type ResearchReport,
  type ResearchRow,
  type ResearchSignal,
} from "@/lib/bsjp/research";
import type { BsjpCosts } from "@/lib/bsjp/backtest";
import { loadBsjpBacktestData } from "@/lib/bsjp/backtest-runner";

export type CostModel = "retail" | "low" | "zero";

export interface HoldResearchRow extends ResearchRow {
  costModel: CostModel;
}

export interface HoldResearchResult {
  reportPath: string | null;
  rows: HoldResearchRow[];
  topReturn: HoldResearchRow[];
  topSharpe: HoldResearchRow[];
  universeSize: number;
  syariahOnly: boolean;
  fetched: number;
  cached: number;
  failed: string[];
  limitations: string[];
  costModels: Record<CostModel, BsjpCosts>;
}

export interface ResearchRunResult {
  reportPath: string | null;
  rows: ResearchRow[];
  reports: ResearchReport[];
  topReturn: ResearchRow[];
  topSharpe: ResearchRow[];
  randomBaseline: ResearchReport[];
  universeSize: number;
  syariahOnly: boolean;
  fetched: number;
  cached: number;
  failed: string[];
  limitations: string[];
}

function emaSeries(values: number[], period: number): Array<number | null> {
  const result: Array<number | null> = new Array(values.length).fill(null);
  if (values.length < period) return result;
  const multiplier = 2 / (period + 1);
  let current =
    values.slice(0, period).reduce((total, value) => total + value, 0) / period;
  result[period - 1] = current;
  for (let index = period; index < values.length; index += 1) {
    current = values[index] * multiplier + current * (1 - multiplier);
    result[index] = current;
  }
  return result;
}

function regimeMap(index: DailyTransaction[]): Map<string, boolean> {
  const sorted = [...index]
    .filter((candle) => candle.close > 0)
    .sort((left, right) => left.date.localeCompare(right.date));
  const ema20 = emaSeries(
    sorted.map((candle) => candle.close),
    20
  );
  const map = new Map<string, boolean>();
  sorted.forEach((candle, index) => {
    const value = ema20[index];
    if (value !== null) map.set(candle.date, candle.close > value);
  });
  return map;
}

function summarize(report: ResearchReport): ResearchRow {
  const { trades: _trades, ...row } = report;
  return row;
}

function researchDataset(loaded: Awaited<ReturnType<typeof loadBsjpBacktestData>>) {
  const features = Object.entries(loaded.data).flatMap(([symbol, candles]) =>
    buildFeatures(symbol, candles)
  );
  const regime = regimeMap(loaded.index);
  const dates = (loaded.index.length > 0
    ? loaded.index.map((candle) => candle.date)
    : [...new Set(features.map((feature) => feature.date))]
  )
    .filter((date) => date >= loaded.startDate && date <= loaded.endDate)
    .sort((left, right) => left.localeCompare(right));
  return { features, regime, dates };
}

export async function runHoldResearchFromYahoo(
  options: { years?: number; syariahOnly?: boolean; forceRefresh?: boolean } = {}
): Promise<HoldResearchResult> {
  const loaded = await loadBsjpBacktestData(options);
  const { features, regime, dates } = researchDataset(loaded);
  const costModels: Record<CostModel, BsjpCosts> = {
    retail: { buyFeePct: 0.15, sellFeePct: 0.25, slippagePct: 0.15 },
    low: { buyFeePct: 0.1, sellFeePct: 0.1, slippagePct: 0.05 },
    zero: { buyFeePct: 0, sellFeePct: 0, slippagePct: 0 },
  };
  const exits: ResearchExit[] = [
    "next_open",
    "next_close",
    "hold_2d",
    "hold_3d",
  ];
  const rows: HoldResearchRow[] = [];

  for (const [costModel, costs] of Object.entries(costModels) as Array<
    [CostModel, BsjpCosts]
  >) {
    const reports = researchMatrix(features, dates, regime, {
      costs,
      signals: ["reversal" as ResearchSignal],
      exits,
    });
    for (const report of reports) {
      const { trades: _trades, ...row } = report;
      rows.push({ ...row, costModel });
    }
  }

  const eligible = rows.filter((row) => row.tradeCount >= 20);
  const topReturn = [...eligible]
    .sort((left, right) => right.totalReturnPct - left.totalReturnPct)
    .slice(0, 10);
  const topSharpe = [...eligible]
    .sort((left, right) => right.sharpe - left.sharpe)
    .slice(0, 10);

  let reportPath: string | null = null;
  try {
    const dir = path.join(process.cwd(), "data", "backtests");
    await mkdir(dir, { recursive: true });
    reportPath = path.join(
      dir,
      `bsjp-hold-research-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    );
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          years: options.years ?? 5,
          universeSize: loaded.universe.length,
          syariahOnly: loaded.syariahOnly,
          rows,
          failed: loaded.failed,
        },
        null,
        2
      ),
      "utf8"
    );
  } catch {
    loaded.limitations.push("Laporan hold research gagal disimpan ke disk.");
  }

  return {
    reportPath,
    rows,
    topReturn,
    topSharpe,
    universeSize: loaded.universe.length,
    syariahOnly: loaded.syariahOnly,
    fetched: loaded.fetched,
    cached: loaded.cached,
    failed: loaded.failed,
    limitations: loaded.limitations,
    costModels,
  };
}

export async function runResearchFromYahoo(
  options: { years?: number; syariahOnly?: boolean; forceRefresh?: boolean } = {}
): Promise<ResearchRunResult> {
  const loaded = await loadBsjpBacktestData(options);
  const features = Object.entries(loaded.data).flatMap(([symbol, candles]) =>
    buildFeatures(symbol, candles)
  );
  const regime = regimeMap(loaded.index);
  const dates = (loaded.index.length > 0
    ? loaded.index.map((candle) => candle.date)
    : [...new Set(features.map((feature) => feature.date))]
  )
    .filter((date) => date >= loaded.startDate && date <= loaded.endDate)
    .sort((left, right) => left.localeCompare(right));

  const reports = researchMatrix(features, dates, regime);
  const rows = reports.map(summarize);
  const eligible = rows.filter((row) => row.tradeCount >= 20);
  const topReturn = [...eligible]
    .sort((left, right) => right.totalReturnPct - left.totalReturnPct)
    .slice(0, 8);
  const topSharpe = [...eligible]
    .sort((left, right) => right.sharpe - left.sharpe)
    .slice(0, 8);
  const randomBaseline = reports.filter((report) => report.signal === "random");

  let reportPath: string | null = null;
  try {
    const dir = path.join(process.cwd(), "data", "backtests");
    await mkdir(dir, { recursive: true });
    reportPath = path.join(
      dir,
      `bsjp-research-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    );
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          years: options.years ?? 5,
          universeSize: loaded.universe.length,
          syariahOnly: loaded.syariahOnly,
          rows,
          randomBaseline,
          failed: loaded.failed,
        },
        null,
        2
      ),
      "utf8"
    );
  } catch {
    loaded.limitations.push("Laporan research gagal disimpan ke disk.");
  }

  return {
    reportPath,
    rows,
    reports,
    topReturn,
    topSharpe,
    randomBaseline,
    universeSize: loaded.universe.length,
    syariahOnly: loaded.syariahOnly,
    fetched: loaded.fetched,
    cached: loaded.cached,
    failed: loaded.failed,
    limitations: loaded.limitations,
  };
}
