import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BsjpCandidate } from "@/lib/bsjp/evaluate";
import type { StockbitQuote } from "@/lib/market/scraper-client";
import { DEFAULT_BSJP_COSTS } from "@/lib/bsjp/backtest";

export interface PaperPosition {
  id: string;
  entryDate: string;
  symbol: string;
  score: number;
  entryPrice: number;
  entryAt: string;
  entryChangePct?: number;
  entryCloseStrength?: number;
  entryVolumeRatio?: number;
  entryValue?: number;
  entryClose?: number;
  exitPrice?: number;
  exitOpen?: number;
  exitDate?: string;
  exitAt?: string;
  grossPct?: number;
  netPct?: number;
  entrySlippagePct?: number;
  exitSlippagePct?: number;
  status: "open" | "closed";
}

export interface PaperStore {
  positions: PaperPosition[];
  updatedAt: string;
}

export function paperPath(): string {
  return (
    process.env.BSJP_PAPER_FILE ||
    path.join(process.cwd(), "data", "bsjp_paper.json")
  );
}

function jakartaDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function emptyStore(): PaperStore {
  return { positions: [], updatedAt: new Date().toISOString() };
}

async function saveStore(
  data: PaperStore,
  filePath = paperPath()
): Promise<PaperStore> {
  const next = { ...data, updatedAt: new Date().toISOString() };
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, filePath);
  return next;
}

export async function loadPaperPositions(
  filePath = paperPath()
): Promise<PaperStore> {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as PaperStore;
    if (!Array.isArray(parsed.positions)) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

export async function recordPaperEntries(
  candidates: BsjpCandidate[],
  now = new Date(),
  filePath = paperPath()
): Promise<{ added: PaperPosition[]; skipped: number }> {
  const store = await loadPaperPositions(filePath);
  const day = jakartaDate(now);
  const existing = new Set(
    store.positions
      .filter((position) => position.entryDate === day)
      .map((position) => position.symbol)
  );
  const added: PaperPosition[] = [];

  for (const candidate of candidates) {
    if (existing.has(candidate.symbol)) continue;
    existing.add(candidate.symbol);
    added.push({
      id: `${day}:${candidate.symbol}`,
      entryDate: day,
      symbol: candidate.symbol,
      score: candidate.score,
      entryPrice: candidate.last,
      entryAt: now.toISOString(),
      entryChangePct: candidate.changePct,
      entryCloseStrength: candidate.closeStrength,
      entryVolumeRatio: candidate.volumeRatio,
      entryValue: candidate.value,
      status: "open",
    });
  }

  if (added.length > 0) {
    store.positions.push(...added);
    await saveStore(store, filePath);
  }
  return { added, skipped: candidates.length - added.length };
}

export async function closePaperPositions(
  quotes: Array<
    Pick<StockbitQuote, "symbol" | "last"> &
      Partial<Pick<StockbitQuote, "previousClose" | "open">>
  >,
  now = new Date(),
  filePath = paperPath()
): Promise<{ closed: PaperPosition[]; remaining: PaperPosition[] }> {
  const store = await loadPaperPositions(filePath);
  const prices = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const today = jakartaDate(now);
  const closed: PaperPosition[] = [];

  for (const position of store.positions) {
    if (position.status !== "open" || position.entryDate >= today) continue;
    const quote = prices.get(position.symbol);
    const exitPrice = quote?.last;
    if (!exitPrice || !Number.isFinite(exitPrice) || exitPrice <= 0) continue;

    position.status = "closed";
    position.exitPrice = exitPrice;
    position.exitDate = today;
    position.exitAt = now.toISOString();
    if (quote?.previousClose && quote.previousClose > 0) {
      position.entryClose = quote.previousClose;
      position.entrySlippagePct =
        ((position.entryPrice - quote.previousClose) / quote.previousClose) *
        100;
    }
    if (quote?.open && quote.open > 0) {
      position.exitOpen = quote.open;
      position.exitSlippagePct =
        ((exitPrice - quote.open) / quote.open) * 100;
    }
    position.grossPct =
      ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
    const netBuy = position.entryPrice * (1 + DEFAULT_BSJP_COSTS.buyFeePct / 100);
    const netSell = exitPrice * (1 - DEFAULT_BSJP_COSTS.sellFeePct / 100);
    position.netPct = ((netSell - netBuy) / netBuy) * 100;
    closed.push(position);
  }

  if (closed.length > 0) await saveStore(store, filePath);
  return {
    closed,
    remaining: store.positions.filter((position) => position.status === "open"),
  };
}

function formatPrice(value: number): string {
  return value.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

export function formatPaperEntry(position: PaperPosition): string {
  return [
    `📝 <b>Paper entry BSJP</b> · ${position.entryDate}`,
    `<b>${position.symbol}</b> @ Rp ${formatPrice(position.entryPrice)} · score ${position.score}`,
    "Paper only, bukan order sungguhan.",
  ].join("\n");
}

export function formatPaperExit(position: PaperPosition): string {
  const gross = position.grossPct ?? 0;
  const net = position.netPct ?? 0;
  const sign = gross >= 0 ? "+" : "";
  return [
    `📕 <b>Paper exit BSJP</b> · ${position.exitDate}`,
    `<b>${position.symbol}</b> ${formatPrice(position.entryPrice)} → ${formatPrice(
      position.exitPrice ?? 0
    )}`,
    `Gross ${sign}${gross.toFixed(2)}% · net ${net >= 0 ? "+" : ""}${net.toFixed(2)}%`,
    "Paper only, bukan rekomendasi.",
  ].join("\n");
}
