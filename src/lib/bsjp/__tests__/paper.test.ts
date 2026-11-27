import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  closePaperPositions,
  formatPaperEntry,
  formatPaperExit,
  loadPaperPositions,
  recordPaperEntries,
} from "../paper";
import type { BsjpCandidate } from "../evaluate";
import type { StockbitQuote } from "@/lib/market/scraper-client";
import { runPaperEntry, runPaperExit } from "../paper-runner";
import { formatPaperReport, summarizePaper } from "../paper-report";

const folders: string[] = [];

async function tempFile(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), "telaah-paper-"));
  folders.push(folder);
  return path.join(folder, "paper.json");
}

afterEach(async () => {
  await Promise.all(
    folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true }))
  );
});

const candidate: BsjpCandidate = {
  symbol: "BRIS",
  date: "2026-11-27",
  last: 1165,
  changePct: 2.1,
  closeStrength: 0.85,
  volumeRatio: 2.2,
  rsi: 61,
  ema20: 1120,
  ema50: 1080,
  value: 10_000_000_000,
  foreignNet: 1_000_000_000,
  score: 82,
  reasons: ["close strength 85%"],
};

function quote(symbol: string, last: number): StockbitQuote {
  return {
    symbol,
    last,
    open: last,
    high: last,
    low: last,
    previousClose: last,
    change: 0,
    changePct: 0,
    volume: 1_000_000,
    value: 1_000_000_000,
    frequency: null,
    foreignBuy: null,
    foreignSell: null,
    foreignNet: null,
    foreignCurrent: false,
    bid: null,
    offer: null,
    ara: null,
    arb: null,
    source: "test",
  };
}

describe("BSJP paper journal", () => {
  it("records one entry per symbol and date", async () => {
    const file = await tempFile();
    const now = new Date("2026-11-27T08:50:00Z");
    await recordPaperEntries([candidate, candidate], now, file);
    const data = await loadPaperPositions(file);
    expect(data.positions).toHaveLength(1);
    expect(data.positions[0].entryPrice).toBe(1165);
    expect(data.positions[0].status).toBe("open");
  });

  it("closes open entries at the next snapshot", async () => {
    const file = await tempFile();
    await recordPaperEntries(
      [candidate],
      new Date("2026-11-27T08:50:00Z"),
      file
    );
    const result = await closePaperPositions(
      [quote("BRIS", 1180)],
      new Date("2026-11-30T02:00:00Z"),
      file
    );
    expect(result.closed).toHaveLength(1);
    expect(result.closed[0].exitPrice).toBe(1180);
    expect(result.closed[0].status).toBe("closed");
    expect(result.closed[0].grossPct).toBeCloseTo(1.287, 2);
    expect(result.closed[0].netPct).toBeLessThan(1.287);
  });

  it("runs the entry and exit flow with injected market data", async () => {
    const file = await tempFile();
    const sent: string[] = [];
    const scan = async () => ({
      generatedAt: "2026-11-27T08:50:00.000Z",
      universeSize: 26,
      scanned: 6,
      marketRegime: "bullish" as const,
      candidates: [candidate],
      errors: 0,
      limitations: [],
    });
    const entry = await runPaperEntry({
      now: new Date("2026-11-27T08:50:00Z"),
      scan,
      send: async (_chatId, text) => {
        sent.push(text);
      },
      chatId: 42,
      filePath: file,
    });
    expect(entry.added).toHaveLength(1);
    expect(entry.sent).toBe(1);

    const exit = await runPaperExit({
      now: new Date("2026-11-30T02:00:00Z"),
      getQuote: async (symbol) => ({ symbol, last: 1180 }),
      send: async (_chatId, text) => {
        sent.push(text);
      },
      chatId: 42,
      filePath: file,
    });
    expect(exit.closed).toHaveLength(1);
    expect(exit.sent).toBe(1);
    expect(sent.join(" ")).toContain("Paper exit");
  });

  it("summarizes paper results and slippage", async () => {
    const file = await tempFile();
    await recordPaperEntries(
      [candidate],
      new Date("2026-11-27T08:50:00Z"),
      file
    );
    await closePaperPositions(
      [quote("BRIS", 1180)],
      new Date("2026-11-30T02:00:00Z"),
      file
    );
    const store = await loadPaperPositions(file);
    const report = summarizePaper(store.positions);
    expect(report.closed).toBe(1);
    expect(report.winRatePct).toBe(100);
    expect(report.avgEntrySlippagePct).toBeCloseTo(-1.27, 2);
    expect(formatPaperReport(report)).toContain("BSJP paper report");
  });

  it("formats entry and exit journal messages", () => {
    const entry = formatPaperEntry({
      id: "2026-11-27:BRIS",
      entryDate: "2026-11-27",
      symbol: "BRIS",
      score: 82,
      entryPrice: 1165,
      entryAt: "2026-11-27T08:50:00.000Z",
      status: "open",
    });
    expect(entry).toContain("Paper entry");
    expect(entry).toContain("BRIS");
    expect(entry).toContain("1.165");

    const exit = formatPaperExit({
      id: "2026-11-27:BRIS",
      entryDate: "2026-11-27",
      symbol: "BRIS",
      score: 82,
      entryPrice: 1165,
      entryAt: "2026-11-27T08:50:00.000Z",
      exitPrice: 1180,
      exitDate: "2026-11-30",
      exitAt: "2026-11-30T02:00:00.000Z",
      grossPct: 1.287,
      netPct: 0.887,
      status: "closed",
    });
    expect(exit).toContain("Paper exit");
    expect(exit).toContain("+1.29%");
  });
});
