import crypto from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HarmonicDirection, HarmonicPattern, HarmonicStatus, HarmonicTimeframe } from "@/lib/quant/harmonic";
import type { HarmonicScanResult } from "@/lib/screener/harmonic-screener";
import type { DailyTransaction } from "@/lib/sectors/types";

const CANDIDATES_FILE = path.join(
  process.cwd(),
  "data",
  "harmonic_candidates.json"
);
const EVALUATIONS_FILE = path.join(
  process.cwd(),
  "data",
  "harmonic_evaluations.json"
);
const MAX_CANDIDATES = 5000;
const MAX_BARS = 60;

async function readJsonFile<T>(file: string): Promise<T[]> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function writeJsonFile<T>(file: string, value: T[]): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value), "utf8");
  await rename(temporary, file);
}

export interface HarmonicCandidateLog {
  id: string;
  scanDate: string;
  scannedAt: string;
  symbol: string;
  pattern: HarmonicPattern;
  timeframe: HarmonicTimeframe;
  direction: HarmonicDirection;
  status: HarmonicStatus;
  score: number;
  price: number;
  prz: { low: number; high: number };
  invalidation: number;
  targets: { t1: number; t2: number };
  dDate: string;
  distancePct: number;
}

export interface HarmonicEvaluation {
  id: string;
  status: "t1" | "t2" | "invalidated" | "timeout";
  daysToT1: number | null;
  daysToT2: number | null;
  entryDate: string;
  entryPrice: number;
  evaluatedAt: string;
}

export interface CalibrationGroup {
  pattern: HarmonicPattern;
  timeframe: HarmonicTimeframe;
  direction: HarmonicDirection;
  status: HarmonicStatus;
  total: number;
  t1Hits: number;
  t2Hits: number;
  invalidated: number;
  timeout: number;
  t1RatePct: number;
  t2RatePct: number;
  invalidatedRatePct: number;
  avgDaysToT1: number | null;
  suggestedWeightDelta: number;
  confidence: "low" | "medium" | "high";
}

export interface CalibrationResult {
  totalCandidates: number;
  evaluated: number;
  pending: number;
  groups: CalibrationGroup[];
  generatedAt: string;
}

function jakartaDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function candidateId(
  scanDate: string,
  symbol: string,
  timeframe: HarmonicTimeframe,
  pattern: HarmonicPattern,
  direction: HarmonicDirection,
  status: HarmonicStatus,
  dDate: string
): string {
  return crypto
    .createHash("sha1")
    .update(
      `${scanDate}|${symbol}|${timeframe}|${pattern}|${direction}|${status}|${dDate}`
    )
    .digest("hex")
    .slice(0, 20);
}

export function candidateLogsFromScan(
  result: HarmonicScanResult
): HarmonicCandidateLog[] {
  const scannedAt = result.generatedAt;
  const scanDate = jakartaDate(new Date(scannedAt));
  const logs: HarmonicCandidateLog[] = [];
  for (const candidate of result.results) {
    for (const match of candidate.matches) {
      logs.push({
        id: candidateId(
          scanDate,
          candidate.symbol,
          match.timeframe,
          match.pattern,
          match.direction,
          match.status,
          match.pivotDates.d
        ),
        scanDate,
        scannedAt,
        symbol: candidate.symbol,
        pattern: match.pattern,
        timeframe: match.timeframe,
        direction: match.direction,
        status: match.status,
        score: match.score,
        price: match.price,
        prz: match.prz,
        invalidation: match.invalidation,
        targets: match.targets,
        dDate: match.pivotDates.d,
        distancePct: match.distancePct,
      });
    }
  }
  return logs;
}

export async function recordHarmonicScan(
  result: HarmonicScanResult
): Promise<number> {
  const logs = candidateLogsFromScan(result);
  const existing = await readJsonFile<HarmonicCandidateLog>(CANDIDATES_FILE);
  const byId = new Map(existing.map((item) => [item.id, item]));
  let recorded = 0;
  for (const log of logs) {
    if (byId.has(log.id)) continue;
    byId.set(log.id, log);
    recorded += 1;
  }
  if (recorded === 0) return 0;
  const next = [...byId.values()]
    .sort(
      (left, right) =>
        Date.parse(right.scannedAt) - Date.parse(left.scannedAt)
    )
    .slice(0, MAX_CANDIDATES);
  await writeJsonFile(CANDIDATES_FILE, next);
  return recorded;
}

