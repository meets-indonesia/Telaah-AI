import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export interface AlertRules {
  priceMovePct: number;
  volumeSpikeMultiplier: number;
  foreignFlowIdr: number;
  breakoutLookback: number;
}

export interface AlertWatchlistData {
  symbols: string[];
  rules: AlertRules;
  updatedAt: string;
}

export const DEFAULT_ALERT_RULES: AlertRules = {
  priceMovePct: 5,
  volumeSpikeMultiplier: 2,
  foreignFlowIdr: 50_000_000_000,
  breakoutLookback: 20,
};

const MAX_SYMBOLS = 50;
const SYMBOL_PATTERN = /^[A-Z]{4}$/;

export function alertWatchlistPath(): string {
  return (
    process.env.ALERT_WATCHLIST_FILE ||
    path.join(process.cwd(), "data", "alert_watchlist.json")
  );
}

export function cleanSymbol(value: unknown): string {
  const symbol = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(".JK", "");
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new Error("Kode emiten harus 4 huruf, misalnya BBCA.");
  }
  return symbol;
}

function cleanRules(input: Partial<AlertRules> | undefined): AlertRules {
  const merged = { ...DEFAULT_ALERT_RULES, ...(input ?? {}) };
  if (!Number.isFinite(merged.priceMovePct) || merged.priceMovePct <= 0 || merged.priceMovePct > 50) {
    throw new Error("priceMovePct harus antara 0 dan 50.");
  }
  if (
    !Number.isFinite(merged.volumeSpikeMultiplier) ||
    merged.volumeSpikeMultiplier < 1.1 ||
    merged.volumeSpikeMultiplier > 20
  ) {
    throw new Error("volumeSpikeMultiplier harus antara 1.1 dan 20.");
  }
  if (!Number.isFinite(merged.foreignFlowIdr) || merged.foreignFlowIdr <= 0) {
    throw new Error("foreignFlowIdr harus lebih dari 0.");
  }
  if (
    !Number.isInteger(merged.breakoutLookback) ||
    merged.breakoutLookback < 5 ||
    merged.breakoutLookback > 120
  ) {
    throw new Error("breakoutLookback harus antara 5 dan 120.");
  }
  return merged;
}

function emptyWatchlist(): AlertWatchlistData {
  return {
    symbols: [],
    rules: { ...DEFAULT_ALERT_RULES },
    updatedAt: new Date().toISOString(),
  };
}

function parseWatchlist(raw: string): AlertWatchlistData {
  const parsed = JSON.parse(raw) as Partial<AlertWatchlistData>;
  const symbols = Array.isArray(parsed.symbols)
    ? [...new Set(parsed.symbols.map((value) => cleanSymbol(value)))].slice(
        0,
        MAX_SYMBOLS
      )
    : [];
  return {
    symbols,
    rules: cleanRules(parsed.rules),
    updatedAt:
      typeof parsed.updatedAt === "string"
        ? parsed.updatedAt
        : new Date().toISOString(),
  };
}

export async function loadAlertWatchlist(
  filePath = alertWatchlistPath()
): Promise<AlertWatchlistData> {
  try {
    return parseWatchlist(await readFile(filePath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyWatchlist();
    }
    return emptyWatchlist();
  }
}

export async function saveAlertWatchlist(
  data: AlertWatchlistData,
  filePath = alertWatchlistPath()
): Promise<AlertWatchlistData> {
  const symbols = [
    ...new Set((data.symbols ?? []).map((value) => cleanSymbol(value))),
  ].slice(0, MAX_SYMBOLS);
  const next: AlertWatchlistData = {
    symbols,
    rules: cleanRules(data.rules),
    updatedAt: new Date().toISOString(),
  };

  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, filePath);
  return next;
}

export async function addAlertSymbol(
  value: string,
  filePath = alertWatchlistPath()
): Promise<string[]> {
  const symbol = cleanSymbol(value);
  const data = await loadAlertWatchlist(filePath);
  if (!data.symbols.includes(symbol)) data.symbols.push(symbol);
  return (await saveAlertWatchlist(data, filePath)).symbols;
}

export async function removeAlertSymbol(
  value: string,
  filePath = alertWatchlistPath()
): Promise<string[]> {
  const symbol = cleanSymbol(value);
  const data = await loadAlertWatchlist(filePath);
  data.symbols = data.symbols.filter((item) => item !== symbol);
  return (await saveAlertWatchlist(data, filePath)).symbols;
}