export async function loadCandidates(options: {
  minAgeDays?: number;
  maxAgeDays?: number;
  limit?: number;
} = {}): Promise<HarmonicCandidateLog[]> {
  const all = await readJsonFile<HarmonicCandidateLog>(CANDIDATES_FILE);
  const now = Date.now();
  const maxAge = now - (options.maxAgeDays ?? 120) * 86_400_000;
  const minAge = now - (options.minAgeDays ?? 10) * 86_400_000;
  return all
    .filter((item) => {
      const time = Date.parse(item.scannedAt);
      return Number.isFinite(time) && time >= maxAge && time <= minAge;
    })
    .sort(
      (left, right) =>
        Date.parse(right.scannedAt) - Date.parse(left.scannedAt)
    )
    .slice(0, options.limit ?? 200);
}

export async function loadEvaluations(): Promise<HarmonicEvaluation[]> {
  return readJsonFile<HarmonicEvaluation>(EVALUATIONS_FILE);
}

async function saveEvaluations(
  evaluations: HarmonicEvaluation[]
): Promise<void> {
  if (evaluations.length === 0) return;
  const existing = await loadEvaluations();
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const evaluation of evaluations) {
    byId.set(evaluation.id, evaluation);
  }
  await writeJsonFile(EVALUATIONS_FILE, [...byId.values()]);
}

export function evaluateCandidateOutcome(
  candidate: HarmonicCandidateLog,
  candles: DailyTransaction[],
  maxBars = MAX_BARS
): HarmonicEvaluation {
  const entryIndex = candles.findIndex(
    (candle) => candle.date >= candidate.dDate
  );
  if (entryIndex < 0 || entryIndex >= candles.length) {
    return {
      id: candidate.id,
      status: "timeout",
      daysToT1: null,
      daysToT2: null,
      entryDate: candidate.dDate,
      entryPrice: candidate.price,
      evaluatedAt: new Date().toISOString(),
    };
  }
  const entry = candles[entryIndex];
  const bullish = candidate.direction === "bullish";
  let t1 = false;
  let t2 = false;
  let invalidated = false;
  let daysToT1: number | null = null;
  let daysToT2: number | null = null;

  for (
    let index = entryIndex + 1;
    index < Math.min(candles.length, entryIndex + 1 + maxBars);
    index += 1
  ) {
    const candle = candles[index];
    const days = index - entryIndex;
    if (bullish) {
      if (!t1 && candle.low <= candidate.invalidation) {
        invalidated = true;
        break;
      }
      if (!t1 && candle.high >= candidate.targets.t1) {
        t1 = true;
        daysToT1 = days;
      }
      if (candle.high >= candidate.targets.t2) {
        t2 = true;
        daysToT2 = days;
        break;
      }
      if (t1 && candle.low <= candidate.invalidation) break;
    } else {
      if (!t1 && candle.high >= candidate.invalidation) {
        invalidated = true;
        break;
      }
      if (!t1 && candle.low <= candidate.targets.t1) {
        t1 = true;
        daysToT1 = days;
      }
      if (candle.low <= candidate.targets.t2) {
        t2 = true;
        daysToT2 = days;
        break;
      }
      if (t1 && candle.high >= candidate.invalidation) break;
    }
  }

  return {
    id: candidate.id,
    status: t2 ? "t2" : t1 ? "t1" : invalidated ? "invalidated" : "timeout",
    daysToT1,
    daysToT2,
    entryDate: entry.date,
    entryPrice: entry.close,
    evaluatedAt: new Date().toISOString(),
  };
}

export function aggregateCalibration(
  candidates: HarmonicCandidateLog[],
  evaluations: HarmonicEvaluation[]
): CalibrationResult {
  const byId = new Map(evaluations.map((item) => [item.id, item]));
  const groups = new Map<string, CalibrationGroup>();
  const daysByGroup = new Map<string, number[]>();

  for (const candidate of candidates) {
    const evaluation = byId.get(candidate.id);
    if (!evaluation) continue;
    const key = [
      candidate.pattern,
      candidate.timeframe,
      candidate.direction,
      candidate.status,
    ].join("|");
    const group =
      groups.get(key) ??
      {
        pattern: candidate.pattern,
        timeframe: candidate.timeframe,
        direction: candidate.direction,
        status: candidate.status,
        total: 0,
        t1Hits: 0,
        t2Hits: 0,
        invalidated: 0,
        timeout: 0,
        t1RatePct: 0,
        t2RatePct: 0,
        invalidatedRatePct: 0,
        avgDaysToT1: null,
        suggestedWeightDelta: 0,
        confidence: "low" as const,
      };
    group.total += 1;
    if (evaluation.status === "t1" || evaluation.status === "t2") {
      group.t1Hits += 1;
    }
    if (evaluation.status === "t2") group.t2Hits += 1;
    if (evaluation.status === "invalidated") group.invalidated += 1;
    if (evaluation.status === "timeout") group.timeout += 1;
    groups.set(key, group);
    if (evaluation.daysToT1 !== null) {
      const days = daysByGroup.get(key) ?? [];
      days.push(evaluation.daysToT1);
      daysByGroup.set(key, days);
    }
  }

  const rows = [...groups.entries()].map(([key, group]) => {
    const days = daysByGroup.get(key) ?? [];
    const t1RatePct = group.total
      ? (group.t1Hits / group.total) * 100
      : 0;
    const confidence: CalibrationGroup["confidence"] =
      group.total >= 50 ? "high" : group.total >= 20 ? "medium" : "low";
    const suggestedWeightDelta =
      group.total >= 20 && group.status === "completed"
        ? Math.max(-2, Math.min(2, Number(((t1RatePct - 50) / 10).toFixed(1))))
        : 0;
    return {
      ...group,
      t1RatePct,
      t2RatePct: group.total ? (group.t2Hits / group.total) * 100 : 0,
      invalidatedRatePct: group.total
        ? (group.invalidated / group.total) * 100
        : 0,
      avgDaysToT1: days.length
        ? days.reduce((sum, value) => sum + value, 0) / days.length
        : null,
      suggestedWeightDelta,
      confidence,
    };
  });

  const evaluated = evaluations.length;
  return {
    totalCandidates: candidates.length,
    evaluated,
    pending: Math.max(0, candidates.length - evaluated),
    groups: rows.sort(
      (left, right) =>
        right.total - left.total ||
        left.pattern.localeCompare(right.pattern) ||
        left.timeframe.localeCompare(right.timeframe)
    ),
    generatedAt: new Date().toISOString(),
  };
}

export async function evaluateLoggedCandidates(options: {
  minAgeDays?: number;
  limit?: number;
} = {}): Promise<{
  scanned: number;
  evaluated: number;
  failed: number;
}> {
  const candidates = await loadCandidates({
    minAgeDays: options.minAgeDays ?? 10,
    limit: options.limit ?? 200,
  });
  if (candidates.length === 0) {
    return { scanned: 0, evaluated: 0, failed: 0 };
  }
  const existing = await loadEvaluations();
  const existingIds = new Set(existing.map((item) => item.id));
  const pending = candidates.filter((item) => !existingIds.has(item.id));
  const bySymbol = new Map<string, HarmonicCandidateLog[]>();
  for (const candidate of pending) {
    const list = bySymbol.get(candidate.symbol) ?? [];
    list.push(candidate);
    bySymbol.set(candidate.symbol, list);
  }

  const { YahooClient } = await import("@/lib/market/yahoo");
  const yahoo = new YahooClient();
  const evaluations: HarmonicEvaluation[] = [];
  let failed = 0;
  for (const [symbol, items] of bySymbol) {
    const start = items
      .map((item) => item.dDate)
      .sort()
      .at(0);
    try {
      const rows = await yahoo.getDailyTransactions(symbol, start);
      for (const candidate of items) {
        evaluations.push(evaluateCandidateOutcome(candidate, rows));
      }
    } catch {
      failed += items.length;
    }
  }
  await saveEvaluations(evaluations);
  return {
    scanned: candidates.length,
    evaluated: evaluations.length,
    failed,
  };
}
